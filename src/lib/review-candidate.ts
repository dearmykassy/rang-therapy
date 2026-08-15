import { createHash } from "node:crypto";

type UnknownRecord = Record<string, unknown>;

export type ReviewSourceEntry = {
  path: string;
  sha256: string;
};

export const REVIEW_ROUTE_SELECTION = [
  ["/areas/seoul", "root", "서울특별시"],
  ["/areas/seoul/%EA%B0%95%EB%82%A8%EA%B5%AC", "hub", "강남구"],
  ["/areas/seoul/%EC%A4%91%EB%9E%91%EA%B5%AC/%EC%A4%91%ED%99%94%EB%8F%99", "representative", "중랑구 중화동"],
  ["/areas/incheon", "root", "인천광역시"],
  ["/areas/incheon/%EA%B0%95%ED%99%94%EA%B5%B0", "hub", "강화군"],
  ["/areas/incheon/%EC%A0%9C%EB%AC%BC%ED%8F%AC%EA%B5%AC/%ED%99%94%EC%88%981.%ED%99%94%ED%8F%89%EB%8F%99", "representative", "제물포구 화수1.화평동"],
  ["/areas/gyeonggi", "root", "경기도"],
  ["/areas/gyeonggi/%EA%B0%80%ED%8F%89%EA%B5%B0", "hub", "가평군"],
  ["/areas/gyeonggi/%ED%99%94%EC%84%B1%EC%8B%9C/%ED%9A%A8%ED%96%89%EA%B5%AC/%EC%A0%95%EB%82%A8%EB%A9%B4", "representative", "화성시 효행구 정남면"],
  ["/areas/cheonan", "root", "천안시"],
  ["/areas/cheonan/%EB%8F%99%EB%82%A8%EA%B5%AC", "hub", "동남구"],
  ["/areas/cheonan/%EC%84%9C%EB%B6%81%EA%B5%AC/%EC%A7%81%EC%82%B0%EC%9D%8D", "representative", "서북구 직산읍"],
  ["/areas/asan", "root", "아산시"],
  ["/areas/asan/%EB%8F%84%EA%B3%A0%EB%A9%B4", "representative", "도고면"],
  ["/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%EC%B6%94%EC%9E%90%EB%A9%B4", "representative", "제주시 추자면"],
  ["/areas/daejeon", "root", "대전광역시"],
  ["/areas/daejeon/%EB%8C%80%EB%8D%95%EA%B5%AC", "hub", "대덕구"],
  ["/areas/daejeon/%EC%A4%91%EA%B5%AC/%ED%83%9C%ED%8F%89%EB%8F%99", "representative", "중구 태평동"],
  ["/areas/daegu", "root", "대구광역시"],
  ["/areas/daegu/%EA%B5%B0%EC%9C%84%EA%B5%B0", "hub", "군위군"],
  ["/areas/daegu/%EC%A4%91%EA%B5%AC/%EC%84%B1%EB%82%B4%EB%8F%99", "representative", "중구 성내동"],
  ["/areas/gumi", "root", "구미시"],
  ["/areas/gumi/%EA%B3%A0%EC%95%84%EC%9D%8D", "representative", "고아읍"],
  ["/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%ED%95%9C%EA%B2%BD%EB%A9%B4", "representative", "제주시 한경면"],
  ["/areas/pohang", "root", "포항시"],
  ["/areas/pohang/%EB%82%A8%EA%B5%AC", "hub", "남구"],
  ["/areas/pohang/%EB%B6%81%EA%B5%AC/%ED%9D%A5%ED%95%B4%EC%9D%8D", "representative", "북구 흥해읍"],
  ["/areas/busan", "root", "부산광역시"],
  ["/areas/busan/%EA%B0%95%EC%84%9C%EA%B5%AC", "hub", "강서구"],
  ["/areas/busan/%ED%95%B4%EC%9A%B4%EB%8C%80%EA%B5%AC/%EC%A4%91%EB%8F%99", "representative", "해운대구 중동"],
  ["/areas/jeju", "root", "제주특별자치도"],
  ["/areas/jeju/%EC%84%9C%EA%B7%80%ED%8F%AC%EC%8B%9C", "hub", "서귀포시"],
  ["/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%ED%99%94%EB%B6%81%EB%8F%99", "representative", "제주시 화북동"],
] as const;

export const REVIEW_SOURCE_PATHS = [
  "scripts/generate-content-review-receipts.ts",
  "scripts/audit-content-review-candidate.ts",
  "src/lib/review-candidate.ts",
] as const;

export function reviewSha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function exactJsonSha256(value: unknown): string {
  return reviewSha256(JSON.stringify(value));
}

function reviewSourceContract(sourceManifest: ReviewSourceEntry[]) {
  const normalized = [...sourceManifest].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  return {
    files: normalized,
    sha256: exactJsonSha256(normalized),
  };
}

function decisionLock() {
  return {
    status: "UNDECIDED",
    reviewer: null,
    reviewedAt: null,
    verdict: null,
    reason: null,
  } as const;
}

function routeCopy(document: UnknownRecord) {
  return {
    title: document.title,
    description: document.description,
    metadata: document.metadata,
    h1: document.h1,
    hooks: document.hooks,
    sections: document.sections,
    ctaLabels: document.ctaLabels,
    telActions: document.telActions,
  };
}

export function buildPendingReviewPackets(args: {
  corpus: UnknownRecord;
  corpusBuffer: Buffer;
  sourceManifest: ReviewSourceEntry[];
  crossReceiptSha256: string;
  browserReceiptSha256: string;
}) {
  const { corpus, corpusBuffer, sourceManifest } = args;
  const corpusSha256 = reviewSha256(corpusBuffer);
  const corpusSourceManifestSha256 = String(corpus.sourceManifestSha256 ?? "");
  const diversityAudit = asRecord(corpus.diversityAudit);
  const sentenceSimilarity = asRecord(diversityAudit.sentenceSimilarity);
  const topCandidates = array(sentenceSimilarity.topCandidates).map(asRecord);
  const sourceContract = reviewSourceContract(sourceManifest);
  const semanticSelection = {
    method: sentenceSimilarity.humanReviewSampleMethod,
    sourceField: "diversityAudit.sentenceSimilarity.topCandidates",
    candidateCount: topCandidates.length,
    sourceValueSha256: exactJsonSha256(topCandidates),
  };
  const semanticPacket = {
    schemaVersion: "rang-normalized-sentence-semantic-review-candidate/v5",
    status: "PENDING_EXTERNAL_HUMAN_REVIEW",
    platformId: "rang-therapy",
    candidateOnly: true,
    releaseEligible: false,
    decision: decisionLock(),
    corpusSha256,
    corpusSourceManifestSha256,
    reviewSource: sourceContract,
    selection: {
      ...semanticSelection,
      sha256: exactJsonSha256(semanticSelection),
    },
    automatedContext: {
      sampledPairs: sentenceSimilarity.sampledPairs,
      acceptanceThresholdExclusive: sentenceSimilarity.acceptanceThreshold,
      maximumSimilarity: sentenceSimilarity.maximumSimilarity,
      note: "수치 임계값은 후보 선택에만 쓰며 문장 승인으로 해석하지 않습니다.",
    },
    candidates: topCandidates.map((candidate, index) => {
      const exactCandidate = {
        familyId: candidate.familyId,
        similarity: candidate.similarity,
        leftRoute: candidate.leftRoute,
        rightRoute: candidate.rightRoute,
        left: candidate.left,
        right: candidate.right,
      };
      return {
        selectionId: `semantic-${String(index + 1).padStart(2, "0")}`,
        rank: index + 1,
        exactCandidate,
        exactCandidateSha256: exactJsonSha256(exactCandidate),
        reviewerDecision: null,
        reviewerReason: null,
      };
    }),
    requiredExternalChecks: [
      "두 원문을 직접 읽고 조사·문법·맥락 연결이 자연스러운지 판단합니다.",
      "지역명이나 숫자만 바꾼 문장인지 확인합니다.",
      "같은 고객 행동·조건·결과를 반복하는지 확인합니다.",
      "고객 이동이나 제공자 도착·대기 역할을 전제하지 않는지 확인합니다.",
    ],
  };

  const documents = array(corpus.documents).map(asRecord);
  const routeSelectionDefinition = REVIEW_ROUTE_SELECTION.map(
    ([route, kind, label], selectionIndex) => ({
      selectionIndex,
      route,
      kind,
      label,
    }),
  );
  const selectedRoutes = routeSelectionDefinition.map((selection) => {
    const documentIndex = documents.findIndex(
      (document) => document.route === selection.route,
    );
    const document = documents[documentIndex];
    if (!document || document.pageType !== `region-${selection.kind}`) {
      throw new Error(`RANG_REVIEW_CANDIDATE_ROUTE_SOURCE:${selection.route}`);
    }
    const exactCandidateCopy = routeCopy(document);
    return {
      ...selection,
      documentIndex,
      sourceDocumentSha256: exactJsonSha256(document),
      exactCandidateCopy,
      exactCandidateCopySha256: exactJsonSha256(exactCandidateCopy),
      reviewerDecision: null,
      reviewerNotes: null,
    };
  });
  const routePacket = {
    schemaVersion: "rang-curated-copy-human-review-candidate/v5",
    status: "PENDING_EXTERNAL_HUMAN_REVIEW",
    platformId: "rang-therapy",
    candidateOnly: true,
    releaseEligible: false,
    decision: decisionLock(),
    corpusSha256,
    corpusSourceManifestSha256,
    reviewSource: sourceContract,
    selection: {
      method: "locked 11-root + 9-hub + 13-representative route set",
      sourceField: "documents",
      routeCount: selectedRoutes.length,
      definitionSha256: exactJsonSha256(routeSelectionDefinition),
      selectedSourceDocumentsSha256: exactJsonSha256(
        selectedRoutes.map((entry) => ({
          route: entry.route,
          documentIndex: entry.documentIndex,
          sourceDocumentSha256: entry.sourceDocumentSha256,
        })),
      ),
    },
    evidenceBindings: {
      crossPlatformReceiptSha256: args.crossReceiptSha256,
      browserReceiptSha256: args.browserReceiptSha256,
    },
    selectedRoutes,
    requiredExternalChecks: [
      "title·description·Open Graph·Twitter·H1·hooks·12문단·CTA를 실제 원문으로 읽습니다.",
      "조사, 동사, 주소·연락처 역할, 인접 의미와 지역 검색 의도를 확인합니다.",
      "전화 링크의 고객 표시 라벨은 정확히 전화상담인지 확인합니다.",
      "결정은 이 후보 파일 밖의 독립 감사자가 기록하며 생성 스크립트는 승인값을 채우지 않습니다.",
    ],
    automatedEvidenceOnly: {
      regionRoutes: Number(asRecord(corpus.counts).documents ?? 0),
      fixedRoutes: array(corpus.fixedDocuments).length,
      actualDomRoutes: Number(asRecord(corpus.counts).actualDomSurfaceRoutes ?? 0),
      telActionLabelMismatches: Number(asRecord(corpus.counts).telActionLabelMismatches ?? -1),
      adjacentSemanticDuplicates: Number(asRecord(corpus.counts).adjacentHeadingSemanticDuplicates ?? -1),
      humanDecisionInferred: false,
    },
    releaseBlockers: [
      "EXTERNAL_HUMAN_COPY_REVIEW_REQUIRED",
      "IN_APP_BROWSER_BACKEND_UNAVAILABLE",
      "CROSS_PLATFORM_INDEPENDENT_GO_PINS_PENDING",
    ],
  };

  return { semanticPacket, routePacket };
}

function assertNoEmbeddedApproval(value: unknown) {
  const serialized = JSON.stringify(value);
  const forbiddenLegacyDecisions = [
    ["PASS", "COPY"].join("_"),
    ["ACCEPT", "COPY"].join("_"),
    ["COMPLETE", "COPY", "REVIEW"].join("_"),
  ];
  if (forbiddenLegacyDecisions.some((decision) => serialized.includes(decision))) {
    throw new Error("RANG_REVIEW_CANDIDATE_EMBEDDED_APPROVAL");
  }
}

export function assertPendingReviewPackets(args: {
  corpus: UnknownRecord;
  corpusBuffer: Buffer;
  sourceManifest: ReviewSourceEntry[];
  crossReceiptSha256: string;
  browserReceiptSha256: string;
  semanticPacket: unknown;
  routePacket: unknown;
}) {
  const expected = buildPendingReviewPackets(args);
  assertNoEmbeddedApproval(args.semanticPacket);
  assertNoEmbeddedApproval(args.routePacket);
  if (JSON.stringify(args.semanticPacket) !== JSON.stringify(expected.semanticPacket)) {
    throw new Error("RANG_REVIEW_CANDIDATE_SEMANTIC_EXACT_MISMATCH");
  }
  if (JSON.stringify(args.routePacket) !== JSON.stringify(expected.routePacket)) {
    throw new Error("RANG_REVIEW_CANDIDATE_ROUTE_EXACT_MISMATCH");
  }
  const semantic = asRecord(args.semanticPacket);
  const route = asRecord(args.routePacket);
  for (const packet of [semantic, route]) {
    const decision = asRecord(packet.decision);
    if (
      packet.status !== "PENDING_EXTERNAL_HUMAN_REVIEW" ||
      packet.candidateOnly !== true ||
      packet.releaseEligible !== false ||
      decision.status !== "UNDECIDED" ||
      decision.reviewer !== null ||
      decision.reviewedAt !== null ||
      decision.verdict !== null ||
      decision.reason !== null
    ) {
      throw new Error("RANG_REVIEW_CANDIDATE_NOT_FAIL_CLOSED");
    }
  }
}
