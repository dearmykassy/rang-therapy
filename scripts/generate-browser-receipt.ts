import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PNG_MAGIC_HEX = "89504e470d0a1a0a";
const HISTORICAL_REPORT_PATH =
  "qa/browser/history/946120f03bbab8cf/report.pass.v6.json";

const REQUIRED_CASES = [
  { id: "home-320", kind: "home", path: "/", viewport: [320, 844] },
  { id: "home-390", kind: "home", path: "/", viewport: [390, 844] },
  { id: "home-1440", kind: "home", path: "/", viewport: [1440, 1000] },
  { id: "seoul-root-320", kind: "root", path: "/areas/seoul/", viewport: [320, 844] },
  { id: "seoul-root-390", kind: "root", path: "/areas/seoul/", viewport: [390, 844] },
  { id: "seoul-root-1440", kind: "root", path: "/areas/seoul/", viewport: [1440, 1000] },
  { id: "gangnam-hub-320", kind: "hub", path: "/areas/seoul/%EA%B0%95%EB%82%A8%EA%B5%AC/", viewport: [320, 844] },
  { id: "gangnam-hub-390", kind: "hub", path: "/areas/seoul/%EA%B0%95%EB%82%A8%EA%B5%AC/", viewport: [390, 844] },
  { id: "gangnam-hub-1440", kind: "hub", path: "/areas/seoul/%EA%B0%95%EB%82%A8%EA%B5%AC/", viewport: [1440, 1000] },
  { id: "hwabuk-leaf-320", kind: "representative", path: "/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%ED%99%94%EB%B6%81%EB%8F%99/", viewport: [320, 844] },
  { id: "hwabuk-leaf-390", kind: "representative", path: "/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%ED%99%94%EB%B6%81%EB%8F%99/", viewport: [390, 844] },
  { id: "hwabuk-leaf-1440", kind: "representative", path: "/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C/%ED%99%94%EB%B6%81%EB%8F%99/", viewport: [1440, 1000] },
] as const;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pngDimensions(buffer: Buffer): [number, number] {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== PNG_MAGIC_HEX
  ) {
    throw new Error("RANG_BROWSER_HISTORICAL_SCREENSHOT_NOT_REAL_PNG");
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

const corpusBuffer = await readFile(resolve(ROOT, "artifacts/content-corpus.json"));
const corpus = asRecord(JSON.parse(corpusBuffer.toString("utf8")));
const historicalBuffer = await readFile(resolve(ROOT, HISTORICAL_REPORT_PATH));
const historical = asRecord(JSON.parse(historicalBuffer.toString("utf8")));
const historicalCases = Array.isArray(historical.cases)
  ? historical.cases.map(asRecord)
  : [];

if (
  historical.schemaVersion !== "rang-therapy/browser-qa/v6" ||
  historical.status !== "PASS" ||
  historical.corpusSha256 !==
    "946120f03bbab8cf015def84dc5d68f84de1cbba919f941665f236e8a99a6d52" ||
  historicalCases.length !== 12
) {
  throw new Error("RANG_BROWSER_HISTORICAL_RECEIPT_SHAPE");
}

for (const entry of historicalCases) {
  const screenshot = String(entry.screenshot ?? "");
  const buffer = await readFile(resolve(ROOT, screenshot));
  const dimensions = pngDimensions(buffer);
  if (
    entry.imageMagicHex !== PNG_MAGIC_HEX ||
    entry.screenshotSha256 !== sha256(buffer) ||
    JSON.stringify(entry.imageDimensions) !== JSON.stringify(dimensions)
  ) {
    throw new Error(`RANG_BROWSER_HISTORICAL_BINDING:${String(entry.id)}`);
  }
}

const receipt = {
  schemaVersion: "rang-therapy/browser-qa/v7",
  status: "PENDING_IAB_UNAVAILABLE",
  verdict: "PENDING",
  platformId: "rang-therapy",
  corpusSha256: sha256(corpusBuffer),
  sourceManifestSha256: corpus.sourceManifestSha256,
  finalReleaseEligible: false,
  blocker: {
    code: "IN_APP_BROWSER_BACKEND_UNAVAILABLE",
    browserConstraint: "IN_APP_BROWSER_ONLY",
    substitutionAllowed: false,
    forbiddenSubstitutes: ["standalone Playwright", "Chrome extension", "Computer Use"],
  },
  latestRetryAttempt: {
    attemptedAt: "2026-08-14T14:21:18Z",
    selector: "iab",
    outcome: "BACKEND_UNAVAILABLE",
    inAppBrowserObserved: false,
    unrelatedBrowserObserved: true,
    substitutionUsed: false,
    currentPassClaimed: false,
  },
  historicalEvidence: {
    status: "HISTORICAL_SUPERSEDED_NOT_CURRENT_PASS",
    reportPath: HISTORICAL_REPORT_PATH,
    reportSha256: sha256(historicalBuffer),
    corpusSha256: historical.corpusSha256,
    sourceManifestSha256: historical.sourceManifestSha256,
    cases: historicalCases.length,
    realPngMagic: PNG_MAGIC_HEX,
    finalAuthority: false,
  },
  requiredFreshQa: {
    cases: REQUIRED_CASES,
    assertions: [
      "real PNG magic, IHDR dimensions, and SHA binding",
      "horizontal overflow 0",
      "sticky header before and after scroll",
      "mobile menu 2 columns with minimum 48px targets",
      "mobile region cards 2 columns and desktop cards 4 columns",
      "heading hierarchy, tel CTA exact label, role-forbidden text 0",
      "console, page, network, broken-image errors 0",
    ],
    freshCasesCompleted: 0,
  },
  retryWorkflow: {
    trigger: "in-app Browser backend becomes available",
    command: "Retry this task with the Browser skill and browser selector `iab`; do not substitute Chrome or standalone Playwright.",
    steps: [
      "Build the exact current corpus and static export.",
      "Start a temporary local static server and bind the in-app Browser.",
      "Run home, root, hub, and representative routes at 320, 390, and 1440 widths.",
      "Capture 12 new no-clobber PNGs and bind their magic, dimensions, SHA, metrics, console, and network results.",
      "Replace this PENDING receipt only when every current-corpus assertion passes, then stop the server and close QA tabs.",
    ],
  },
};

await writeFile(
  resolve(ROOT, "qa/browser/report.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `${JSON.stringify({ status: receipt.status, verdict: receipt.verdict, corpusSha256: receipt.corpusSha256, freshCasesCompleted: 0, requiredCases: REQUIRED_CASES.length })}\n`,
);
