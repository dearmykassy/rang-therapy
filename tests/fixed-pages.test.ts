import { describe, expect, it } from "vitest";
import { BLOG_POSTS, createBlogMetadata, findBlogPost, getBlogPostPath } from "@/data/blog-posts";
import { metadataContract as blogIndexMetadata } from "@/app/blog/page";
import { metadataContract as guideMetadata } from "@/app/guide/page";
import { metadataContract as noticeMetadata } from "@/app/notice/page";
import { metadataContract as pricingMetadata } from "@/app/pricing/page";
import { FIXED_SITEMAP_PATHS } from "@/app/sitemap";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";
import { PREVIEW_ORIGIN, SITE_NAME } from "@/lib/metadata";
import { ACTIVE_REGION_NODES } from "@/lib/regions";
import sitemap from "@/app/sitemap";

describe("rang fixed pages and blog", () => {
  it("keeps fixed page metadata on their own canonical routes", () => {
    const fixedContracts = [pricingMetadata, guideMetadata, noticeMetadata, blogIndexMetadata];

    expect(FIXED_SITEMAP_PATHS).toEqual([
      "/",
      "/areas/",
      "/pricing/",
      "/guide/",
      "/notice/",
      "/blog/",
    ]);
    expect(new Set(fixedContracts.map((contract) => contract.canonical)).size).toBe(fixedContracts.length);
    for (const contract of fixedContracts) {
      expect(contract.canonical).toBe(new URL(contract.route, PREVIEW_ORIGIN).href);
      expect(contract.openGraph.url).toBe(contract.canonical);
      expect(contract.twitter.title).toBe(contract.title);
    }
  });

  it("makes the two original blog notes reachable and schema-bound", () => {
    expect(BLOG_POSTS).toHaveLength(2);
    expect(new Set(BLOG_POSTS.map((post) => post.slug)).size).toBe(BLOG_POSTS.length);

    for (const post of BLOG_POSTS) {
      const path = getBlogPostPath(post);
      const canonical = new URL(path, PREVIEW_ORIGIN).href;
      const metadata = createBlogMetadata(post);
      const schema = createBlogPostingJsonLd(post);

      expect(findBlogPost(post.slug)).toEqual(post);
      expect(metadata.alternates?.canonical).toBe(canonical);
      expect(metadata.openGraph).toMatchObject({
        type: "article",
        title: `${post.title} | ${SITE_NAME}`,
        url: canonical,
        publishedTime: post.publishedAt,
        modifiedTime: post.modifiedAt,
      });
      expect(schema).toMatchObject({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        url: canonical,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        datePublished: post.publishedAt,
        dateModified: post.modifiedAt,
        inLanguage: "ko-KR",
        isPartOf: { "@type": "Blog", name: `${SITE_NAME} 블로그` },
      });
      expect(post.relatedSlug).not.toBe(post.slug);
    }
  });

  it("includes fixed pages and both articles in the generated sitemap without duplicate URLs", () => {
    const urls = sitemap().map((entry) => entry.url);
    const expectedFixedUrls = [
      ...FIXED_SITEMAP_PATHS,
      ...BLOG_POSTS.map(getBlogPostPath),
    ].map((path) => new URL(path, PREVIEW_ORIGIN).href);

    expect(urls).toHaveLength(ACTIVE_REGION_NODES.length + expectedFixedUrls.length);
    expect(new Set(urls).size).toBe(urls.length);
    expect(expectedFixedUrls.every((url) => urls.includes(url))).toBe(true);
  });
});
