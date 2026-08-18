import { describe, expect, it } from "vitest";
import { createRegionContent, KEYWORD_FAMILIES } from "@/lib/content";
import {
  ACTIVE_REGION_NODES,
  getBreadcrumbs,
  getOfficialRegionLabel,
  getSearchRegionLabel,
  shortenSearchRegionToken,
} from "@/lib/regions";

const FORMAL_SUFFIX_BEFORE_SERVICE_KEYWORD = new RegExp(
  `(?:특별자치도|특별자치시|특별시|광역시|도|시)\\s*(?=(?:${KEYWORD_FAMILIES.join("|")}))`,
  "u",
);

function nodeByQualifiedName(qualifiedName: string) {
  const node = ACTIVE_REGION_NODES.find(
    (candidate) => candidate.qualifiedName === qualifiedName,
  );
  if (!node) throw new Error(`TEST_REGION_NOT_FOUND:${qualifiedName}`);
  return node;
}

describe("search-facing region metadata", () => {
  it("shortens only the owner-approved token-final administrative suffixes", () => {
    expect(shortenSearchRegionToken("서울특별시")).toBe("서울");
    expect(shortenSearchRegionToken("세종특별자치시")).toBe("세종");
    expect(shortenSearchRegionToken("인천광역시")).toBe("인천");
    expect(shortenSearchRegionToken("제주특별자치도")).toBe("제주");
    expect(shortenSearchRegionToken("경기도")).toBe("경기");
    expect(shortenSearchRegionToken("수원시")).toBe("수원");
    expect(shortenSearchRegionToken("강남구")).toBe("강남구");
    expect(shortenSearchRegionToken("가평군")).toBe("가평군");
    expect(shortenSearchRegionToken("구좌읍")).toBe("구좌읍");
    expect(shortenSearchRegionToken("우도면")).toBe("우도면");
    expect(shortenSearchRegionToken("역삼동")).toBe("역삼동");
    expect(shortenSearchRegionToken("동복리")).toBe("동복리");
  });

  it("pins the requested customer-search examples and disambiguates collisions", () => {
    expect(getSearchRegionLabel(nodeByQualifiedName("서울특별시"))).toBe("서울");
    expect(getSearchRegionLabel(nodeByQualifiedName("인천광역시"))).toBe("인천");
    expect(getSearchRegionLabel(nodeByQualifiedName("경기도"))).toBe("경기");
    expect(getSearchRegionLabel(nodeByQualifiedName("경기도 수원시"))).toBe("수원");
    expect(getSearchRegionLabel(nodeByQualifiedName("서울특별시 강서구"))).toBe(
      "서울 강서구",
    );
    expect(getSearchRegionLabel(nodeByQualifiedName("부산광역시 강서구"))).toBe(
      "부산 강서구",
    );
    expect(getSearchRegionLabel(nodeByQualifiedName("제주특별자치도 제주시"))).toBe(
      "제주 제주",
    );
  });

  it("enforces concise, unique meta3 while retaining official visible geography on all 1,291 routes", () => {
    const rows = ACTIVE_REGION_NODES.map((node) => ({
      node,
      searchLabel: getSearchRegionLabel(node),
      officialLabel: getOfficialRegionLabel(node),
      content: createRegionContent(node),
    }));

    expect(new Set(rows.map((row) => row.searchLabel)).size).toBe(1291);
    expect(new Set(rows.map((row) => row.content.title)).size).toBe(1291);
    expect(new Set(rows.map((row) => row.content.description)).size).toBe(1291);
    expect(new Set(rows.flatMap((row) => row.content.keywords)).size).toBe(
      1291 * KEYWORD_FAMILIES.length,
    );

    for (const { node, searchLabel, officialLabel, content } of rows) {
      expect(content.title.startsWith(searchLabel)).toBe(true);
      expect(content.description.startsWith(`${searchLabel} `)).toBe(true);
      expect(content.keywords).toEqual(
        KEYWORD_FAMILIES.map((family) => `${searchLabel}${family}`),
      );

      for (const value of [content.title, content.description, ...content.keywords]) {
        expect(value, node.path).not.toMatch(FORMAL_SUFFIX_BEFORE_SERVICE_KEYWORD);
      }

      const visibleBody = [
        content.h1,
        ...content.hooks,
        ...content.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
      ].join("\n");
      expect(content.h1, node.path).toContain(officialLabel);
      expect(visibleBody, node.path).toContain(officialLabel);
      expect(
        getBreadcrumbs(node).map((crumb) => crumb.name).join(" "),
        node.path,
      ).toContain(officialLabel);
    }
  });
});
