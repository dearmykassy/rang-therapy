import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/data/blog-posts";
import { metadata } from "@/app/layout";
import robots from "@/app/robots";
import sitemap, { FIXED_SITEMAP_PATHS } from "@/app/sitemap";
import { ACTIVE_REGION_NODES } from "@/lib/regions";
import { SITE_ORIGIN } from "@/lib/metadata";

describe("static release guards and responsive shell", () => {
  it("publishes the exact Naver site ownership verification token", () => {
    expect(metadata.verification).toEqual({
      other: {
        "naver-site-verification": "45112963d8924d3ef93a7f224b137f1e194ab881",
      },
    });
  });

  it("publishes the approved production discovery contract", () => {
    expect(robots().rules).toEqual({ userAgent: "*", allow: "/" });
    expect(robots().host).toBe(SITE_ORIGIN);
    expect(robots().sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
    const expectedCount = ACTIVE_REGION_NODES.length + FIXED_SITEMAP_PATHS.length + BLOG_POSTS.length;
    expect(sitemap()).toHaveLength(expectedCount);
    expect(new Set(sitemap().map((entry) => entry.url)).size).toBe(expectedCount);
    expect(sitemap().every((entry) => entry.url.startsWith(`${SITE_ORIGIN}/`))).toBe(true);
  });

  it("pins sticky translucent navigation and 320/390-safe two-column region cards", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.site-header\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(
      /backdrop-filter:\s*var\(--regional-header-backdrop-filter,\s*blur\(/,
    );
    expect(css).toMatch(/\.area-card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
    expect(css).toMatch(/@media \(max-width: 440px\)/);
    expect(css).toContain("overflow-x: hidden");
  });
});
