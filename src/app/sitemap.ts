import type { MetadataRoute } from "next";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { SITE_ORIGIN } from "@/lib/metadata";
import { ACTIVE_REGION_NODES } from "@/lib/regions";

export const dynamic = "force-static";

export const FIXED_SITEMAP_PATHS = ["/", "/areas/", "/pricing/", "/guide/", "/notice/", "/blog/"] as const;

// c55e7f1: production SEO and the fixed public surfaces were activated together.
export const FIXED_SITEMAP_LAST_MODIFIED = "2026-08-16T06:51:55+09:00";
// db98884: all 1,291 regional search metadata contracts were meaningfully updated.
export const REGION_SITEMAP_LAST_MODIFIED = "2026-08-19T00:39:24+09:00";
export const BLOG_INDEX_SITEMAP_LAST_MODIFIED = BLOG_POSTS.reduce(
  (latest, post) =>
    Date.parse(post.modifiedAt) > Date.parse(latest) ? post.modifiedAt : latest,
  BLOG_POSTS[0].modifiedAt,
);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...FIXED_SITEMAP_PATHS.map((path) => ({
      url: `${SITE_ORIGIN}${path}`,
      lastModified:
        path === "/blog/" ? BLOG_INDEX_SITEMAP_LAST_MODIFIED : FIXED_SITEMAP_LAST_MODIFIED,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${SITE_ORIGIN}${getBlogPostPath(post)}`,
      lastModified: post.modifiedAt,
    })),
    ...ACTIVE_REGION_NODES.map((node) => ({
      url: `${SITE_ORIGIN}${node.path}/`,
      lastModified: REGION_SITEMAP_LAST_MODIFIED,
    })),
  ];
}
