import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_ASSET_COUNT,
  EXPECTED_ROUTE_COUNT,
  PIPELINE_ROOT,
  createPendingReviewTemplate,
  expectedJobIds,
  expectedOriginalRelativePath,
  planRouteAssignments,
  validateAssetEvidence,
  validateRootReleaseReview,
  writeExactOrCreate,
  type AssetEvidenceInput,
  type RootReviewAsset,
} from "../scripts/release-rang-regional-images";

const HEX = (value: string) => createHash("sha256").update(value).digest("hex");
const JOB_ID = "rng-rgn-001-c01";
const SOURCE_RELATIVE_PATH = expectedOriginalRelativePath(JOB_ID);
const SOURCE_SHA256 = HEX("source");
const RECEIPT_SHA256 = HEX("receipt");
const CLAIM_SHA256 = HEX("claim");
const JOB_SHA256 = HEX("job");
const PROMPT_SHA256 = HEX("prompt");

function rootAsset(): RootReviewAsset {
  return {
    jobId: JOB_ID,
    assetId: JOB_ID,
    sourceRelativePath: SOURCE_RELATIVE_PATH,
    sourceSha256: SOURCE_SHA256,
    dimensions: "1672x941",
    receiptRelativePath: `receipts/by-job/${JOB_ID}.receipt.json`,
    receiptSha256: RECEIPT_SHA256,
    decision: "ACCEPT",
    contactSheet: {
      relativePath: "reviews/rang-therapy/contact-sheets/rang-therapy-batch-001.png",
      sha256: HEX("contact-sheet"),
    },
  };
}

function baseInput(receipt: Record<string, unknown>): AssetEvidenceInput {
  return {
    jobId: JOB_ID,
    job: {
      schemaVersion: "gpt-image-2-region-banner-built-in-job/v2",
      jobId: JOB_ID,
      assetId: JOB_ID,
      platformKey: "rang-therapy",
      assetClass: "regional-master",
      routeCapacity: 10,
      immutable: true,
      execution: {
        mode: "codex-built-in-image_gen",
        requestedModelIntent: "gpt-image-2",
        requestedQualityIntent: "medium",
        outputFormat: "png",
      },
      prompt: {
        relativePath: `queue/prompts/${JOB_ID}.txt`,
        sha256: PROMPT_SHA256,
      },
      output: { relativePath: SOURCE_RELATIVE_PATH, noClobber: true },
    },
    jobSha256: JOB_SHA256,
    claim: {
      schemaVersion: "gpt-image-2-region-banner-claim/v1",
      jobId: JOB_ID,
      jobSha256: JOB_SHA256,
      promptSha256: PROMPT_SHA256,
    },
    claimSha256: CLAIM_SHA256,
    receipt,
    receiptSha256: RECEIPT_SHA256,
    promptSha256: PROMPT_SHA256,
    source: {
      relativePath: SOURCE_RELATIVE_PATH,
      absolutePath: `${PIPELINE_ROOT}/${SOURCE_RELATIVE_PATH}`,
      sha256: SOURCE_SHA256,
      bytes: 1_670_000,
      width: 1672,
      height: 941,
      format: "png",
      magicHex: "89504e470d0a1a0a",
    },
    reviewAsset: rootAsset(),
  };
}

function receiptFor(kind: "original" | "output" | "top-level") {
  const base = {
    schemaVersion: "gpt-image-2-region-banner-receipt/v1",
    jobId: JOB_ID,
    jobSha256: JOB_SHA256,
    claimSha256: CLAIM_SHA256,
    promptSha256: PROMPT_SHA256,
  };
  if (kind === "original") {
    return {
      ...base,
      original: {
        relativePath: SOURCE_RELATIVE_PATH,
        sha256: SOURCE_SHA256,
        width: 1672,
        height: 941,
        mime: "image/png",
      },
      technicalQa: { decoded: true, passed: true },
    };
  }
  if (kind === "output") {
    return {
      ...base,
      output: {
        relativePath: SOURCE_RELATIVE_PATH,
        sha256: SOURCE_SHA256,
        dimensions: { width: 1672, height: 941 },
        mime: "image/png",
        pngMagic: "89504e470d0a1a0a",
      },
      technicalQA: { decoded: true, pass: true },
      visualQA: { status: "NOT_REVIEWED" },
    };
  }
  return {
    ...base,
    outputPath: `${PIPELINE_ROOT}/${SOURCE_RELATIVE_PATH}`,
    sha256: SOURCE_SHA256,
    dimensions: "1672x941",
    format: "PNG",
    technicalChecks: { decodes: true, singleWideImage: true },
    visualApproval: false,
  };
}

describe("Rang regional image release gate", () => {
  it("plans exactly 121×10 plus 9×9 route assignments", () => {
    const routes = Array.from({ length: EXPECTED_ROUTE_COUNT }, (_, index) => `/areas/test-${index}/`);
    const assignments = planRouteAssignments(routes, expectedJobIds());
    const reuse = [...assignments.values()].reduce(
      (counts, assetId) => counts.set(assetId, (counts.get(assetId) ?? 0) + 1),
      new Map<string, number>(),
    );

    expect(assignments).toHaveLength(EXPECTED_ROUTE_COUNT);
    expect(reuse).toHaveLength(EXPECTED_ASSET_COUNT);
    expect([...reuse.values()].filter((count) => count === 10)).toHaveLength(121);
    expect([...reuse.values()].filter((count) => count === 9)).toHaveLength(9);
    expect(Math.max(...reuse.values())).toBe(10);
  });

  it("requires an explicit root-authored PASS before a review can release routes", () => {
    const asset = rootAsset();
    const pending = {
      schemaVersion: "rang-therapy-regional-release-review/v1",
      platformKey: "rang-therapy",
      status: "PASS",
      reviewer: "root",
      authoredBy: "root",
      reviewedAt: "2026-08-15T00:00:00Z",
      routeAssignmentAuthorized: false,
      assets: [asset],
    };
    expect(() => validateRootReleaseReview(pending, [JOB_ID])).toThrow(
      "RANG_IMAGE_RELEASE_REVIEW_ASSIGNMENT_AUTHORIZATION",
    );

    const accepted = validateRootReleaseReview(
      { ...pending, routeAssignmentAuthorized: true },
      [JOB_ID],
    );
    expect(accepted.get(JOB_ID)).toEqual(asset);

    const template = createPendingReviewTemplate([
      {
        ...asset,
        decision: "PENDING",
        contactSheet: null,
      },
    ]);
    expect(template.status).toBe("PENDING_ROOT_VISUAL_REVIEW");
    expect(template.routeAssignmentAuthorized).toBe(false);
  });

  it("normalizes each receipt binding shape but rejects a physical source hash mismatch", () => {
    for (const kind of ["original", "output", "top-level"] as const) {
      const evidence = validateAssetEvidence(baseInput(receiptFor(kind)));
      expect(evidence.source.sha256).toBe(SOURCE_SHA256);
      expect(evidence.source.width).toBe(1672);
    }

    const badReceipt: Record<string, unknown> = receiptFor("output");
    const output = badReceipt.output as Record<string, unknown>;
    output.sha256 = HEX("different-source");
    expect(() => validateAssetEvidence(baseInput(badReceipt))).toThrow(
      "RANG_IMAGE_RELEASE_rng-rgn-001-c01:RECEIPT_SOURCE_SHA",
    );
  });

  it("allows only exact-idempotent derived outputs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rang-image-release-"));
    const output = join(directory, "desktop.webp");
    try {
      expect(await writeExactOrCreate(output, Buffer.from("derived"))).toBe("created");
      expect(await writeExactOrCreate(output, Buffer.from("derived"))).toBe("idempotent");
      await expect(writeExactOrCreate(output, Buffer.from("different"))).rejects.toThrow(
        "RANG_IMAGE_RELEASE_NO_CLOBBER_OUTPUT",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
