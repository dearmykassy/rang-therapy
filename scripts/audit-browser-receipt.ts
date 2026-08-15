import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PNG_MAGIC_HEX = "89504e470d0a1a0a";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function dimensions(buffer: Buffer): [number, number] {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== PNG_MAGIC_HEX
  ) {
    throw new Error("RANG_BROWSER_HISTORICAL_SCREENSHOT_NOT_REAL_PNG");
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

const receipt = asRecord(
  JSON.parse(await readFile(resolve(ROOT, "qa/browser/report.json"), "utf8")),
);
const corpusBuffer = await readFile(resolve(ROOT, "artifacts/content-corpus.json"));
const corpus = asRecord(JSON.parse(corpusBuffer.toString("utf8")));
if (
  receipt.schemaVersion !== "rang-therapy/browser-qa/v7" ||
  receipt.status !== "PENDING_IAB_UNAVAILABLE" ||
  receipt.verdict !== "PENDING" ||
  receipt.finalReleaseEligible !== false ||
  receipt.corpusSha256 !== sha256(corpusBuffer) ||
  receipt.sourceManifestSha256 !== corpus.sourceManifestSha256
) {
  throw new Error("RANG_BROWSER_PENDING_RECEIPT_STALE_OR_FALSE_PASS");
}

const blocker = asRecord(receipt.blocker);
if (
  blocker.code !== "IN_APP_BROWSER_BACKEND_UNAVAILABLE" ||
  blocker.browserConstraint !== "IN_APP_BROWSER_ONLY" ||
  blocker.substitutionAllowed !== false
) {
  throw new Error("RANG_BROWSER_PENDING_BLOCKER_CONTRACT");
}

const latestRetryAttempt = asRecord(receipt.latestRetryAttempt);
if (
  latestRetryAttempt.attemptedAt !== "2026-08-14T14:21:18Z" ||
  latestRetryAttempt.selector !== "iab" ||
  latestRetryAttempt.outcome !== "BACKEND_UNAVAILABLE" ||
  latestRetryAttempt.inAppBrowserObserved !== false ||
  latestRetryAttempt.unrelatedBrowserObserved !== true ||
  latestRetryAttempt.substitutionUsed !== false ||
  latestRetryAttempt.currentPassClaimed !== false
) {
  throw new Error("RANG_BROWSER_LATEST_IAB_RETRY_CONTRACT");
}

const requiredFreshQa = asRecord(receipt.requiredFreshQa);
const requiredCases = Array.isArray(requiredFreshQa.cases)
  ? requiredFreshQa.cases.map(asRecord)
  : [];
if (
  requiredCases.length !== 12 ||
  new Set(requiredCases.map((entry) => entry.id)).size !== 12 ||
  requiredFreshQa.freshCasesCompleted !== 0
) {
  throw new Error("RANG_BROWSER_PENDING_CASE_MATRIX");
}
for (const width of [320, 390, 1440]) {
  if (
    requiredCases.filter((entry) =>
      Array.isArray(entry.viewport) && Number(entry.viewport[0]) === width,
    ).length !== 4
  ) {
    throw new Error(`RANG_BROWSER_PENDING_VIEWPORT_MATRIX:${width}`);
  }
}

const historicalBinding = asRecord(receipt.historicalEvidence);
const historicalPath = String(historicalBinding.reportPath ?? "");
const historicalBuffer = await readFile(resolve(ROOT, historicalPath));
if (
  historicalBinding.status !== "HISTORICAL_SUPERSEDED_NOT_CURRENT_PASS" ||
  historicalBinding.finalAuthority !== false ||
  historicalBinding.reportSha256 !== sha256(historicalBuffer)
) {
  throw new Error("RANG_BROWSER_HISTORICAL_RECEIPT_BINDING");
}
const historical = asRecord(JSON.parse(historicalBuffer.toString("utf8")));
const historicalCases = Array.isArray(historical.cases)
  ? historical.cases.map(asRecord)
  : [];
if (
  historical.status !== "PASS" ||
  historical.schemaVersion !== "rang-therapy/browser-qa/v6" ||
  historical.corpusSha256 === receipt.corpusSha256 ||
  historicalCases.length !== 12
) {
  throw new Error("RANG_BROWSER_HISTORICAL_NOT_SUPERSEDED");
}
for (const entry of historicalCases) {
  const buffer = await readFile(resolve(ROOT, String(entry.screenshot ?? "")));
  const actualDimensions = dimensions(buffer);
  if (
    entry.imageMagicHex !== PNG_MAGIC_HEX ||
    entry.screenshotSha256 !== sha256(buffer) ||
    JSON.stringify(entry.imageDimensions) !== JSON.stringify(actualDimensions)
  ) {
    throw new Error(`RANG_BROWSER_HISTORICAL_SCREENSHOT_BINDING:${String(entry.id)}`);
  }
}

const retryWorkflow = asRecord(receipt.retryWorkflow);
if (
  !String(retryWorkflow.command ?? "").includes("browser selector `iab`") ||
  !Array.isArray(retryWorkflow.steps) ||
  retryWorkflow.steps.length < 5
) {
  throw new Error("RANG_BROWSER_RETRY_WORKFLOW_MISSING");
}

process.stdout.write(
  `${JSON.stringify({ status: "PENDING_IAB_UNAVAILABLE", currentPassClaimed: false, requiredCases: requiredCases.length, historicalCasesPreserved: historicalCases.length, historicalPngMagic: PNG_MAGIC_HEX })}\n`,
);
