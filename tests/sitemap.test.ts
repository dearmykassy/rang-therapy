import { describe, expect, it } from "vitest";
import sitemap, {
  BLOG_INDEX_SITEMAP_LAST_MODIFIED,
  FIXED_SITEMAP_LAST_MODIFIED,
  FIXED_SITEMAP_PATHS,
  REGION_SITEMAP_LAST_MODIFIED,
} from "@/app/sitemap";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { SITE_ORIGIN } from "@/lib/metadata";
import { ACTIVE_REGION_NODES } from "@/lib/regions";

describe("sitemap freshness contract", () => {
  it("publishes one stable, parseable, non-future lastmod for every unique URL", () => {
    const first = sitemap();
    const second = sitemap();
    const expectedCount = FIXED_SITEMAP_PATHS.length + BLOG_POSTS.length + ACTIVE_REGION_NODES.length;

    expect(first).toHaveLength(1299);
    expect(first).toHaveLength(expectedCount);
    expect(new Set(first.map((entry) => entry.url)).size).toBe(expectedCount);
    expect(second).toEqual(first);

    for (const entry of first) {
      expect(entry.lastModified).toBeTypeOf("string");
      const parsed = Date.parse(entry.lastModified as string);
      expect(Number.isFinite(parsed)).toBe(true);
      expect(parsed).toBeLessThanOrEqual(Date.now());
      expect(Object.hasOwn(entry, "changeFrequency")).toBe(false);
      expect(Object.hasOwn(entry, "priority")).toBe(false);
    }
  });

  it("uses exact editorial dates for blog routes and pinned receipt dates elsewhere", () => {
    const byUrl = new Map(sitemap().map((entry) => [entry.url, entry]));

    for (const path of FIXED_SITEMAP_PATHS) {
      const expected = path === "/blog/"
        ? BLOG_INDEX_SITEMAP_LAST_MODIFIED
        : FIXED_SITEMAP_LAST_MODIFIED;
      expect(byUrl.get(`${SITE_ORIGIN}${path}`)?.lastModified).toBe(expected);
    }
    for (const post of BLOG_POSTS) {
      expect(byUrl.get(`${SITE_ORIGIN}${getBlogPostPath(post)}`)?.lastModified).toBe(post.modifiedAt);
    }
    for (const node of ACTIVE_REGION_NODES) {
      expect(byUrl.get(`${SITE_ORIGIN}${node.path}/`)?.lastModified).toBe(
        REGION_SITEMAP_LAST_MODIFIED,
      );
    }
  });
});
