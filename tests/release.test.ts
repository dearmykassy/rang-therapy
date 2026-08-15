import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/data/blog-posts";
import robots from "@/app/robots";
import sitemap, { FIXED_SITEMAP_PATHS } from "@/app/sitemap";
import { ACTIVE_REGION_NODES } from "@/lib/regions";

describe("static release guards and responsive shell", () => {
  it("keeps discovery fail-closed until domain and legal approval", () => {
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots().sitemap).toContain(".invalid/");
    const expectedCount = ACTIVE_REGION_NODES.length + FIXED_SITEMAP_PATHS.length + BLOG_POSTS.length;
    expect(sitemap()).toHaveLength(expectedCount);
    expect(new Set(sitemap().map((entry) => entry.url)).size).toBe(expectedCount);
    expect(sitemap().every((entry) => entry.url.startsWith("https://preview.rang-therapy.invalid/"))).toBe(true);
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
