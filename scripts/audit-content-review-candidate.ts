import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertPendingReviewPackets,
  REVIEW_SOURCE_PATHS,
  reviewSha256,
} from "../src/lib/review-candidate";

const ROOT = resolve(import.meta.dirname, "..");
const corpusBuffer = await readFile(resolve(ROOT, "artifacts/content-corpus.json"));
const corpus = JSON.parse(corpusBuffer.toString("utf8"));
const crossBuffer = await readFile(
  resolve(ROOT, "qa/content/cross-platform-exact-audit.v1.json"),
);
const browserBuffer = await readFile(resolve(ROOT, "qa/browser/report.json"));
const semanticBuffer = await readFile(
  resolve(ROOT, "qa/content/normalized-sentence-semantic-review.v1.json"),
);
const routeBuffer = await readFile(
  resolve(ROOT, "qa/content/curated-copy-human-review.v1.json"),
);
const sourceManifest = await Promise.all(
  REVIEW_SOURCE_PATHS.map(async (path) => ({
    path,
    sha256: reviewSha256(await readFile(resolve(ROOT, path))),
  })),
);

const semanticPacket = JSON.parse(semanticBuffer.toString("utf8"));
const routePacket = JSON.parse(routeBuffer.toString("utf8"));
assertPendingReviewPackets({
  corpus,
  corpusBuffer,
  sourceManifest,
  crossReceiptSha256: reviewSha256(crossBuffer),
  browserReceiptSha256: reviewSha256(browserBuffer),
  semanticPacket,
  routePacket,
});

process.stdout.write(
  `${JSON.stringify({
    status: "PENDING_EXTERNAL_HUMAN_REVIEW",
    failClosed: true,
    embeddedApproval: false,
    semanticCandidates: semanticPacket.candidates.length,
    routeCandidates: routePacket.selectedRoutes.length,
    semanticPacketSha256: reviewSha256(semanticBuffer),
    routePacketSha256: reviewSha256(routeBuffer),
  })}\n`,
);
