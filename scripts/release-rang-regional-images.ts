import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ACTIVE_REGION_NODES } from "../src/lib/regions";

type JsonRecord = Record<string, unknown>;

export const PLATFORM_KEY = "rang-therapy";
export const PIPELINE_ROOT =
  "/Users/ssm/Documents/Codex/runtome/pipeline/gpt-image-2-region-banners-v1";
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const EXPECTED_ROUTE_COUNT = 1291;
export const EXPECTED_ASSET_COUNT = 130;
export const MAX_ROUTE_REUSE = 10;
export const ROOT_REVIEW_RELATIVE_PATH =
  "reviews/rang-therapy.regional-release-review.v1.json";
export const PENDING_REVIEW_TEMPLATE_RELATIVE_PATH =
  "reviews/templates/rang-therapy.regional-release-review.template.v1.json";
export const ASSIGNMENT_MANIFEST_PATH = resolve(
  PROJECT_ROOT,
  "src/data/regional-image-assignments.generated.json",
);
export const RELEASE_RECEIPT_PATH = resolve(
  PROJECT_ROOT,
  "artifacts/image-release/rang-therapy-regional-release.v1.json",
);
export const PUBLIC_ASSET_ROOT = resolve(
  PROJECT_ROOT,
  "public/assets/rang-therapy/regional",
);

const PNG_MAGIC_HEX = "89504e470d0a1a0a";
const WEBP_PROFILES = {
  desktop: { width: 1600, height: 900 },
  tablet: { width: 1200, height: 675 },
  mobile: { width: 768, height: 432 },
} as const;

type WebpProfileName = keyof typeof WEBP_PROFILES;
type SourceDimensions = { width: number; height: number };

export type RootReviewAsset = {
  jobId: string;
  assetId: string;
  sourceRelativePath: string;
  sourceSha256: string;
  dimensions: string;
  receiptRelativePath: string;
  receiptSha256: string;
  decision: "ACCEPT";
  contactSheet: { relativePath: string; sha256: string };
};

export type SourceEvidence = {
  relativePath: string;
  absolutePath: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
  magicHex: string;
};

export type AssetEvidenceInput = {
  jobId: string;
  job: JsonRecord;
  jobSha256: string;
  claim: JsonRecord;
  claimSha256: string;
  receipt: JsonRecord;
  receiptSha256: string;
  promptSha256: string;
  source: SourceEvidence;
  reviewAsset: RootReviewAsset;
};

type TechnicalEvidence = {
  jobId: string;
  assetId: string;
  jobSha256: string;
  claimSha256: string;
  receiptSha256: string;
  promptSha256: string;
  source: SourceEvidence;
};

type Palette = {
  sourceStrip: {
    topPercent: 18;
    sourceHeightPx: number;
    sampleWidthPx: number;
    sampleHeightPx: number;
  };
  primary: string;
  secondary: string;
  navigation: {
    text: "#ffffff" | "#000000";
    textContrastRatio: number;
    overlay: string;
    gradient:
      | "linear-gradient(180deg, rgba(0, 0, 0, 0.76) 0%, rgba(0, 0, 0, 0.46) 62%, rgba(0, 0, 0, 0) 100%)"
      | "linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.48) 62%, rgba(255, 255, 255, 0) 100%)";
    backdropFilter: "blur(18px)";
  };
};

type ReleasedAsset = TechnicalEvidence & {
  reviewAsset: RootReviewAsset;
  palette: Palette;
  outputs: Record<
    WebpProfileName,
    { publicPath: string; sha256: string; width: number; height: number; bytes: number }
  >;
};

function fail(code: string): never {
  throw new Error(`RANG_IMAGE_RELEASE_${code}`);
}

function asRecord(value: unknown, code: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as JsonRecord;
}

function asArray(value: unknown, code: string): unknown[] {
  if (!Array.isArray(value)) fail(code);
  return value;
}

function stringField(record: JsonRecord, key: string, code: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) fail(code);
  return value;
}

function booleanField(record: JsonRecord, key: string, code: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") fail(code);
  return value;
}

function numberField(record: JsonRecord, key: string, code: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) fail(code);
  return value;
}

function optionalStringField(record: JsonRecord, key: string, code: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) fail(code);
  return value;
}

function optionalBooleanField(
  record: JsonRecord,
  key: string,
  code: string,
): boolean | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") fail(code);
  return value;
}

function optionalNumberField(record: JsonRecord, key: string, code: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) fail(code);
  return value;
}

function optionalRecord(record: JsonRecord, key: string, code: string): JsonRecord | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  return asRecord(value, code);
}

function assertEqual<T>(actual: T, expected: T, code: string) {
  if (actual !== expected) fail(code);
}

function assertTrue(value: boolean, code: string) {
  if (!value) fail(code);
}

function resolvePipelineRelative(relativePath: string, code: string): string {
  if (relativePath.length === 0 || relativePath.startsWith("/")) fail(code);
  const absolutePath = resolve(PIPELINE_ROOT, relativePath);
  if (
    absolutePath !== PIPELINE_ROOT &&
    !absolutePath.startsWith(`${PIPELINE_ROOT}${sep}`)
  ) {
    fail(code);
  }
  return absolutePath;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

async function readRequired(relativePath: string, code: string): Promise<Buffer> {
  const absolutePath = resolvePipelineRelative(relativePath, code);
  try {
    return await readFile(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      fail(`${code}:MISSING:${relativePath}`);
    }
    throw error;
  }
}

async function readJsonRequired(
  relativePath: string,
  code: string,
): Promise<{ value: JsonRecord; sha256: string }> {
  const bytes = await readRequired(relativePath, code);
  try {
    return { value: asRecord(JSON.parse(bytes.toString("utf8")), code), sha256: sha256(bytes) };
  } catch (error) {
    if (error instanceof SyntaxError) fail(`${code}:INVALID_JSON`);
    throw error;
  }
}

export function expectedJobIds(): string[] {
  return Array.from(
    { length: EXPECTED_ASSET_COUNT },
    (_, index) => `rng-rgn-${String(index + 1).padStart(3, "0")}-c01`,
  );
}

export function expectedOriginalRelativePath(jobId: string): string {
  return `originals/rang-therapy/${jobId}.png`;
}

function expectedPromptRelativePath(jobId: string): string {
  return `queue/prompts/${jobId}.txt`;
}

function expectedJobRelativePath(jobId: string): string {
  return `queue/jobs/${jobId}.json`;
}

function expectedClaimRelativePath(jobId: string): string {
  return `claims/by-job/${jobId}.claim.json`;
}

function expectedReceiptRelativePath(jobId: string): string {
  return `receipts/by-job/${jobId}.receipt.json`;
}

function dimensionsText(dimensions: SourceDimensions): string {
  return `${dimensions.width}x${dimensions.height}`;
}

function validateJob(jobId: string, job: JsonRecord): {
  promptRelativePath: string;
  promptSha256: string;
} {
  assertEqual(
    stringField(job, "schemaVersion", `${jobId}:JOB_SCHEMA`),
    "gpt-image-2-region-banner-built-in-job/v2",
    `${jobId}:JOB_SCHEMA`,
  );
  assertEqual(stringField(job, "jobId", `${jobId}:JOB_ID`), jobId, `${jobId}:JOB_ID`);
  assertEqual(
    stringField(job, "assetId", `${jobId}:ASSET_ID`),
    jobId,
    `${jobId}:ASSET_ID`,
  );
  assertEqual(
    stringField(job, "platformKey", `${jobId}:PLATFORM`),
    PLATFORM_KEY,
    `${jobId}:PLATFORM`,
  );
  assertEqual(
    stringField(job, "assetClass", `${jobId}:ASSET_CLASS`),
    "regional-master",
    `${jobId}:ASSET_CLASS`,
  );
  const ordinalMatch = /^rng-rgn-(\d{3})-c01$/.exec(jobId);
  if (!ordinalMatch) fail(`${jobId}:JOB_ID_FORMAT`);
  const ordinal = Number(ordinalMatch[1]);
  const expectedRouteCapacity = ordinal <= 121 ? 10 : 9;
  assertEqual(
    numberField(job, "routeCapacity", `${jobId}:ROUTE_CAPACITY`),
    expectedRouteCapacity,
    `${jobId}:ROUTE_CAPACITY`,
  );
  assertTrue(booleanField(job, "immutable", `${jobId}:IMMUTABLE`), `${jobId}:IMMUTABLE`);

  const execution = asRecord(job.execution, `${jobId}:EXECUTION`);
  assertEqual(
    stringField(execution, "mode", `${jobId}:EXECUTION_MODE`),
    "codex-built-in-image_gen",
    `${jobId}:EXECUTION_MODE`,
  );
  assertEqual(
    stringField(execution, "requestedModelIntent", `${jobId}:MODEL`),
    "gpt-image-2",
    `${jobId}:MODEL`,
  );
  assertEqual(
    stringField(execution, "requestedQualityIntent", `${jobId}:QUALITY`),
    "medium",
    `${jobId}:QUALITY`,
  );
  assertEqual(
    stringField(execution, "outputFormat", `${jobId}:FORMAT`),
    "png",
    `${jobId}:FORMAT`,
  );

  const prompt = asRecord(job.prompt, `${jobId}:PROMPT`);
  const promptRelativePath = stringField(prompt, "relativePath", `${jobId}:PROMPT_PATH`);
  assertEqual(
    promptRelativePath,
    expectedPromptRelativePath(jobId),
    `${jobId}:PROMPT_PATH`,
  );
  const promptSha256 = stringField(prompt, "sha256", `${jobId}:PROMPT_SHA`);

  const output = asRecord(job.output, `${jobId}:OUTPUT`);
  assertEqual(
    stringField(output, "relativePath", `${jobId}:OUTPUT_PATH`),
    expectedOriginalRelativePath(jobId),
    `${jobId}:OUTPUT_PATH`,
  );
  assertTrue(booleanField(output, "noClobber", `${jobId}:OUTPUT_NOCLOBBER`), `${jobId}:OUTPUT_NOCLOBBER`);

  return { promptRelativePath, promptSha256 };
}

function validateClaim(
  jobId: string,
  claim: JsonRecord,
  claimSha256: string,
  jobSha256: string,
  promptSha256: string,
) {
  assertEqual(
    stringField(claim, "schemaVersion", `${jobId}:CLAIM_SCHEMA`),
    "gpt-image-2-region-banner-claim/v1",
    `${jobId}:CLAIM_SCHEMA`,
  );
  assertEqual(stringField(claim, "jobId", `${jobId}:CLAIM_JOB_ID`), jobId, `${jobId}:CLAIM_JOB_ID`);
  const platformKey = optionalStringField(claim, "platformKey", `${jobId}:CLAIM_PLATFORM`);
  if (platformKey !== undefined) assertEqual(platformKey, PLATFORM_KEY, `${jobId}:CLAIM_PLATFORM`);
  const claimedJobSha256 = optionalStringField(claim, "jobSha256", `${jobId}:CLAIM_JOB_SHA`);
  if (claimedJobSha256 !== undefined) {
    assertEqual(claimedJobSha256, jobSha256, `${jobId}:CLAIM_JOB_SHA`);
  }
  const claimedPromptSha256 = optionalStringField(claim, "promptSha256", `${jobId}:CLAIM_PROMPT_SHA`);
  if (claimedPromptSha256 !== undefined) {
    assertEqual(claimedPromptSha256, promptSha256, `${jobId}:CLAIM_PROMPT_SHA`);
  }
  const exampleOnly = optionalBooleanField(claim, "exampleOnly", `${jobId}:CLAIM_EXAMPLE_ONLY`);
  if (exampleOnly !== undefined) assertEqual(exampleOnly, false, `${jobId}:CLAIM_EXAMPLE_ONLY`);
  const immutable = optionalBooleanField(claim, "immutable", `${jobId}:CLAIM_IMMUTABLE`);
  if (immutable !== undefined) assertTrue(immutable, `${jobId}:CLAIM_IMMUTABLE`);
  assertTrue(/^[a-f0-9]{64}$/.test(claimSha256), `${jobId}:CLAIM_FILE_SHA`);
}

type ReceiptSourceBinding = {
  sourcePath: string;
  sourceSha256: string;
  width?: number;
  height?: number;
  mime?: string;
  pngMagic?: string;
};

function parseDimensionsText(value: string, code: string): SourceDimensions {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) fail(code);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function addReceiptBinding(
  bindings: ReceiptSourceBinding[],
  binding: ReceiptSourceBinding,
  jobId: string,
  source: SourceEvidence,
) {
  assertEqual(binding.sourcePath, source.relativePath, `${jobId}:RECEIPT_SOURCE_PATH`);
  assertEqual(binding.sourceSha256, source.sha256, `${jobId}:RECEIPT_SOURCE_SHA`);
  if (binding.width !== undefined) {
    assertEqual(binding.width, source.width, `${jobId}:RECEIPT_SOURCE_WIDTH`);
  }
  if (binding.height !== undefined) {
    assertEqual(binding.height, source.height, `${jobId}:RECEIPT_SOURCE_HEIGHT`);
  }
  if (binding.mime !== undefined) {
    const normalizedMime = binding.mime.toLowerCase();
    if (normalizedMime !== "image/png" && normalizedMime !== "png") {
      fail(`${jobId}:RECEIPT_SOURCE_MIME`);
    }
  }
  if (binding.pngMagic !== undefined) {
    assertEqual(binding.pngMagic, PNG_MAGIC_HEX, `${jobId}:RECEIPT_SOURCE_MAGIC`);
  }
  bindings.push(binding);
}

function collectReceiptSourceBindings(
  jobId: string,
  receipt: JsonRecord,
  source: SourceEvidence,
): ReceiptSourceBinding[] {
  const bindings: ReceiptSourceBinding[] = [];
  const original = optionalRecord(receipt, "original", `${jobId}:RECEIPT_ORIGINAL`);
  if (original) {
    const savedPath = optionalStringField(original, "savedPath", `${jobId}:RECEIPT_SAVED_PATH`);
    if (savedPath !== undefined) {
      assertEqual(savedPath, source.absolutePath, `${jobId}:RECEIPT_SAVED_PATH`);
    }
    addReceiptBinding(
      bindings,
      {
        sourcePath: stringField(original, "relativePath", `${jobId}:RECEIPT_SOURCE_PATH`),
        sourceSha256: stringField(original, "sha256", `${jobId}:RECEIPT_SOURCE_SHA`),
        width: optionalNumberField(original, "width", `${jobId}:RECEIPT_SOURCE_WIDTH`),
        height: optionalNumberField(original, "height", `${jobId}:RECEIPT_SOURCE_HEIGHT`),
        mime: optionalStringField(original, "mime", `${jobId}:RECEIPT_SOURCE_MIME`),
      },
      jobId,
      source,
    );
  }

  const output = optionalRecord(receipt, "output", `${jobId}:RECEIPT_OUTPUT`);
  if (output) {
    const dimensions = optionalRecord(output, "dimensions", `${jobId}:RECEIPT_OUTPUT_DIMENSIONS`);
    addReceiptBinding(
      bindings,
      {
        sourcePath: stringField(output, "relativePath", `${jobId}:RECEIPT_OUTPUT_PATH`),
        sourceSha256: stringField(output, "sha256", `${jobId}:RECEIPT_OUTPUT_SHA`),
        width: dimensions
          ? numberField(dimensions, "width", `${jobId}:RECEIPT_OUTPUT_WIDTH`)
          : optionalNumberField(output, "width", `${jobId}:RECEIPT_OUTPUT_WIDTH`),
        height: dimensions
          ? numberField(dimensions, "height", `${jobId}:RECEIPT_OUTPUT_HEIGHT`)
          : optionalNumberField(output, "height", `${jobId}:RECEIPT_OUTPUT_HEIGHT`),
        mime: optionalStringField(output, "mime", `${jobId}:RECEIPT_OUTPUT_MIME`),
        pngMagic: optionalStringField(output, "pngMagic", `${jobId}:RECEIPT_OUTPUT_MAGIC`),
      },
      jobId,
      source,
    );
  }

  const outputPath = optionalStringField(receipt, "outputPath", `${jobId}:RECEIPT_OUTPUT_PATH`);
  const outputSha256 = optionalStringField(receipt, "sha256", `${jobId}:RECEIPT_OUTPUT_SHA`);
  if (outputPath !== undefined || outputSha256 !== undefined) {
    if (outputPath === undefined || outputSha256 === undefined) {
      fail(`${jobId}:RECEIPT_OUTPUT_BINDING_INCOMPLETE`);
    }
    assertEqual(outputPath, source.absolutePath, `${jobId}:RECEIPT_OUTPUT_PATH`);
    const dimensions = optionalStringField(receipt, "dimensions", `${jobId}:RECEIPT_OUTPUT_DIMENSIONS`);
    const parsedDimensions = dimensions
      ? parseDimensionsText(dimensions, `${jobId}:RECEIPT_OUTPUT_DIMENSIONS`)
      : undefined;
    addReceiptBinding(
      bindings,
      {
        sourcePath: source.relativePath,
        sourceSha256: outputSha256,
        width: parsedDimensions?.width,
        height: parsedDimensions?.height,
        mime: optionalStringField(receipt, "format", `${jobId}:RECEIPT_OUTPUT_FORMAT`),
      },
      jobId,
      source,
    );
  }

  if (bindings.length === 0) fail(`${jobId}:RECEIPT_SOURCE_BINDING_MISSING`);
  return bindings;
}

function assertReceiptTechnicalChecks(jobId: string, receipt: JsonRecord) {
  const technical =
    optionalRecord(receipt, "technicalQa", `${jobId}:TECHNICAL_QA`) ??
    optionalRecord(receipt, "technicalQA", `${jobId}:TECHNICAL_QA`) ??
    optionalRecord(receipt, "technicalChecks", `${jobId}:TECHNICAL_QA`);
  if (!technical) fail(`${jobId}:TECHNICAL_QA_MISSING`);

  const decoded =
    optionalBooleanField(technical, "decoded", `${jobId}:DECODED`) ??
    optionalBooleanField(technical, "decodes", `${jobId}:DECODED`);
  if (decoded !== true) fail(`${jobId}:DECODED`);

  const passed =
    optionalBooleanField(technical, "passed", `${jobId}:TECHNICAL_QA_PASSED`) ??
    optionalBooleanField(technical, "pass", `${jobId}:TECHNICAL_QA_PASSED`) ??
    optionalBooleanField(technical, "singleWideImage", `${jobId}:SINGLE_WIDE_IMAGE`);
  if (passed !== true) fail(`${jobId}:TECHNICAL_QA_PASSED`);

  for (const key of ["mimeVerified", "dimensionsVerified", "sha256Verified"] as const) {
    const value = optionalBooleanField(technical, key, `${jobId}:${key}`);
    if (value !== undefined && value !== true) fail(`${jobId}:${key}`);
  }
}

function validateReceipt(
  jobId: string,
  receipt: JsonRecord,
  receiptSha256: string,
  jobSha256: string,
  claimSha256: string,
  promptSha256: string,
  source: SourceEvidence,
) {
  const schemaVersion = stringField(receipt, "schemaVersion", `${jobId}:RECEIPT_SCHEMA`);
  if (
    schemaVersion !== "gpt-image-2-region-banner-receipt/v1" &&
    schemaVersion !== "gpt-image-2-region-banner-receipt/v2" &&
    schemaVersion !== "gpt-image-2-region-banner-built-in-receipt/v2"
  ) {
    fail(`${jobId}:RECEIPT_SCHEMA`);
  }
  const exampleOnly = optionalBooleanField(receipt, "exampleOnly", `${jobId}:RECEIPT_EXAMPLE_ONLY`);
  if (exampleOnly !== undefined) assertEqual(exampleOnly, false, `${jobId}:RECEIPT_EXAMPLE_ONLY`);
  assertEqual(
    stringField(receipt, "jobId", `${jobId}:RECEIPT_JOB_ID`),
    jobId,
    `${jobId}:RECEIPT_JOB_ID`,
  );
  const receiptJobSha256 = optionalStringField(receipt, "jobSha256", `${jobId}:RECEIPT_JOB_SHA`);
  if (receiptJobSha256 !== undefined) assertEqual(receiptJobSha256, jobSha256, `${jobId}:RECEIPT_JOB_SHA`);
  const receiptClaimSha256 = optionalStringField(receipt, "claimSha256", `${jobId}:RECEIPT_CLAIM_SHA`);
  if (receiptClaimSha256 !== undefined) {
    assertEqual(receiptClaimSha256, claimSha256, `${jobId}:RECEIPT_CLAIM_SHA`);
  }
  const receiptPromptSha256 = optionalStringField(receipt, "promptSha256", `${jobId}:RECEIPT_PROMPT_SHA`);
  if (receiptPromptSha256 !== undefined) {
    assertEqual(receiptPromptSha256, promptSha256, `${jobId}:RECEIPT_PROMPT_SHA`);
  }
  const provider = optionalStringField(receipt, "provider", `${jobId}:RECEIPT_PROVIDER`);
  if (provider !== undefined) {
    assertEqual(provider, "codex-built-in-image_gen", `${jobId}:RECEIPT_PROVIDER`);
  }
  const generationMode = optionalStringField(receipt, "generationMode", `${jobId}:RECEIPT_GENERATION_MODE`);
  if (generationMode !== undefined) {
    assertEqual(generationMode, "codex-built-in-image_gen", `${jobId}:RECEIPT_GENERATION_MODE`);
  }
  const receiptPlatformKey = optionalStringField(receipt, "platformKey", `${jobId}:RECEIPT_PLATFORM`);
  if (receiptPlatformKey !== undefined) {
    assertEqual(receiptPlatformKey, PLATFORM_KEY, `${jobId}:RECEIPT_PLATFORM`);
  }
  const immutable = optionalBooleanField(receipt, "immutable", `${jobId}:RECEIPT_IMMUTABLE`);
  if (immutable !== undefined) assertTrue(immutable, `${jobId}:RECEIPT_IMMUTABLE`);
  assertTrue(/^[a-f0-9]{64}$/.test(receiptSha256), `${jobId}:RECEIPT_FILE_SHA`);
  collectReceiptSourceBindings(jobId, receipt, source);
  assertReceiptTechnicalChecks(jobId, receipt);

  const visualApproval = optionalBooleanField(receipt, "visualApproval", `${jobId}:VISUAL_APPROVAL`);
  if (visualApproval !== undefined && visualApproval !== false) fail(`${jobId}:VISUAL_APPROVAL`);
  const visualQa =
    optionalRecord(receipt, "visualQa", `${jobId}:VISUAL_QA`) ??
    optionalRecord(receipt, "visualQA", `${jobId}:VISUAL_QA`);
  if (visualQa) {
    const technicalOnly = optionalBooleanField(
      visualQa,
      "technicalReceiptIsNotVisualApproval",
      `${jobId}:TECHNICAL_NOT_VISUAL_APPROVAL`,
    );
    if (technicalOnly !== undefined && technicalOnly !== true) {
      fail(`${jobId}:TECHNICAL_NOT_VISUAL_APPROVAL`);
    }
    const visualStatus = optionalStringField(visualQa, "status", `${jobId}:VISUAL_STATUS`);
    if (visualStatus !== undefined && visualStatus !== "NOT_REVIEWED") fail(`${jobId}:VISUAL_STATUS`);
  }
}

function validateReviewAsset(
  jobId: string,
  reviewAsset: RootReviewAsset,
  receiptSha256: string,
  source: SourceEvidence,
) {
  assertEqual(reviewAsset.jobId, jobId, `${jobId}:REVIEW_JOB_ID`);
  assertEqual(reviewAsset.assetId, jobId, `${jobId}:REVIEW_ASSET_ID`);
  assertEqual(
    reviewAsset.sourceRelativePath,
    source.relativePath,
    `${jobId}:REVIEW_SOURCE_PATH`,
  );
  assertEqual(reviewAsset.sourceSha256, source.sha256, `${jobId}:REVIEW_SOURCE_SHA`);
  assertEqual(
    reviewAsset.dimensions,
    dimensionsText(source),
    `${jobId}:REVIEW_DIMENSIONS`,
  );
  assertEqual(
    reviewAsset.receiptRelativePath,
    expectedReceiptRelativePath(jobId),
    `${jobId}:REVIEW_RECEIPT_PATH`,
  );
  assertEqual(
    reviewAsset.receiptSha256,
    receiptSha256,
    `${jobId}:REVIEW_RECEIPT_SHA`,
  );
  assertEqual(reviewAsset.decision, "ACCEPT", `${jobId}:REVIEW_DECISION`);
}

/** Validates physical source provenance; it never treats a technical receipt as visual approval. */
export function validateAssetEvidence(input: AssetEvidenceInput): TechnicalEvidence {
  const { jobId, job, jobSha256, claim, claimSha256, receipt, receiptSha256, promptSha256, source, reviewAsset } = input;
  assertEqual(source.relativePath, expectedOriginalRelativePath(jobId), `${jobId}:SOURCE_PATH`);
  assertEqual(
    source.absolutePath,
    resolvePipelineRelative(source.relativePath, `${jobId}:SOURCE_ABSOLUTE_PATH`),
    `${jobId}:SOURCE_ABSOLUTE_PATH`,
  );
  assertEqual(source.magicHex, PNG_MAGIC_HEX, `${jobId}:SOURCE_MAGIC`);
  assertEqual(source.format, "png", `${jobId}:SOURCE_FORMAT`);
  assertTrue(source.width > 0 && source.height > 0 && source.bytes > 0, `${jobId}:SOURCE_METADATA`);
  assertTrue(/^[a-f0-9]{64}$/.test(source.sha256), `${jobId}:SOURCE_FILE_SHA`);
  assertTrue(/^[a-f0-9]{64}$/.test(jobSha256), `${jobId}:JOB_FILE_SHA`);

  const validatedJob = validateJob(jobId, job);
  assertEqual(validatedJob.promptSha256, promptSha256, `${jobId}:PROMPT_FILE_SHA`);
  validateClaim(jobId, claim, claimSha256, jobSha256, promptSha256);
  validateReceipt(jobId, receipt, receiptSha256, jobSha256, claimSha256, promptSha256, source);
  validateReviewAsset(jobId, reviewAsset, receiptSha256, source);

  return { jobId, assetId: jobId, jobSha256, claimSha256, receiptSha256, promptSha256, source };
}

function parseReviewAsset(value: unknown, jobId: string): RootReviewAsset {
  const asset = asRecord(value, `${jobId}:REVIEW_ASSET`);
  const contactSheet = asRecord(asset.contactSheet, `${jobId}:REVIEW_CONTACT_SHEET`);
  const decision = stringField(asset, "decision", `${jobId}:REVIEW_DECISION`);
  if (decision !== "ACCEPT") fail(`${jobId}:REVIEW_DECISION`);

  return {
    jobId: stringField(asset, "jobId", `${jobId}:REVIEW_JOB_ID`),
    assetId: stringField(asset, "assetId", `${jobId}:REVIEW_ASSET_ID`),
    sourceRelativePath: stringField(asset, "sourceRelativePath", `${jobId}:REVIEW_SOURCE_PATH`),
    sourceSha256: stringField(asset, "sourceSha256", `${jobId}:REVIEW_SOURCE_SHA`),
    dimensions: stringField(asset, "dimensions", `${jobId}:REVIEW_DIMENSIONS`),
    receiptRelativePath: stringField(asset, "receiptRelativePath", `${jobId}:REVIEW_RECEIPT_PATH`),
    receiptSha256: stringField(asset, "receiptSha256", `${jobId}:REVIEW_RECEIPT_SHA`),
    decision,
    contactSheet: {
      relativePath: stringField(contactSheet, "relativePath", `${jobId}:REVIEW_CONTACT_SHEET_PATH`),
      sha256: stringField(contactSheet, "sha256", `${jobId}:REVIEW_CONTACT_SHEET_SHA`),
    },
  };
}

/** A PASS must be written by root and explicitly authorize route assignment. */
export function validateRootReleaseReview(
  review: JsonRecord,
  jobIds: readonly string[],
): Map<string, RootReviewAsset> {
  assertEqual(
    stringField(review, "schemaVersion", "REVIEW_SCHEMA"),
    "rang-therapy-regional-release-review/v1",
    "REVIEW_SCHEMA",
  );
  assertEqual(
    stringField(review, "platformKey", "REVIEW_PLATFORM"),
    PLATFORM_KEY,
    "REVIEW_PLATFORM",
  );
  assertEqual(stringField(review, "status", "REVIEW_STATUS"), "PASS", "REVIEW_STATUS");
  assertEqual(stringField(review, "reviewer", "REVIEW_REVIEWER"), "root", "REVIEW_REVIEWER");
  assertEqual(stringField(review, "authoredBy", "REVIEW_AUTHORED_BY"), "root", "REVIEW_AUTHORED_BY");
  stringField(review, "reviewedAt", "REVIEWED_AT");
  assertTrue(
    booleanField(review, "routeAssignmentAuthorized", "REVIEW_ASSIGNMENT_AUTHORIZATION"),
    "REVIEW_ASSIGNMENT_AUTHORIZATION",
  );

  const assets = asArray(review.assets, "REVIEW_ASSETS");
  assertEqual(assets.length, jobIds.length, "REVIEW_ASSET_COUNT");
  const assetByJob = new Map<string, RootReviewAsset>();
  for (const value of assets) {
    const raw = asRecord(value, "REVIEW_ASSET");
    const jobId = stringField(raw, "jobId", "REVIEW_ASSET_JOB_ID");
    if (!jobIds.includes(jobId) || assetByJob.has(jobId)) fail(`REVIEW_ASSET_SET:${jobId}`);
    assetByJob.set(jobId, parseReviewAsset(raw, jobId));
  }

  for (const jobId of jobIds) {
    if (!assetByJob.has(jobId)) fail(`REVIEW_ASSET_MISSING:${jobId}`);
  }
  return assetByJob;
}

async function verifyReviewContactSheets(assets: Iterable<RootReviewAsset>) {
  const checked = new Set<string>();
  for (const asset of assets) {
    const { relativePath, sha256: expectedSha256 } = asset.contactSheet;
    if (!relativePath.startsWith("reviews/rang-therapy/contact-sheets/")) {
      fail(`${asset.jobId}:CONTACT_SHEET_LOCATION`);
    }
    const identity = `${relativePath}:${expectedSha256}`;
    if (checked.has(identity)) continue;
    checked.add(identity);
    const bytes = await readRequired(relativePath, `${asset.jobId}:CONTACT_SHEET`);
    assertEqual(sha256(bytes), expectedSha256, `${asset.jobId}:CONTACT_SHEET_SHA`);
  }
}

async function loadRootReview(jobIds: readonly string[]) {
  const { value, sha256: reviewSha256 } = await readJsonRequired(
    ROOT_REVIEW_RELATIVE_PATH,
    "ROOT_REVIEW",
  );
  const assets = validateRootReleaseReview(value, jobIds);
  await verifyReviewContactSheets(assets.values());
  return { review: value, reviewSha256, assets };
}

async function assertAllExpectedOriginals(jobIds: readonly string[]) {
  const missing: string[] = [];
  for (const jobId of jobIds) {
    const relativePath = expectedOriginalRelativePath(jobId);
    try {
      const info = await stat(resolvePipelineRelative(relativePath, `${jobId}:ORIGINAL_PATH`));
      if (!info.isFile()) missing.push(jobId);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") missing.push(jobId);
      else throw error;
    }
  }
  if (missing.length > 0) {
    fail(
      `EXPECTED_130_ORIGINALS_INCOMPLETE:${jobIds.length - missing.length}/${jobIds.length}:MISSING=${missing.join(",")}`,
    );
  }
}

async function loadSourceEvidence(jobId: string): Promise<{ source: SourceEvidence; bytes: Buffer }> {
  const relativePath = expectedOriginalRelativePath(jobId);
  const bytes = await readRequired(relativePath, `${jobId}:SOURCE`);
  const metadata = await sharp(bytes, { failOn: "error" }).metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height || metadata.format !== "png") fail(`${jobId}:SOURCE_DECODE`);

  return {
    source: {
      relativePath,
      absolutePath: resolvePipelineRelative(relativePath, `${jobId}:SOURCE_PATH`),
      sha256: sha256(bytes),
      bytes: bytes.length,
      width,
      height,
      format: metadata.format,
      magicHex: bytes.subarray(0, 8).toString("hex"),
    },
    bytes,
  };
}

async function loadTechnicalEvidence(
  jobId: string,
  reviewAsset: RootReviewAsset,
): Promise<{ technical: TechnicalEvidence; sourceBytes: Buffer }> {
  const jobDocument = await readJsonRequired(expectedJobRelativePath(jobId), `${jobId}:JOB`);
  const claimDocument = await readJsonRequired(expectedClaimRelativePath(jobId), `${jobId}:CLAIM`);
  const receiptDocument = await readJsonRequired(expectedReceiptRelativePath(jobId), `${jobId}:RECEIPT`);
  const validatedJob = validateJob(jobId, jobDocument.value);
  const promptBytes = await readRequired(validatedJob.promptRelativePath, `${jobId}:PROMPT`);
  const sourceResult = await loadSourceEvidence(jobId);
  const technical = validateAssetEvidence({
    jobId,
    job: jobDocument.value,
    jobSha256: jobDocument.sha256,
    claim: claimDocument.value,
    claimSha256: claimDocument.sha256,
    receipt: receiptDocument.value,
    receiptSha256: receiptDocument.sha256,
    promptSha256: sha256(promptBytes),
    source: sourceResult.source,
    reviewAsset,
  });
  return { technical, sourceBytes: sourceResult.bytes };
}

type PendingReviewAsset = Omit<RootReviewAsset, "decision" | "contactSheet"> & {
  decision: "PENDING";
  contactSheet: null;
};

export function createPendingReviewTemplate(
  assets: readonly PendingReviewAsset[],
): JsonRecord {
  return {
    schemaVersion: "rang-therapy-regional-release-review/v1",
    platformKey: PLATFORM_KEY,
    status: "PENDING_ROOT_VISUAL_REVIEW",
    reviewer: null,
    authoredBy: "rang-regional-release-tool-template",
    reviewedAt: null,
    routeAssignmentAuthorized: false,
    requiredReview: {
      rootMustIndependentlyInspectAllAcceptedSources: true,
      sourceAndReceiptHashesMustRemainExact: true,
      paletteBandReview: "top_18_percent",
      noAutomaticVisualPass: true,
    },
    assets,
    note:
      "This is a pending template, not visual approval. After independent human review, root must set reviewer and authoredBy to root, status to PASS, routeAssignmentAuthorized to true, give each asset decision ACCEPT, and record its verified contact-sheet path and SHA-256. The release script rejects this template unchanged.",
  };
}

async function buildPendingReviewAssets(jobIds: readonly string[]): Promise<PendingReviewAsset[]> {
  await assertAllExpectedOriginals(jobIds);
  const assets: PendingReviewAsset[] = [];
  for (const jobId of jobIds) {
    const jobDocument = await readJsonRequired(expectedJobRelativePath(jobId), `${jobId}:JOB`);
    const claimDocument = await readJsonRequired(expectedClaimRelativePath(jobId), `${jobId}:CLAIM`);
    const receiptDocument = await readJsonRequired(expectedReceiptRelativePath(jobId), `${jobId}:RECEIPT`);
    const validatedJob = validateJob(jobId, jobDocument.value);
    const promptBytes = await readRequired(validatedJob.promptRelativePath, `${jobId}:PROMPT`);
    const sourceResult = await loadSourceEvidence(jobId);
    const source = sourceResult.source;

    validateClaim(
      jobId,
      claimDocument.value,
      claimDocument.sha256,
      jobDocument.sha256,
      sha256(promptBytes),
    );
    validateReceipt(
      jobId,
      receiptDocument.value,
      receiptDocument.sha256,
      jobDocument.sha256,
      claimDocument.sha256,
      sha256(promptBytes),
      source,
    );

    assets.push({
      jobId,
      assetId: jobId,
      sourceRelativePath: source.relativePath,
      sourceSha256: source.sha256,
      dimensions: dimensionsText(source),
      receiptRelativePath: expectedReceiptRelativePath(jobId),
      receiptSha256: receiptDocument.sha256,
      decision: "PENDING",
      contactSheet: null,
    });
  }
  return assets;
}

/** Creates an output once; later runs may only reproduce byte-identical output. */
export async function writeExactOrCreate(absolutePath: string, bytes: Buffer) {
  await mkdir(dirname(absolutePath), { recursive: true });
  try {
    await writeFile(absolutePath, bytes, { flag: "wx" });
    return "created" as const;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(absolutePath);
    if (!existing.equals(bytes)) {
      fail(`NO_CLOBBER_OUTPUT:${relative(PROJECT_ROOT, absolutePath)}`);
    }
    return "idempotent" as const;
  }
}

async function writePendingReviewTemplate() {
  const jobIds = expectedJobIds();
  const assets = await buildPendingReviewAssets(jobIds);
  const result = await writeExactOrCreate(
    resolvePipelineRelative(
      PENDING_REVIEW_TEMPLATE_RELATIVE_PATH,
      "PENDING_REVIEW_TEMPLATE_PATH",
    ),
    jsonBytes(createPendingReviewTemplate(assets)),
  );
  process.stdout.write(
    `RANG_IMAGE_RELEASE_PENDING_REVIEW_TEMPLATE_${result.toUpperCase()}:${PENDING_REVIEW_TEMPLATE_RELATIVE_PATH}\n`,
  );
}

function rgbToHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(rgb: [number, number, number]): number {
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(left: [number, number, number], right: [number, number, number]) {
  const [light, dark] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function distance(left: [number, number, number], right: [number, number, number]) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2,
  );
}

function darken(rgb: [number, number, number], amount: number): [number, number, number] {
  return rgb.map((channel) => Math.round(channel * (1 - amount))) as [
    number,
    number,
    number,
  ];
}

async function sampleTopPalette(sourceBytes: Buffer, source: SourceEvidence): Promise<Palette> {
  const sourceHeightPx = Math.max(1, Math.floor(source.height * 0.18));
  const sampleWidthPx = 64;
  const sampleHeightPx = 16;
  const { data, info } = await sharp(sourceBytes, { failOn: "error" })
    .extract({ left: 0, top: 0, width: source.width, height: sourceHeightPx })
    .resize({ width: sampleWidthPx, height: sampleHeightPx, fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3 || data.length !== sampleWidthPx * sampleHeightPx * 3) {
    fail(`${source.relativePath}:TOP_PALETTE_SAMPLE`);
  }

  const counts = new Map<string, number>();
  for (let index = 0; index < data.length; index += 3) {
    const rgb: [number, number, number] = [
      data[index] & 0xe0,
      data[index + 1] & 0xe0,
      data[index + 2] & 0xe0,
    ];
    const key = rgb.join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .map(([key, count]) => ({
      rgb: key.split(",").map(Number) as [number, number, number],
      count,
    }))
    .sort((left, right) => right.count - left.count || rgbToHex(left.rgb).localeCompare(rgbToHex(right.rgb)));
  const primaryRgb = ranked[0]?.rgb;
  if (!primaryRgb) fail(`${source.relativePath}:TOP_PALETTE_EMPTY`);
  const secondaryRgb =
    ranked.find((candidate) => distance(candidate.rgb, primaryRgb) >= 48)?.rgb ??
    darken(primaryRgb, 0.25);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const whiteContrast = contrastRatio(primaryRgb, white);
  const blackContrast = contrastRatio(primaryRgb, black);
  const useWhite = whiteContrast >= blackContrast;
  const selectedContrast = useWhite ? whiteContrast : blackContrast;
  if (selectedContrast < 4.5) fail(`${source.relativePath}:TOP_PALETTE_CONTRAST`);

  return {
    sourceStrip: { topPercent: 18, sourceHeightPx, sampleWidthPx, sampleHeightPx },
    primary: rgbToHex(primaryRgb),
    secondary: rgbToHex(secondaryRgb),
    navigation: {
      text: useWhite ? "#ffffff" : "#000000",
      textContrastRatio: Number(selectedContrast.toFixed(4)),
      overlay: rgbToHex(darken(primaryRgb, useWhite ? 0.52 : 0.12)),
      gradient: useWhite
        ? "linear-gradient(180deg, rgba(0, 0, 0, 0.76) 0%, rgba(0, 0, 0, 0.46) 62%, rgba(0, 0, 0, 0) 100%)"
        : "linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.48) 62%, rgba(255, 255, 255, 0) 100%)",
      backdropFilter: "blur(18px)",
    },
  };
}

async function deriveWebp(
  sourceBytes: Buffer,
  profile: (typeof WEBP_PROFILES)[WebpProfileName],
): Promise<Buffer> {
  return sharp(sourceBytes, { failOn: "error" })
    .resize({ width: profile.width, height: profile.height, fit: "cover", position: "north" })
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toBuffer();
}

export function planRouteAssignments(
  routes: readonly string[],
  assetIds: readonly string[],
): Map<string, string> {
  if (routes.length !== EXPECTED_ROUTE_COUNT) fail(`ROUTE_COUNT:${routes.length}`);
  if (new Set(routes).size !== EXPECTED_ROUTE_COUNT) fail("ROUTE_SET_DUPLICATE");
  if (assetIds.length !== EXPECTED_ASSET_COUNT || new Set(assetIds).size !== EXPECTED_ASSET_COUNT) {
    fail(`ASSET_SET:${assetIds.length}`);
  }

  const assignments = new Map<string, string>();
  let routeIndex = 0;
  for (const [assetIndex, assetId] of assetIds.entries()) {
    const capacity = assetIndex < 121 ? 10 : 9;
    for (let count = 0; count < capacity; count += 1) {
      const route = routes[routeIndex];
      if (!route) fail("ROUTE_ASSIGNMENT_UNDERFLOW");
      assignments.set(route, assetId);
      routeIndex += 1;
    }
  }
  if (routeIndex !== EXPECTED_ROUTE_COUNT || assignments.size !== EXPECTED_ROUTE_COUNT) {
    fail("ROUTE_ASSIGNMENT_INCOMPLETE");
  }
  const reuseCounts = [...assignments.values()].reduce(
    (counts, assetId) => counts.set(assetId, (counts.get(assetId) ?? 0) + 1),
    new Map<string, number>(),
  );
  if ([...reuseCounts.values()].some((count) => count > MAX_ROUTE_REUSE)) {
    fail("ROUTE_ASSIGNMENT_MAX_REUSE");
  }
  return assignments;
}

function outputPublicPath(assetId: string, profileName: WebpProfileName): string {
  return `/assets/rang-therapy/regional/${assetId}/${profileName}.webp`;
}

async function processAsset(
  technical: TechnicalEvidence,
  reviewAsset: RootReviewAsset,
  sourceBytes: Buffer,
): Promise<ReleasedAsset> {
  const palette = await sampleTopPalette(sourceBytes, technical.source);
  const outputs = {} as ReleasedAsset["outputs"];
  for (const profileName of Object.keys(WEBP_PROFILES) as WebpProfileName[]) {
    const profile = WEBP_PROFILES[profileName];
    const webp = await deriveWebp(sourceBytes, profile);
    const metadata = await sharp(webp, { failOn: "error" }).metadata();
    if (metadata.format !== "webp" || metadata.width !== profile.width || metadata.height !== profile.height) {
      fail(`${technical.jobId}:DERIVED_${profileName.toUpperCase()}_METADATA`);
    }
    const publicPath = outputPublicPath(technical.assetId, profileName);
    const outputPath = resolve(PUBLIC_ASSET_ROOT, technical.assetId, `${profileName}.webp`);
    await writeExactOrCreate(outputPath, webp);
    outputs[profileName] = {
      publicPath,
      sha256: sha256(webp),
      width: profile.width,
      height: profile.height,
      bytes: webp.length,
    };
  }

  const releasedAsset: ReleasedAsset = { ...technical, reviewAsset, palette, outputs };
  const provenance = {
    schemaVersion: "rang-therapy-regional-image-provenance/v1",
    platformKey: PLATFORM_KEY,
    jobId: releasedAsset.jobId,
    assetId: releasedAsset.assetId,
    rootReview: {
      reviewPath: ROOT_REVIEW_RELATIVE_PATH,
      reviewer: "root",
      sourceDecision: "ACCEPT",
      contactSheet: reviewAsset.contactSheet,
    },
    source: {
      relativePath: releasedAsset.source.relativePath,
      sha256: releasedAsset.source.sha256,
      dimensions: dimensionsText(releasedAsset.source),
      bytes: releasedAsset.source.bytes,
      receiptRelativePath: expectedReceiptRelativePath(releasedAsset.jobId),
      receiptSha256: releasedAsset.receiptSha256,
      jobSha256: releasedAsset.jobSha256,
      claimSha256: releasedAsset.claimSha256,
      promptSha256: releasedAsset.promptSha256,
    },
    palette: releasedAsset.palette,
    derivatives: releasedAsset.outputs,
  };
  await writeExactOrCreate(
    resolve(PUBLIC_ASSET_ROOT, technical.assetId, "provenance.json"),
    jsonBytes(provenance),
  );
  return releasedAsset;
}

function buildAssignmentManifest(
  releasedAssets: readonly ReleasedAsset[],
  reviewSha256: string,
) {
  const routes = ACTIVE_REGION_NODES.map((node) => node.path);
  if (routes.length !== EXPECTED_ROUTE_COUNT) fail(`ACTIVE_REGION_ROUTE_COUNT:${routes.length}`);
  const assetIds = releasedAssets.map((asset) => asset.assetId);
  const assignments = planRouteAssignments(routes, assetIds);
  const releasedByAsset = new Map(releasedAssets.map((asset) => [asset.assetId, asset]));
  const routeEntries = Object.fromEntries(
    routes.map((route) => {
      const assetId = assignments.get(route);
      if (!assetId) fail(`ROUTE_ASSIGNMENT_MISSING:${route}`);
      const asset = releasedByAsset.get(assetId);
      if (!asset) fail(`ROUTE_ASSET_MISSING:${route}`);
      return [
        route,
        {
          assetId,
          jobId: asset.jobId,
          sources: {
            desktop: asset.outputs.desktop.publicPath,
            tablet: asset.outputs.tablet.publicPath,
            mobile: asset.outputs.mobile.publicPath,
          },
          palette: asset.palette,
          provenance: `/assets/rang-therapy/regional/${assetId}/provenance.json`,
        },
      ];
    }),
  );
  const reuse = [...assignments.values()].reduce(
    (counts, assetId) => counts.set(assetId, (counts.get(assetId) ?? 0) + 1),
    new Map<string, number>(),
  );
  const distribution = {
    routes: routes.length,
    assets: assetIds.length,
    maxReuse: Math.max(...reuse.values()),
    assetsAtTen: [...reuse.values()].filter((value) => value === 10).length,
    assetsAtNine: [...reuse.values()].filter((value) => value === 9).length,
  };
  if (
    distribution.maxReuse !== 10 ||
    distribution.assetsAtTen !== 121 ||
    distribution.assetsAtNine !== 9
  ) {
    fail("ROUTE_ASSIGNMENT_DISTRIBUTION");
  }

  return {
    schemaVersion: "rang-therapy-regional-image-assignments/v1",
    status: "ROOT_APPROVED_RELEASED",
    platformKey: PLATFORM_KEY,
    rootReview: {
      relativePath: ROOT_REVIEW_RELATIVE_PATH,
      sha256: reviewSha256,
      reviewer: "root",
      routeAssignmentAuthorized: true,
    },
    derivativeProfiles: WEBP_PROFILES,
    paletteSource: { strip: "top_18_percent_of_accepted_banner", topPercent: 18 },
    distribution,
    routes: routeEntries,
  };
}

async function release() {
  const jobIds = expectedJobIds();
  await assertAllExpectedOriginals(jobIds);
  const rootReview = await loadRootReview(jobIds);

  const preflight: Array<{
    technical: TechnicalEvidence;
    sourceBytes: Buffer;
    reviewAsset: RootReviewAsset;
  }> = [];
  for (const jobId of jobIds) {
    const reviewAsset = rootReview.assets.get(jobId);
    if (!reviewAsset) fail(`ROOT_REVIEW_ASSET_MISSING:${jobId}`);
    const evidence = await loadTechnicalEvidence(jobId, reviewAsset);
    preflight.push({ ...evidence, reviewAsset });
  }

  const releasedAssets: ReleasedAsset[] = [];
  for (const item of preflight) {
    releasedAssets.push(
      await processAsset(item.technical, item.reviewAsset, item.sourceBytes),
    );
  }

  const assignmentManifest = buildAssignmentManifest(releasedAssets, rootReview.reviewSha256);
  await writeExactOrCreate(ASSIGNMENT_MANIFEST_PATH, jsonBytes(assignmentManifest));
  await writeExactOrCreate(
    RELEASE_RECEIPT_PATH,
    jsonBytes({
      schemaVersion: "rang-therapy-regional-image-release-receipt/v1",
      status: "ROOT_APPROVED_RELEASED",
      platformKey: PLATFORM_KEY,
      assignmentManifest: {
        relativePath: relative(PROJECT_ROOT, ASSIGNMENT_MANIFEST_PATH),
        sha256: sha256(jsonBytes(assignmentManifest)),
      },
      rootReview: {
        relativePath: ROOT_REVIEW_RELATIVE_PATH,
        sha256: rootReview.reviewSha256,
        reviewer: "root",
      },
      distribution: assignmentManifest.distribution,
      sourceAssets: releasedAssets.map((asset) => ({
        jobId: asset.jobId,
        assetId: asset.assetId,
        sourceSha256: asset.source.sha256,
        sourceDimensions: dimensionsText(asset.source),
        provenance: `public/assets/rang-therapy/regional/${asset.assetId}/provenance.json`,
      })),
    }),
  );
  process.stdout.write(
    `RANG_IMAGE_RELEASE_COMPLETE:${releasedAssets.length}_ASSETS:${assignmentManifest.distribution.routes}_ROUTES\n`,
  );
}

function usage() {
  return [
    "Usage:",
    "  pnpm rang:images:template  # validates all 130 technical receipts and writes a non-PASS review template",
    "  pnpm rang:images:release   # only after root authors the PASS release review JSON",
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) fail(`USAGE\n${usage()}`);
  if (args[0] === "--write-pending-review-template") {
    await writePendingReviewTemplate();
    return;
  }
  if (args[0] === "--release") {
    await release();
    return;
  }
  fail(`USAGE\n${usage()}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
