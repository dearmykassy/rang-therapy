import { describe, expect, it } from "vitest";
import { GET } from "@/app/rss.xml/route";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import sitemap from "@/app/sitemap";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/metadata";
import { createRssFeed, escapeXml, RSS_CONTENT_TYPE, RSS_PATH } from "@/lib/rss";

describe("rang RSS 2.0 feed", () => {
  it("escapes every XML metacharacter", () => {
    expect(escapeXml(`A & <B> "C" 'D'`)).toBe(
      "A &amp; &lt;B&gt; &quot;C&quot; &apos;D&apos;",
    );
  });

  it("publishes only dated, canonical and indexable blog documents", async () => {
    const response = GET();
    const xml = await response.text();
    const sitemapUrls = new Set(sitemap().map((entry) => entry.url));
    const itemBlocks = [...xml.matchAll(/<item>[\s\S]*?<\/item>/gu)].map((match) => match[0]);
    const latestModifiedAt = Math.max(...BLOG_POSTS.map((post) => Date.parse(post.modifiedAt)));

    expect(response.headers.get("content-type")).toBe(RSS_CONTENT_TYPE);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(xml).toContain("<language>ko-KR</language>");
    expect(xml).toContain(`<title>${SITE_NAME} 블로그</title>`);
    expect(xml).toContain(
      `<atom:link href="${SITE_ORIGIN}${RSS_PATH}" rel="self" type="application/rss+xml" />`,
    );
    expect(xml).toContain(`<lastBuildDate>${new Date(latestModifiedAt).toUTCString()}</lastBuildDate>`);
    expect(itemBlocks).toHaveLength(BLOG_POSTS.length);
    expect(xml).not.toContain(".invalid");

    for (const post of BLOG_POSTS) {
      const canonical = new URL(getBlogPostPath(post), SITE_ORIGIN).href;
      const block = itemBlocks.find((candidate) => candidate.includes(`<link>${canonical}</link>`));
      expect(sitemapUrls.has(canonical)).toBe(true);
      expect(block).toBeDefined();
      expect(block).toContain(`<title>${escapeXml(`${post.title} | ${SITE_NAME}`)}</title>`);
      expect(block).toContain(`<description>${escapeXml(post.description)}</description>`);
      expect(block).toContain(`<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`);
      expect(block).toContain(`<guid isPermaLink="true">${canonical}</guid>`);
    }
  });

  it("is deterministic and never substitutes build time for editorial dates", () => {
    expect(createRssFeed()).toBe(createRssFeed());
    expect(createRssFeed()).not.toContain(new Date().toUTCString());
  });
});
