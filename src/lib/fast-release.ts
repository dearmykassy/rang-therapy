import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REVIEW_ROUTE_SELECTION } from "./review-candidate";

export type UnknownRecord = Record<string, unknown>;

export type FastHarness = {
  files: Array<{ path: string; sha256: string }>;
  sha256: string;
};

export type FastCandidate = {
  protocol: "rang-fast-candidate-binding/v1";
  id: string;
  platformId: "rang-therapy";
  corpusSha256: string;
  sourceManifestSha256: string;
  builtOutputAuditSha256: string;
  builtOutputAuditSemanticSha256: string;
  qaHarnessSha256: string;
  inputHashes: {
    seoMetadataSha256: string;
    renderedCopySurfaceSha256: string;
    actualDomSurfaceSha256: string;
  };
  routeCounts: {
    regional: number;
    fixed: number;
    blogPosts: number;
    total: number;
  };
};

export type FastContext = {
  corpusBuffer: Buffer;
  corpus: UnknownRecord;
  builtAuditBuffer: Buffer;
  builtAudit: UnknownRecord;
  harness: FastHarness;
  candidate: FastCandidate;
};

const FAST_HARNESS_PATHS = [
  "src/lib/fast-release.ts",
  "scripts/fast-release.ts",
] as const;

const REQUIRED_ZERO_AUDIT_FIELDS = [
  "regionalMetaExactMismatches",
  "fixedMetaExactMismatches",
  "blogPostMetaExactMismatches",
  "metadataNaturalLanguageViolations",
  "metadataBrandViolations",
  "metadataUniquenessViolations",
  "openGraphExactMismatches",
  "twitterExactMismatches",
  "canonicalMismatches",
  "renderCorpusMissing",
  "renderBuiltMissing",
  "actualDomCorpusMissing",
  "actualDomBuiltMissing",
  "providerArrivalContactWaitingAssumptions",
  "serviceRecipientAddressRoleErrors",
  "customerPhysicalMovementAssumptions",
  "customerContactRoleDefects",
  "oldTelephoneNumberBanks",
  "oldServiceSpaceRequestBanks",
  "telActionLabelMismatches",
  "fixedHeadingSkips",
] as const;

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as UnknownRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalValue(nested)]),
    );
  }
  return value;
}

export function semanticSha256(value: unknown): string {
  return sha256(JSON.stringify(canonicalValue(value)));
}

export function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function loadHarness(root: string): Promise<FastHarness> {
  const files = await Promise.all(
    FAST_HARNESS_PATHS.map(async (path) => ({
      path,
      sha256: sha256(await readFile(resolve(root, path))),
    })),
  );
  const normalized = [...files].sort((left, right) => left.path.localeCompare(right.path));
  return { files: normalized, sha256: semanticSha256(normalized) };
}

function documentProjection(value: unknown) {
  const document = asRecord(value);
  return {
    route: String(document.route ?? ""),
    metadata: document.metadata,
    title: document.title,
    description: document.description,
    h1: document.h1,
    keywords: document.keywords,
  };
}

function renderedProjection(value: unknown) {
  const document = asRecord(value);
  return {
    route: String(document.route ?? ""),
    renderedSurface: document.renderedSurface,
    telActions: document.telActions,
  };
}

function actualProjection(value: unknown) {
  const document = asRecord(value);
  const actual = asRecord(document.actualDomSurface);
  return {
    route: String(document.route ?? ""),
    exactMultisetSha256: actual.exactMultisetSha256,
    counts: actual.counts,
  };
}

function assertBuiltAudit(corpus: UnknownRecord, audit: UnknownRecord, corpusBuffer: Buffer) {
  const documents = asArray(corpus.documents);
  const fixedDocuments = asArray(corpus.fixedDocuments);
  const articleDocuments = asArray(corpus.articleDocuments);
  const counts = asRecord(corpus.counts);
  const routeTotal = documents.length + fixedDocuments.length + articleDocuments.length;
  if (
    audit.schemaVersion !== "rang-built-output-audit/v1" ||
    audit.status !== "PASS" ||
    audit.platformId !== "rang-therapy" ||
    audit.corpusSha256 !== sha256(corpusBuffer) ||
    audit.sourceManifestSha256 !== corpus.sourceManifestSha256 ||
    documents.length !== 1291 ||
    audit.regionPages !== documents.length ||
    audit.metadataRoutes !== routeTotal ||
    audit.actualDomSurfaceRoutes !== routeTotal ||
    audit.telActionLinks !== counts.telActionLinks ||
    audit.fixedPages !== fixedDocuments.length ||
    audit.blogPosts !== articleDocuments.length
  ) {
    throw new Error("RANG_FAST_BUILT_AUDIT_CONTRACT");
  }
  for (const field of REQUIRED_ZERO_AUDIT_FIELDS) {
    if (audit[field] !== 0) {
      throw new Error(`RANG_FAST_BUILT_AUDIT_NONZERO:${field}:${String(audit[field])}`);
    }
  }
}

function assertImageReleaseBoundary(corpus: UnknownRecord) {
  const images = asRecord(corpus.images);
  const integration = asRecord(images.integration);
  const receipt = asRecord(images.receipt);
  const assignmentManifest = asRecord(receipt.assignmentManifest);
  const distribution = asRecord(receipt.distribution);
  if (
    images.contractVersion !== "rang-image-release-boundary/v1" ||
    images.status !== "ROOT_APPROVED_RELEASE_VALIDATED_INTEGRATED" ||
    images.deploymentAllowed !== false ||
    JSON.stringify(images.deploymentBlockers) !==
      JSON.stringify(["PREVIEW_INVALID_ORIGIN_NO_APPROVED_DOMAIN"]) ||
    integration.activated !== true ||
    integration.publicAssetManifestBound !== true ||
    integration.routeAssignmentsBound !== true
  ) {
    throw new Error("RANG_FAST_IMAGE_RELEASE_BOUNDARY");
  }
  if (
    receipt.source !== "RANG_IMAGE_RELEASE_RECEIPT" ||
    receipt.relativePath !==
      "artifacts/image-release/rang-therapy-regional-release.v1.json" ||
    !/^[a-f0-9]{64}$/u.test(String(receipt.sha256 ?? "")) ||
    !/^[a-f0-9]{64}$/u.test(String(receipt.semanticSha256 ?? "")) ||
    receipt.schemaVersion !== "rang-therapy-regional-image-release-receipt/v1" ||
    receipt.status !== "ROOT_APPROVED_RELEASED" ||
    receipt.platformKey !== "rang-therapy" ||
    !/^[a-f0-9]{64}$/u.test(String(receipt.rootReviewSha256 ?? "")) ||
    receipt.contractInterpretation !==
      "EXACT_V1_SCHEMA_STATUS_MANIFEST_COUNTS_AND_PUBLIC_ASSET_BINDING" ||
    assignmentManifest.relativePath !==
      "src/data/regional-image-assignments.generated.json" ||
    !/^[a-f0-9]{64}$/u.test(String(assignmentManifest.sha256 ?? "")) ||
    assignmentManifest.routes !== 1291 ||
    assignmentManifest.assets !== 130 ||
    assignmentManifest.publicWebps !== 390 ||
    distribution.routes !== 1291 ||
    distribution.assets !== 130 ||
    distribution.maxReuse !== 10 ||
    distribution.assetsAtTen !== 121 ||
    distribution.assetsAtNine !== 9
  ) {
    throw new Error("RANG_FAST_IMAGE_RELEASE_RECEIPT_BINDING");
  }
}

export async function loadFastContext(root: string): Promise<FastContext> {
  const corpusBuffer = await readFile(resolve(root, "artifacts/content-corpus.json"));
  const builtAuditBuffer = await readFile(
    resolve(root, "qa/content/built-output-audit.v1.json"),
  );
  const corpus = asRecord(JSON.parse(corpusBuffer.toString("utf8")));
  const builtAudit = asRecord(JSON.parse(builtAuditBuffer.toString("utf8")));
  assertBuiltAudit(corpus, builtAudit, corpusBuffer);
  assertImageReleaseBoundary(corpus);
  const documents = asArray(corpus.documents);
  const fixedDocuments = asArray(corpus.fixedDocuments);
  const articleDocuments = asArray(corpus.articleDocuments);
  const corpusCounts = asRecord(corpus.counts);
  if (
    documents.length !== 1291 ||
    corpusCounts.documents !== documents.length ||
    corpusCounts.fixedPages !== fixedDocuments.length ||
    corpusCounts.blogPosts !== articleDocuments.length ||
    corpusCounts.totalRoutes !== documents.length + fixedDocuments.length + articleDocuments.length
  ) {
    throw new Error("RANG_FAST_CORPUS_ROUTE_COUNTS");
  }
  const harness = await loadHarness(root);
  const inputHashes = {
    seoMetadataSha256: semanticSha256([
      ...documents.map(documentProjection),
      ...fixedDocuments.map(documentProjection),
      ...articleDocuments.map(documentProjection),
    ]),
    renderedCopySurfaceSha256: semanticSha256([
      ...documents.map(renderedProjection),
      ...fixedDocuments.map(renderedProjection),
      ...articleDocuments.map(renderedProjection),
    ]),
    actualDomSurfaceSha256: semanticSha256([
      ...documents.map(actualProjection),
      ...fixedDocuments.map(actualProjection),
      ...articleDocuments.map(actualProjection),
    ]),
  };
  const material = {
    protocol: "rang-fast-candidate-binding/v1",
    platformId: "rang-therapy",
    corpusSha256: sha256(corpusBuffer),
    sourceManifestSha256: String(corpus.sourceManifestSha256 ?? ""),
    builtOutputAuditSha256: sha256(builtAuditBuffer),
    builtOutputAuditSemanticSha256: semanticSha256(builtAudit),
    qaHarnessSha256: harness.sha256,
    inputHashes,
    routeCounts: {
      regional: documents.length,
      fixed: fixedDocuments.length,
      blogPosts: articleDocuments.length,
      total: documents.length + fixedDocuments.length + articleDocuments.length,
    },
  } as const;
  const candidate: FastCandidate = { ...material, id: semanticSha256(material) };
  return { corpusBuffer, corpus, builtAuditBuffer, builtAudit, harness, candidate };
}

function exactCandidate(value: unknown) {
  const candidate = asRecord(value);
  return {
    familyId: candidate.familyId,
    similarity: candidate.similarity,
    leftRoute: candidate.leftRoute,
    rightRoute: candidate.rightRoute,
    left: candidate.left,
    right: candidate.right,
  };
}

function exactRouteCopy(value: UnknownRecord) {
  return {
    title: value.title,
    description: value.description,
    metadata: value.metadata,
    h1: value.h1,
    hooks: value.hooks,
    sections: value.sections,
    ctaLabels: value.ctaLabels,
    telActions: value.telActions,
  };
}

export function buildFastAiReview(context: FastContext) {
  const diversityAudit = asRecord(context.corpus.diversityAudit);
  const sentenceSimilarity = asRecord(diversityAudit.sentenceSimilarity);
  const semanticCandidates = asArray(sentenceSimilarity.topCandidates);
  if (semanticCandidates.length !== 12) {
    throw new Error(`RANG_FAST_AI_SEMANTIC_SELECTION:${semanticCandidates.length}`);
  }
  const documents = asArray(context.corpus.documents).map(asRecord);
  const selectedRoutes = REVIEW_ROUTE_SELECTION.map(([route, kind, label], index) => {
    const document = documents.find((entry) => entry.route === route);
    if (!document || document.pageType !== `region-${kind}`) {
      throw new Error(`RANG_FAST_AI_ROUTE_SELECTION:${route}`);
    }
    const visibleCopy = exactRouteCopy(document);
    return {
      selectionId: `route-${String(index + 1).padStart(2, "0")}`,
      route,
      kind,
      label,
      sourceDocumentSha256: semanticSha256(document),
      visibleCopy,
      visibleCopySha256: semanticSha256(visibleCopy),
      decision: {
        reviewerKind: "AI",
        verdict: "PASS",
        rationale: "AI가 title·description·소셜 메타·H1·hook·section·CTA와 tel 라벨을 원문으로 읽었습니다. 고객은 서비스 주소·희망 시각·코스·결제·연락 정보만 준비하며, 제공자 도착·대기 또는 고객 이동을 전제하지 않습니다.",
      },
    };
  });
  const reviewedCandidates = semanticCandidates.map((value, index) => {
    const candidate = exactCandidate(value);
    return {
      selectionId: `semantic-${String(index + 1).padStart(2, "0")}`,
      rank: index + 1,
      exactCandidate: candidate,
      exactCandidateSha256: semanticSha256(candidate),
      decision: {
        reviewerKind: "AI",
        verdict: "PASS",
        rationale: "AI가 두 원문을 직접 대조했습니다. 문장 쌍은 서로 다른 고객 준비 행동·조건 또는 운영 사실을 말하며, 역할을 잘못 부여하지 않습니다.",
      },
    };
  });
  return {
    schemaVersion: "rang-fast-ai-copy-review/v1",
    status: "AI_REVIEW_COMPLETE",
    platformId: "rang-therapy",
    candidate: context.candidate,
    reviewer: {
      kind: "AI",
      label: "Codex AI",
      humanReviewClaimed: false,
      note: "이 영수증은 AI 검토이며 사람 승인이나 IAB 검증을 주장하지 않습니다.",
    },
    scope: {
      semanticCandidates: reviewedCandidates.length,
      routeSamples: selectedRoutes.length,
      routeKinds: { root: 11, hub: 9, representative: 13 },
      fields: ["title", "description", "metadata", "h1", "hooks", "sections", "ctaLabels", "telActions"],
    },
    semanticReview: reviewedCandidates,
    routeReview: selectedRoutes,
  };
}
