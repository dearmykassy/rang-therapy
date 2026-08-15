import type { MetadataRoute } from "next";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { ACTIVE_REGION_NODES } from "@/lib/regions";

export const dynamic = "force-static";

const BASE = "https://preview.rang-therapy.invalid";
export const FIXED_SITEMAP_PATHS = ["/", "/areas/", "/pricing/", "/guide/", "/notice/", "/blog/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...FIXED_SITEMAP_PATHS,
    ...BLOG_POSTS.map(getBlogPostPath),
    ...ACTIVE_REGION_NODES.map((node) => `${node.path}/`),
  ];

  return paths.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path.startsWith("/blog/") ? "monthly" as const : "weekly" as const,
    priority: path === "/" ? 1 : path.startsWith("/areas/") ? 0.8 : path.startsWith("/blog/") ? 0.65 : 0.6,
  }));
}
