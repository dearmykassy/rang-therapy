import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertPendingReviewPackets,
  buildPendingReviewPackets,
  REVIEW_SOURCE_PATHS,
  reviewSha256,
} from "../src/lib/review-candidate";

const ROOT = resolve(import.meta.dirname, "..");
const SEMANTIC_PATH = resolve(
  ROOT,
  "qa/content/normalized-sentence-semantic-review.v1.json",
);
const ROUTE_PATH = resolve(
  ROOT,
  "qa/content/curated-copy-human-review.v1.json",
);

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function allZero(value: unknown): boolean {
  return Object.values(asRecord(value)).every((count) => count === 0);
}

const corpusBuffer = await readFile(resolve(ROOT, "artifacts/content-corpus.json"));
const corpus = asRecord(JSON.parse(corpusBuffer.toString("utf8")));
const crossBuffer = await readFile(
  resolve(ROOT, "qa/content/cross-platform-exact-audit.v1.json"),
);
const cross = asRecord(JSON.parse(crossBuffer.toString("utf8")));
const liveDriftBuffer = await readFile(
  resolve(ROOT, "qa/content/cross-platform-live-drift.v1.json"),
);
const liveDrift = asRecord(JSON.parse(liveDriftBuffer.toString("utf8")));
const browserBuffer = await readFile(resolve(ROOT, "qa/browser/report.json"));
const browser = asRecord(JSON.parse(browserBuffer.toString("utf8")));
const corpusSha256 = reviewSha256(corpusBuffer);

const comparisons = Array.isArray(cross.comparisons)
  ? cross.comparisons.map(asRecord)
  : [];
const pendingDependencies = Array.isArray(cross.pendingDependencies)
  ? cross.pendingDependencies.map(asRecord)
  : [];
if (
  cross.schemaVersion !== "rang-cross-platform-exact-audit/v3" ||
  cross.status !== "PENDING" ||
  cross.verdict !== "PENDING" ||
  cross.rangCorpusSha256 !== corpusSha256 ||
  cross.rangSourceManifestSha256 !== corpus.sourceManifestSha256 ||
  !allZero(cross.collisionCounts) ||
  pendingDependencies.length !== 4 ||
  !pendingDependencies.every(
    (dependency) =>
      dependency.state === "SNAPSHOT_AUDITED_AWAITING_INDEPENDENT_GO",
  ) ||
  comparisons.length !== 4 ||
  !comparisons.every(
    (comparison) =>
      comparison.verdict === "PENDING" && allZero(comparison.collisionCounts),
  )
) {
  throw new Error("RANG_REVIEW_CANDIDATE_CROSS_NOT_PENDING_CLEAN");
}

const observations = Array.isArray(liveDrift.observations)
  ? liveDrift.observations.map(asRecord)
  : [];
const observedStates = observations.flatMap((observation) =>
  [observation.corpus, observation.visibleContract]
    .filter((entry) => entry !== null && entry !== undefined)
    .map((entry) => String(asRecord(entry).state ?? "")),
);
const changed = observedStates.includes("CHANGED");
if (
  liveDrift.schemaVersion !== "rang-cross-platform-live-drift/v1" ||
  liveDrift.snapshotManifestSha256 !== asRecord(cross.snapshotManifest).sha256 ||
  observations.length !== 4 ||
  new Set(observations.map((observation) => observation.platformId)).size !== 4 ||
  observedStates.length < 4 ||
  !observedStates.every((state) =>
    ["MATCH", "CHANGED", "NOT_OBSERVED"].includes(state),
  ) ||
  liveDrift.status !== (changed ? "PENDING_CHANGED" : "PENDING") ||
  liveDrift.verdict !== (changed ? "PENDING_CHANGED" : "PENDING")
) {
  throw new Error("RANG_REVIEW_CANDIDATE_LIVE_DRIFT_INVALID");
}

const requiredFreshQa = asRecord(browser.requiredFreshQa);
const historicalEvidence = asRecord(browser.historicalEvidence);
if (
  browser.schemaVersion !== "rang-therapy/browser-qa/v7" ||
  browser.status !== "PENDING_IAB_UNAVAILABLE" ||
  browser.verdict !== "PENDING" ||
  browser.finalReleaseEligible !== false ||
  browser.corpusSha256 !== corpusSha256 ||
  browser.sourceManifestSha256 !== corpus.sourceManifestSha256 ||
  !Array.isArray(requiredFreshQa.cases) ||
  requiredFreshQa.cases.length !== 12 ||
  requiredFreshQa.freshCasesCompleted !== 0 ||
  historicalEvidence.cases !== 12 ||
  historicalEvidence.finalAuthority !== false
) {
  throw new Error("RANG_REVIEW_CANDIDATE_BROWSER_PENDING_STALE");
}

const sourceManifest = await Promise.all(
  REVIEW_SOURCE_PATHS.map(async (path) => ({
    path,
    sha256: reviewSha256(await readFile(resolve(ROOT, path))),
  })),
);
const packets = buildPendingReviewPackets({
  corpus,
  corpusBuffer,
  sourceManifest,
  crossReceiptSha256: reviewSha256(crossBuffer),
  browserReceiptSha256: reviewSha256(browserBuffer),
});
assertPendingReviewPackets({
  corpus,
  corpusBuffer,
  sourceManifest,
  crossReceiptSha256: reviewSha256(crossBuffer),
  browserReceiptSha256: reviewSha256(browserBuffer),
  ...packets,
});

const semanticText = `${JSON.stringify(packets.semanticPacket, null, 2)}\n`;
const routeText = `${JSON.stringify(packets.routePacket, null, 2)}\n`;
await writeFile(SEMANTIC_PATH, semanticText, "utf8");
await writeFile(ROUTE_PATH, routeText, "utf8");

process.stdout.write(
  `${JSON.stringify({
    status: "PENDING_EXTERNAL_HUMAN_REVIEW",
    releaseEligible: false,
    corpusSha256,
    semanticCandidates: packets.semanticPacket.candidates.length,
    routeCandidates: packets.routePacket.selectedRoutes.length,
    semanticPacketSha256: reviewSha256(semanticText),
    routePacketSha256: reviewSha256(routeText),
  })}\n`,
);
