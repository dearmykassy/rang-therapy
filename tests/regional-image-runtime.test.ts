import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import regionalImageAssignmentsJson from "../src/data/regional-image-assignments.generated.json";
import {
  getRegionalImageAssignment,
  regionalHeaderThemeCss,
} from "../src/lib/regional-image-runtime";
import { ACTIVE_REGION_NODES } from "../src/lib/regions";

describe("released Rang Therapy regional image runtime", () => {
  it("maps every active route to a released responsive hero and palette header", () => {
    const manifest = regionalImageAssignmentsJson as {
      distribution: { routes: number };
      routes: Record<string, { assetId: string }>;
    };
    const uniqueAssets = new Set<string>();

    expect(ACTIVE_REGION_NODES).toHaveLength(1291);
    expect(Object.keys(manifest.routes)).toHaveLength(ACTIVE_REGION_NODES.length);

    for (const node of ACTIVE_REGION_NODES) {
      const assignment = getRegionalImageAssignment(node.path);
      uniqueAssets.add(assignment.assetId);

      expect(assignment.sources.desktop).toBe(
        `/assets/rang-therapy/regional/${assignment.assetId}/desktop.webp`,
      );
      expect(assignment.sources.tablet).toBe(
        `/assets/rang-therapy/regional/${assignment.assetId}/tablet.webp`,
      );
      expect(assignment.sources.mobile).toBe(
        `/assets/rang-therapy/regional/${assignment.assetId}/mobile.webp`,
      );

      const headerCss = regionalHeaderThemeCss(assignment);
      expect(headerCss).toContain(
        `main.region-page[data-regional-image-id="${assignment.assetId}"]`,
      );
      expect(headerCss).toContain("--regional-header-background:");
      expect(headerCss).toContain("--regional-header-backdrop-filter: blur(18px);");
    }

    expect(uniqueAssets).toHaveLength(130);
    for (const assetId of uniqueAssets) {
      for (const variant of ["desktop", "tablet", "mobile"] as const) {
        expect(
          existsSync(
            resolve(
              process.cwd(),
              "public",
              "assets",
              "rang-therapy",
              "regional",
              assetId,
              `${variant}.webp`,
            ),
          ),
        ).toBe(true);
      }
    }
  });
});
