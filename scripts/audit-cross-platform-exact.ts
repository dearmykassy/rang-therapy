import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(process.env.RANG_AUDIT_ROOT ?? SCRIPT_ROOT);
const RANG_CORPUS_PATH = resolve(ROOT, "artifacts/content-corpus.json");
const RECEIPT_PATH = resolve(ROOT, "qa/content/cross-platform-exact-audit.v1.json");
const SNAPSHOT_DIRECTORY = resolve(ROOT, "qa/content/external-snapshots");
const SNAPSHOT_MANIFEST_PATH = resolve(SNAPSHOT_DIRECTORY, "manifest.v1.json");
const LIVE_DRIFT_PATH = resolve(ROOT, "qa/content/cross-platform-live-drift.v1.json");

type UnknownRecord = Record<string, unknown>;
type CorpusBundle = {
  path: string;
  buffer: Buffer;
  corpus: UnknownRecord;
  externalVisibleContract?: {
    path: string;
    buffer: Buffer;
    contract: UnknownRecord;
  };
};
type SnapshotFile = {
  path: string;
  encoding: "gzip";
  sourceSha256: string;
  bundleSha256: string;
};
type SnapshotPlatform = {
  platformId: string;
  corpus: SnapshotFile;
  visibleContract?: SnapshotFile;
  liveProbePath: string;
  liveVisibleContractProbePath?: string;
  independentGo: {
    status: "PENDING" | "GO";
    exactCorpusSha256: string | null;
    evidenceSha256: string | null;
  };
};
type SnapshotManifest = {
  schemaVersion: "rang-external-corpus-snapshot-manifest/v1";
  snapshotVersion: string;
  status: "PENDING_INDEPENDENT_GO" | "COMPLETE_INDEPENDENT_GO";
  refreshPolicy: "EXPLICIT_ONLY";
  platforms: SnapshotPlatform[];
};

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFC").trim() : "";
}

function strings(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = text(value);
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) return value.flatMap(strings);
  return [];
}

function completeSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[.!?]$/u.test(sentence));
}

function accessibilityValue(value: string): string {
  return value.replace(/^(?:aria-label|aria-description|alt|title):/u, "").trim();
}

function metadataForDocument(document: UnknownRecord): string[] {
  const fields = asRecord(document.fields ?? document);
  return [
    ...strings(fields.title),
    ...strings(fields.description),
    ...strings(fields.h1),
    ...strings(fields.keywords),
  ];
}

function declaredBodyForDocument(document: UnknownRecord): string[] {
  const fields = asRecord(document.fields ?? document);
  const sections = Array.isArray(fields.sections) ? fields.sections.map(asRecord) : [];
  const renderedSurface = Array.isArray(fields.renderedSurface)
    ? fields.renderedSurface.map(asRecord)
    : [];
  const renderedBody = asRecord(fields.renderedBody);
  return [
    ...strings(fields.eyebrow),
    ...strings(fields.hooks),
    ...strings(fields.headings),
    ...sections.flatMap((section) => [
      ...strings(section.heading),
      ...strings(section.paragraphs),
    ]),
    ...strings(fields.paragraphs),
    ...strings(fields.ctaLabels),
    ...renderedSurface.flatMap((copy) => strings(copy.value)),
    ...strings(renderedBody.coverEyebrow),
    ...strings(renderedBody.sectionMarker),
    ...strings(renderedBody.ctaLinks),
    ...strings(renderedBody.regionPass),
    ...strings(renderedBody.desk),
  ];
}

function rangActualSurfaceForDocument(document: UnknownRecord) {
  const surface = asRecord(document.actualDomSurface);
  const direct = strings(surface.directText);
  const full = strings(surface.fullBlockText);
  const accessibility = strings(surface.accessibilityText).map(accessibilityValue);
  const counts = asRecord(surface.counts);
  const expected = Number(counts.exactMultiset ?? -1);
  if (
    surface.contractVersion !== "rang-actual-dom-visible-multiset/v1" ||
    direct.length === 0 ||
    full.length === 0 ||
    accessibility.length === 0 ||
    expected !== direct.length + full.length + accessibility.length
  ) {
    throw new Error(`RANG_CROSS_ACTUAL_DOM_SURFACE_INCOMPLETE:${String(document.route ?? document.id ?? "UNKNOWN")}`);
  }
  return { direct, full, accessibility };
}

function embeddedForeignSurface(document: UnknownRecord) {
  const fields = asRecord(document.fields ?? document);
  const mixed = asRecord(fields.renderedVisibleAuditUnits);
  const mixedDirect = strings(mixed.directTextAtoms);
  const mixedFull = strings(mixed.blockTextAtoms);
  const mixedAccessibility = strings(mixed.accessibilityLabels);
  if (mixedDirect.length > 0 && mixedFull.length > 0) {
    return {
      source: "embedded-rendered-visible-audit-units",
      direct: mixedDirect,
      full: mixedFull,
      accessibility: mixedAccessibility,
    };
  }

  const rendered = asRecord(fields.rendered ?? document.rendered);
  const visibleContract = asRecord(rendered.visibleContract);
  const contract = asRecord(visibleContract.contract);
  const entries = Array.isArray(contract.entries) ? contract.entries.map(asRecord) : [];
  if (entries.length > 0) {
    return {
      source: "embedded-visible-dom-contract",
      direct: entries
        .filter((entry) => entry.kind === "visible-text")
        .flatMap((entry) => strings(entry.value)),
      full: [] as string[],
      accessibility: entries
        .filter((entry) => entry.kind !== "visible-text")
        .flatMap((entry) => strings(entry.value)),
    };
  }
  return null;
}

const SHARED_STRUCTURAL_ATOMS = new Set([
  "홈",
  "지역",
  "지역별 안내",
  "코스",
  "코스·가격",
  "이용안내",
  "공지",
  "전화상담",
  "24H 전화상담",
  "24시간 전화상담",
  "상담",
  "결제",
  "시간",
  "현장 후불",
  "현장 결제",
  "현장 결제 가능",
  "선입금 없는 100% 현장 후불",
  "현장 카드 결제 가능",
  "카드",
  "타이",
  "아로마",
  "힐링",
  "스페셜",
  "남성전용",
  "주요 메뉴",
  "모바일 메뉴",
  "메뉴 열기",
  "페이지 경로",
]);

function sharedAtomicReason(
  value: string,
  geography: ReadonlySet<string>,
): "geography" | "structural-ui" | "operating-fact-atom" | "decorative-numeric" | null {
  if (completeSentences(value).length > 0) return null;
  if (geography.has(value)) return "geography";
  if (SHARED_STRUCTURAL_ATOMS.has(value)) {
    return /(?:후불|결제|카드|타이|아로마|힐링|스페셜|남성전용|24(?:H|시간))/u.test(value)
      ? "operating-fact-atom"
      : "structural-ui";
  }
  if (/^(?:[\p{P}\p{S}]|\s)+$/u.test(value)) return "decorative-numeric";
  if (/^(?:\d{1,3}|\d{1,3}개(?:\s+안내\s+지역)?|\d{1,3}개\s+세부\s+좌표)$/u.test(value)) {
    return "decorative-numeric";
  }
  if (/^(?:0508[- ·]?202[- ·]?3906|\d{2,3}분(?:\s+[\d,]+원)?|[\d,]+원)$/u.test(value)) {
    return "operating-fact-atom";
  }
  return null;
}

function externalForeignSurface(
  route: string,
  contract: UnknownRecord | undefined,
) {
  const documents = Array.isArray(contract?.documents)
    ? contract.documents.map(asRecord)
    : [];
  const document = documents.find((candidate) => candidate.route === route);
  if (!document) return null;
  return {
    source: "exact-pinned-external-visible-contract",
    direct: strings(document.directTextAtoms),
    full: strings(document.blockTextAtoms),
    accessibility: strings(document.accessibilityLabels),
  };
}

function corpusDocuments(corpus: UnknownRecord): UnknownRecord[] {
  return Array.isArray(corpus.documents)
    ? corpus.documents.map(asRecord)
    : Array.isArray(corpus.entries)
      ? corpus.entries.map(asRecord)
      : [];
}

function geographyValues(corpus: UnknownRecord): Set<string> {
  const values = new Set<string>();
  for (const document of corpusDocuments(corpus)) {
    const fields = asRecord(document.fields ?? document);
    for (const value of [
      ...strings(fields.regionName),
      ...strings(fields.regionAliases),
      ...strings(document.regionName),
      ...strings(document.regionAliases),
    ]) {
      values.add(value);
    }
  }
  return values;
}

function rangSets(corpus: UnknownRecord) {
  const regionDocuments = corpusDocuments(corpus);
  const fixedDocuments = Array.isArray(corpus.fixedDocuments)
    ? corpus.fixedDocuments.map(asRecord)
    : [];
  const allDocuments = [...regionDocuments, ...fixedDocuments];
  const metaValues = allDocuments.flatMap(metadataForDocument);
  const surfaces = allDocuments.map(rangActualSurfaceForDocument);
  const directValues = surfaces.flatMap((surface) => surface.direct);
  const fullBlockValues = surfaces.flatMap((surface) => surface.full);
  const accessibilityValues = surfaces.flatMap((surface) => surface.accessibility);
  const bodyValues = [...directValues, ...fullBlockValues, ...accessibilityValues];
  const meta = new Set(metaValues);
  const body = new Set(bodyValues);
  const sentences = new Set([...metaValues, ...bodyValues].flatMap(completeSentences));
  return {
    documents: allDocuments.length,
    regionDocuments: regionDocuments.length,
    fixedDocuments: fixedDocuments.length,
    meta,
    body,
    sentences,
    all: new Set([...meta, ...body, ...sentences]),
    geography: geographyValues(corpus),
    surfaceSource: "actualDomSurface.directText+fullBlockText+accessibilityText",
    surfaceOccurrences: {
      direct: directValues.length,
      fullBlock: fullBlockValues.length,
      accessibility: accessibilityValues.length,
      exactMultiset: bodyValues.length,
    },
  };
}

function foreignSets(bundle: CorpusBundle) {
  const documents = corpusDocuments(bundle.corpus);
  const metaValues = documents.flatMap(metadataForDocument);
  const directValues: string[] = [];
  const fullBlockValues: string[] = [];
  const accessibilityValues: string[] = [];
  const declaredFallback: string[] = [];
  const sources = new Set<string>();
  for (const document of documents) {
    const route = String(document.route ?? "");
    const surface = embeddedForeignSurface(document) ?? externalForeignSurface(
      route,
      bundle.externalVisibleContract?.contract,
    );
    if (surface) {
      sources.add(surface.source);
      directValues.push(...surface.direct);
      fullBlockValues.push(...surface.full);
      accessibilityValues.push(...surface.accessibility);
    } else {
      sources.add("declared-corpus-fallback");
      declaredFallback.push(...declaredBodyForDocument(document));
    }
  }
  const bodyValues = [
    ...directValues,
    ...fullBlockValues,
    ...accessibilityValues,
    ...declaredFallback,
  ];
  const meta = new Set(metaValues);
  const body = new Set(bodyValues);
  const sentences = new Set([...metaValues, ...bodyValues].flatMap(completeSentences));
  return {
    documents: documents.length,
    meta,
    body,
    sentences,
    all: new Set([...meta, ...body, ...sentences]),
    geography: geographyValues(bundle.corpus),
    surfaceSource: [...sources].sort(),
    surfaceOccurrences: {
      direct: directValues.length,
      fullBlock: fullBlockValues.length,
      accessibility: accessibilityValues.length,
      declaredFallback: declaredFallback.length,
      exactMultiset: bodyValues.length,
    },
  };
}

function intersection(left: ReadonlySet<string>, right: ReadonlySet<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort((a, b) => a.localeCompare(b, "ko"));
}

async function readPlainCorpus(path: string): Promise<CorpusBundle> {
  const buffer = await readFile(path);
  return {
    path,
    buffer,
    corpus: asRecord(JSON.parse(buffer.toString("utf8"))),
  };
}

function snapshotPath(relativePath: string): string {
  const absolute = resolve(SNAPSHOT_DIRECTORY, relativePath);
  if (!absolute.startsWith(`${SNAPSHOT_DIRECTORY}/`)) {
    throw new Error(`RANG_CROSS_SNAPSHOT_PATH_ESCAPE:${relativePath}`);
  }
  return absolute;
}

async function readSnapshotFile(definition: SnapshotFile) {
  if (definition.encoding !== "gzip") {
    throw new Error(`RANG_CROSS_SNAPSHOT_ENCODING:${definition.path}`);
  }
  const path = snapshotPath(definition.path);
  const bundle = await readFile(path);
  const bundleSha256 = sha256(bundle);
  if (bundleSha256 !== definition.bundleSha256) {
    throw new Error(
      `RANG_CROSS_SNAPSHOT_BUNDLE_SHA:${definition.path}:${bundleSha256}:${definition.bundleSha256}`,
    );
  }
  const source = gunzipSync(bundle);
  const sourceSha256 = sha256(source);
  if (sourceSha256 !== definition.sourceSha256) {
    throw new Error(
      `RANG_CROSS_SNAPSHOT_SOURCE_SHA:${definition.path}:${sourceSha256}:${definition.sourceSha256}`,
    );
  }
  return { path, bundle, source, sourceSha256, bundleSha256 };
}

async function readSnapshotBundle(
  definition: SnapshotPlatform,
): Promise<CorpusBundle> {
  const corpusFile = await readSnapshotFile(definition.corpus);
  const corpus = asRecord(JSON.parse(corpusFile.source.toString("utf8")));
  if (corpus.platformId !== definition.platformId) {
    throw new Error(
      `RANG_CROSS_SNAPSHOT_PLATFORM:${definition.platformId}:${String(corpus.platformId)}`,
    );
  }
  let externalVisibleContract: CorpusBundle["externalVisibleContract"];
  if (definition.visibleContract) {
    const contractFile = await readSnapshotFile(definition.visibleContract);
    const declaredContract = asRecord(corpus.renderedVisibleContract);
    if (text(declaredContract.sha256) !== contractFile.sourceSha256) {
      throw new Error(
        `RANG_CROSS_SNAPSHOT_VISIBLE_CONTRACT_SHA:${definition.platformId}`,
      );
    }
    externalVisibleContract = {
      path: contractFile.path,
      buffer: contractFile.source,
      contract: asRecord(JSON.parse(contractFile.source.toString("utf8"))),
    };
  }
  return {
    path: corpusFile.path,
    buffer: corpusFile.source,
    corpus,
    externalVisibleContract,
  };
}

async function readSnapshotManifest() {
  const buffer = await readFile(SNAPSHOT_MANIFEST_PATH);
  const manifest = JSON.parse(buffer.toString("utf8")) as SnapshotManifest;
  const platformIds = manifest.platforms?.map((entry) => entry.platformId) ?? [];
  if (
    manifest.schemaVersion !== "rang-external-corpus-snapshot-manifest/v1" ||
    manifest.refreshPolicy !== "EXPLICIT_ONLY" ||
    manifest.status !== "PENDING_INDEPENDENT_GO" ||
    platformIds.length !== 4 ||
    new Set(platformIds).size !== 4 ||
    !["massagebom", "star-todaki", "massage-love", "mixed-love-massage"].every(
      (platformId) => platformIds.includes(platformId),
    )
  ) {
    throw new Error("RANG_CROSS_SNAPSHOT_MANIFEST_SHAPE");
  }
  const platforms = [...manifest.platforms].sort((left, right) =>
    left.platformId.localeCompare(right.platformId),
  );
  const normalizedManifest: SnapshotManifest = { ...manifest, platforms };
  const authorityContract = {
    schemaVersion: manifest.schemaVersion,
    snapshotVersion: manifest.snapshotVersion,
    status: manifest.status,
    refreshPolicy: manifest.refreshPolicy,
    platforms: platforms.map((platform) => ({
      platformId: platform.platformId,
      corpus: platform.corpus,
      visibleContract: platform.visibleContract ?? null,
      independentGo: platform.independentGo,
    })),
  };
  return {
    buffer,
    manifest: normalizedManifest,
    rawFileSha256: sha256(buffer),
    sha256: sha256(canonical(authorityContract)),
  };
}

async function liveFileObservation(
  relativePath: string | undefined,
  snapshotSha256: string | undefined,
) {
  if (!relativePath || !snapshotSha256) return null;
  try {
    const buffer = await readFile(resolve(ROOT, relativePath));
    const currentSha256 = sha256(buffer);
    return {
      state: currentSha256 === snapshotSha256 ? "MATCH" : "CHANGED",
      snapshotSha256,
      currentSha256,
    };
  } catch {
    return {
      state: "NOT_OBSERVED",
      snapshotSha256,
      currentSha256: null,
    };
  }
}

async function writeLiveDriftReceipt(
  manifest: SnapshotManifest,
  manifestSha256: string,
) {
  const observations = await Promise.all(
    [...manifest.platforms]
      .sort((left, right) => left.platformId.localeCompare(right.platformId))
      .map(async (platform) => ({
      platformId: platform.platformId,
      corpus: await liveFileObservation(
        platform.liveProbePath,
        platform.corpus.sourceSha256,
      ),
      visibleContract: await liveFileObservation(
        platform.liveVisibleContractProbePath,
        platform.visibleContract?.sourceSha256,
      ),
      })),
  );
  const changed = observations.some((observation) =>
    [observation.corpus, observation.visibleContract]
      .filter(Boolean)
      .some((entry) => entry?.state === "CHANGED"),
  );
  const receipt = {
    schemaVersion: "rang-cross-platform-live-drift/v1",
    status: changed ? "PENDING_CHANGED" : "PENDING",
    platformId: "rang-therapy",
    snapshotVersion: manifest.snapshotVersion,
    snapshotManifestSha256: manifestSha256,
    policy: {
      authority: "NON_CANONICAL_LIVE_DRIFT_SIGNAL",
      snapshotRefresh: "EXPLICIT_ONLY",
      changedPeer: "PENDING_CHANGED_UNTIL_EXPLICIT_SNAPSHOT_REFRESH_AND_REAUDIT",
      absentPeer: "NOT_OBSERVED_WITHOUT_MUTATING_CANONICAL_RECEIPT",
    },
    observations,
    verdict: changed ? "PENDING_CHANGED" : "PENDING",
  };
  const rendered = `${JSON.stringify(receipt, null, 2)}\n`;
  await mkdir(dirname(LIVE_DRIFT_PATH), { recursive: true });
  await writeFile(LIVE_DRIFT_PATH, rendered, "utf8");
  return { receipt, rendered, sha256: sha256(rendered) };
}

async function main() {
  const rang = await readPlainCorpus(RANG_CORPUS_PATH);
  const snapshot = await readSnapshotManifest();
  const rangCorpusSha256 = sha256(rang.buffer);
  const rangSurface = rangSets(rang.corpus);
  const comparisons = [];
  const collisionValues = new Set<string>();
  const categoryCounts = { meta: 0, body: 0, sentences: 0, anyVisibleValue: 0 };
  const rawOverlapCounts = { meta: 0, body: 0, sentences: 0, anyVisibleValue: 0 };
  const sharedOverlapReasonCounts = {
    geography: 0,
    "structural-ui": 0,
    "operating-fact-atom": 0,
    "decorative-numeric": 0,
  };

  for (const definition of snapshot.manifest.platforms) {
    const foreign = await readSnapshotBundle(definition);
    const platformId = definition.platformId;
    const foreignCorpusSha256 = sha256(foreign.buffer);
    const foreignSurface = foreignSets(foreign);
    const rawMeta = intersection(rangSurface.meta, foreignSurface.meta);
    const rawBody = intersection(rangSurface.body, foreignSurface.body);
    const rawSentences = intersection(rangSurface.sentences, foreignSurface.sentences);
    const rawAnyVisibleValue = intersection(rangSurface.all, foreignSurface.all);
    const combinedGeography = new Set([
      ...rangSurface.geography,
      ...foreignSurface.geography,
    ]);
    const permittedShared = new Map<string, ReturnType<typeof sharedAtomicReason>>();
    for (const value of rawAnyVisibleValue) {
      const reason = sharedAtomicReason(value, combinedGeography);
      if (reason) permittedShared.set(value, reason);
    }
    const meta = rawMeta.filter((value) => !permittedShared.has(value));
    const body = rawBody.filter((value) => !permittedShared.has(value));
    const sentences = rawSentences.filter((value) => !permittedShared.has(value));
    const anyVisibleValue = rawAnyVisibleValue.filter(
      (value) => !permittedShared.has(value),
    );
    for (const value of anyVisibleValue) collisionValues.add(value);
    for (const reason of permittedShared.values()) {
      if (reason) sharedOverlapReasonCounts[reason] += 1;
    }
    categoryCounts.meta += meta.length;
    categoryCounts.body += body.length;
    categoryCounts.sentences += sentences.length;
    categoryCounts.anyVisibleValue += anyVisibleValue.length;
    rawOverlapCounts.meta += rawMeta.length;
    rawOverlapCounts.body += rawBody.length;
    rawOverlapCounts.sentences += rawSentences.length;
    rawOverlapCounts.anyVisibleValue += rawAnyVisibleValue.length;
    const independentGoPinned =
      definition.independentGo.status === "GO" &&
      definition.independentGo.exactCorpusSha256 === foreignCorpusSha256 &&
      typeof definition.independentGo.evidenceSha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(definition.independentGo.evidenceSha256);
    comparisons.push({
      platformId,
      corpusPath: relative(ROOT, foreign.path),
      corpusSha256: foreignCorpusSha256,
      snapshotBundleSha256: definition.corpus.bundleSha256,
      externalVisibleContract: foreign.externalVisibleContract
        ? {
            path: relative(ROOT, foreign.externalVisibleContract.path),
            sha256: sha256(foreign.externalVisibleContract.buffer),
            snapshotBundleSha256: definition.visibleContract?.bundleSha256,
          }
        : null,
      documentCount: foreignSurface.documents,
      surfaceSource: foreignSurface.surfaceSource,
      surfaceOccurrences: foreignSurface.surfaceOccurrences,
      independentGo: definition.independentGo,
      dependencyState: independentGoPinned
        ? "EXACT_INDEPENDENT_GO_PINNED"
        : "SNAPSHOT_AUDITED_AWAITING_INDEPENDENT_GO",
      collisionCounts: {
        meta: meta.length,
        body: body.length,
        sentences: sentences.length,
        anyVisibleValue: anyVisibleValue.length,
      },
      rawExactOverlapCounts: {
        meta: rawMeta.length,
        body: rawBody.length,
        sentences: rawSentences.length,
        anyVisibleValue: rawAnyVisibleValue.length,
      },
      permittedSharedAtomicOverlap: {
        count: permittedShared.size,
        values: [...permittedShared.entries()].slice(0, 48).map(([value, reason]) => ({
          value,
          reason,
        })),
      },
      collisionSamples: anyVisibleValue.slice(0, 24),
      verdict:
        anyVisibleValue.length > 0
          ? "FAIL"
          : independentGoPinned
            ? "PASS"
            : "PENDING",
    });
  }

  const allIndependentGoPinned = comparisons.every(
    (comparison) => comparison.dependencyState === "EXACT_INDEPENDENT_GO_PINNED",
  );
  const clean = collisionValues.size === 0;
  const status = clean
    ? allIndependentGoPinned
      ? "PASS"
      : "PENDING"
    : "FAILED";
  const receipt = {
    schemaVersion: "rang-cross-platform-exact-audit/v3",
    status,
    platformId: "rang-therapy",
    snapshotVersion: snapshot.manifest.snapshotVersion,
    snapshotManifest: {
      path: relative(ROOT, SNAPSHOT_MANIFEST_PATH),
      sha256: snapshot.sha256,
      hashScope: "ORDER_AND_LIVE_PROBE_PATH_INDEPENDENT_AUTHORITY_FIELDS",
      refreshPolicy: snapshot.manifest.refreshPolicy,
    },
    rangCorpusSha256,
    rangSourceManifestSha256: String(rang.corpus.sourceManifestSha256 ?? ""),
    policy: {
      comparison: "raw NFC-trimmed exact equality",
      rangSurfaceSource: rangSurface.surfaceSource,
      scopes: [
        "meta",
        "actual-dom-direct-text",
        "actual-dom-full-block-text",
        "actual-dom-accessibility-text",
        "complete-customer-sentence",
        "cross-category-visible-value",
      ],
      acceptedCollisionCount: 0,
      permittedSharedAtomicOverlap:
        "완전문장은 예외 없이 감사합니다. 지역명, 구조 UI 단어, 단독 가격·시간·결제 사실, 장식 기호만 exact 분류해 owned-copy collision에서 제외하며 raw overlap 수치는 별도로 보존합니다.",
      finalization: "마사지봄·스타 토닥이·마사지러브·Mixed Love 네 플랫폼 모두 독립 GO의 exact corpus/evidence SHA가 manifest에 명시되기 전에는 PENDING입니다.",
      dependencyRules: {
        missingOrTamperedLocalSnapshot:
          "FAIL_WITHOUT_OVERWRITING_CANONICAL_RECEIPT",
        changedLivePeer:
          "SEPARATE_PERSISTED_PENDING_CHANGED_SIGNAL_AND_EXPLICIT_REFRESH_ONLY",
        absentLivePeer:
          "CANONICAL_LOCAL_SNAPSHOT_AUDIT_REMAINS_REPRODUCIBLE",
        staleReceiptReuse: false,
      },
      notes: "Rang의 1,291개 지역 DOM과 6개 고정 DOM에서 추출한 direct/full-block/a11y 전체 multiset을 corpus에 결속하고, 프로젝트 내부 immutable gzip snapshot의 실제 surface와 raw exact 대조합니다. 형제 저장소는 canonical 입력이 아니며 별도 live drift receipt로만 관찰합니다.",
    },
    rangCounts: {
      documents: rangSurface.documents,
      regionDocuments: rangSurface.regionDocuments,
      fixedDocuments: rangSurface.fixedDocuments,
      metaValues: rangSurface.meta.size,
      bodyValues: rangSurface.body.size,
      sentences: rangSurface.sentences.size,
      allVisibleValues: rangSurface.all.size,
      actualDomSurfaceOccurrences: rangSurface.surfaceOccurrences,
    },
    collisionCounts: categoryCounts,
    rawExactOverlapCounts: rawOverlapCounts,
    permittedSharedAtomicOverlapCounts: sharedOverlapReasonCounts,
    collisionSamples: [...collisionValues].slice(0, 48),
    comparisons,
    pendingDependencies: comparisons
      .filter(
        (comparison) =>
          comparison.dependencyState !== "EXACT_INDEPENDENT_GO_PINNED",
      )
      .map((comparison) => ({
        platformId: comparison.platformId,
        corpusSha256: comparison.corpusSha256,
        state: comparison.dependencyState,
      })),
    verdict: status === "PASS" ? "PASS" : status === "PENDING" ? "PENDING" : "FAIL",
  };
  await mkdir(dirname(RECEIPT_PATH), { recursive: true });
  const rendered = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeFile(RECEIPT_PATH, rendered, "utf8");
  if (collisionValues.size > 0) {
    throw new Error(`RANG_CROSS_PLATFORM_EXACT_COLLISION:${JSON.stringify(receipt.collisionSamples)}`);
  }
  const liveDrift = await writeLiveDriftReceipt(
    snapshot.manifest,
    snapshot.sha256,
  );
  process.stdout.write(`${JSON.stringify({ status, rangCorpusSha256, canonicalReceiptSha256: sha256(rendered), comparisons: comparisons.length, pendingDependencies: receipt.pendingDependencies.length, collisionCount: 0, liveDriftStatus: liveDrift.receipt.status, liveDriftReceiptSha256: liveDrift.sha256 })}\n`);
}

await main();
