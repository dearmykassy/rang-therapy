import { describe, expect, it } from "vitest";
import { ACTIVE_REGION_NODES } from "@/lib/regions";
import {
  findBestActiveRegion,
  normalizeRegionSearchText,
  REGION_SEARCH_INDEX,
  searchActiveRegions,
} from "@/lib/region-search";

describe("active region search index", () => {
  it("keeps one compact searchable entry for every active route", () => {
    expect(REGION_SEARCH_INDEX).toHaveLength(ACTIVE_REGION_NODES.length);
    expect(new Set(REGION_SEARCH_INDEX.map((entry) => entry.path))).toHaveLength(1291);
  });

  it("matches a display name, ancestor text, aliases, and the route path deterministically", () => {
    const yeoksam = ACTIVE_REGION_NODES.find(
      (node) => node.qualifiedName === "서울특별시 강남구 역삼동",
    );
    const gangnam = ACTIVE_REGION_NODES.find(
      (node) => node.qualifiedName === "서울특별시 강남구",
    );

    expect(yeoksam).toBeDefined();
    expect(gangnam).toBeDefined();
    expect(findBestActiveRegion("역삼동")?.path).toBe(yeoksam?.path);
    expect(findBestActiveRegion("서울 강남구 역삼동")?.path).toBe(yeoksam?.path);
    expect(findBestActiveRegion("역삼1동")?.path).toBe(yeoksam?.path);
    expect(findBestActiveRegion("seoul/강남구")?.path).toBe(gangnam?.path);
    expect(searchActiveRegions("동", 6)).toEqual(searchActiveRegions("동", 6));
  });

  it("normalizes separators and returns no accidental result for an empty query", () => {
    expect(normalizeRegionSearchText(" 서울·강남구 / 역삼동 ")).toBe("서울강남구역삼동");
    expect(searchActiveRegions("  ")).toEqual([]);
    expect(findBestActiveRegion("  ")).toBeNull();
  });
});
