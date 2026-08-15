import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const AUDIT_SCRIPT = resolve(ROOT, "scripts/audit-cross-platform-exact.ts");
const TSX_CLI = resolve(ROOT, "node_modules/tsx/dist/cli.mjs");
const RELATIVE_RECEIPT = "qa/content/cross-platform-exact-audit.v1.json";

function runAudit(isolatedRoot: string) {
  return spawnSync(process.execPath, [TSX_CLI, AUDIT_SCRIPT], {
    cwd: ROOT,
    env: {
      ...process.env,
      RANG_AUDIT_ROOT: isolatedRoot,
    },
    encoding: "utf8",
  });
}

const isolatedRoot = await mkdtemp(resolve(tmpdir(), "rang-cross-isolated-"));
try {
  await mkdir(resolve(isolatedRoot, "artifacts"), { recursive: true });
  await mkdir(resolve(isolatedRoot, "qa/content"), { recursive: true });
  await cp(
    resolve(ROOT, "artifacts/content-corpus.json"),
    resolve(isolatedRoot, "artifacts/content-corpus.json"),
  );
  await cp(
    resolve(ROOT, "qa/content/external-snapshots"),
    resolve(isolatedRoot, "qa/content/external-snapshots"),
    { recursive: true },
  );

  const manifestPath = resolve(
    isolatedRoot,
    "qa/content/external-snapshots/manifest.v1.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.platforms.reverse();
  for (const platform of manifest.platforms) {
    platform.liveProbePath = `unobserved/${platform.platformId}/content-corpus.json`;
    if (platform.liveVisibleContractProbePath) {
      platform.liveVisibleContractProbePath =
        `unobserved/${platform.platformId}/visible-contract.json`;
    }
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const expected = await readFile(resolve(ROOT, RELATIVE_RECEIPT));
  const first = runAudit(isolatedRoot);
  if (first.status !== 0) {
    throw new Error(
      `RANG_CROSS_ISOLATED_EXECUTION:${first.status}:${first.stderr}`,
    );
  }
  const isolated = await readFile(resolve(isolatedRoot, RELATIVE_RECEIPT));
  if (!isolated.equals(expected)) {
    throw new Error("RANG_CROSS_ISOLATED_RECEIPT_BYTES_DIFFER");
  }
  const isolatedLiveDrift = JSON.parse(
    await readFile(
      resolve(isolatedRoot, "qa/content/cross-platform-live-drift.v1.json"),
      "utf8",
    ),
  );
  const observationStates = isolatedLiveDrift.observations.flatMap(
    (observation: Record<string, Record<string, unknown> | string | null>) =>
      [observation.corpus, observation.visibleContract]
        .filter((entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
        )
        .map((entry) => entry.state),
  );
  if (
    isolatedLiveDrift.status !== "PENDING" ||
    isolatedLiveDrift.verdict !== "PENDING" ||
    observationStates.length < 4 ||
    !observationStates.every((state: unknown) => state === "NOT_OBSERVED")
  ) {
    throw new Error("RANG_CROSS_ISOLATED_LIVE_PROBE_NOT_FAIL_CLOSED");
  }

  const tamperPath = resolve(
    isolatedRoot,
    "qa/content/external-snapshots/massagebom.content-corpus.json.gz",
  );
  const tampered = await readFile(tamperPath);
  tampered[tampered.length - 1] ^= 0xff;
  await writeFile(tamperPath, tampered);
  const receiptBeforeTamperFailure = await readFile(
    resolve(isolatedRoot, RELATIVE_RECEIPT),
  );
  const second = runAudit(isolatedRoot);
  if (
    second.status === 0 ||
    !`${second.stdout}\n${second.stderr}`.includes(
      "RANG_CROSS_SNAPSHOT_BUNDLE_SHA",
    )
  ) {
    throw new Error(
      `RANG_CROSS_TAMPER_NOT_REJECTED:${second.status}:${second.stderr}`,
    );
  }
  const receiptAfterTamperFailure = await readFile(
    resolve(isolatedRoot, RELATIVE_RECEIPT),
  );
  if (!receiptAfterTamperFailure.equals(receiptBeforeTamperFailure)) {
    throw new Error("RANG_CROSS_TAMPER_REWROTE_CANONICAL_RECEIPT");
  }

  process.stdout.write(
    `${JSON.stringify({ status: "PASS", canonicalBytesIdentical: true, siblingRootsRequired: false, liveProbeBypassed: false, pendingNotObservedAcceptedAsPending: true, manifestOrderIndependent: true, liveProbePathIndependent: true, tamperRejected: true, failedAuditReceiptRewrite: false })}\n`,
  );
} finally {
  await rm(isolatedRoot, { recursive: true, force: true });
}
