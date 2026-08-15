import { describe, expect, it } from "vitest";
import { ACTIVE_REGION_NODES, ACTIVE_ROOT_KEYS, getActiveStaticParams, getDirectChildren, getRootNode, resolveRegionNode } from "@/lib/regions";

describe("canonical 1,291-region graph", () => {
  it("preserves the exact active set and hierarchy", () => {
    expect(ACTIVE_REGION_NODES).toHaveLength(1291);
    expect(ACTIVE_REGION_NODES.filter((node) => node.kind === "root")).toHaveLength(11);
    expect(ACTIVE_REGION_NODES.filter((node) => node.kind === "hub")).toHaveLength(127);
    expect(ACTIVE_REGION_NODES.filter((node) => node.kind === "representative")).toHaveLength(1153);
    expect(new Set(ACTIVE_REGION_NODES.map((node) => node.path))).toHaveLength(1291);
    expect(getActiveStaticParams()).toHaveLength(1291);
  });

  it("resolves every root and every generated path", () => {
    for (const key of ACTIVE_ROOT_KEYS) expect(getRootNode(key).rootKey).toBe(key);
    for (const node of ACTIVE_REGION_NODES) {
      expect(resolveRegionNode(node.segments)?.path).toBe(node.path);
      if (node.kind !== "representative") {
        expect(getDirectChildren(node).length).toBeGreaterThan(0);
      }
    }
  });
});
