import { BLOG_POSTS, getBlogPostPath, type BlogPost } from "@/data/blog-posts";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/metadata";

export const RSS_PATH = "/rss.xml";
export const RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8";

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toRfc822(value: string, label: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`RANG_RSS_INVALID_DATE:${label}:${value}`);
  }
  return new Date(milliseconds).toUTCString();
}

function comparePostsNewestFirst(left: BlogPost, right: BlogPost): number {
  const dateDifference = Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  return dateDifference !== 0 ? dateDifference : left.slug.localeCompare(right.slug);
}

export function createRssFeed(posts: readonly BlogPost[] = BLOG_POSTS): string {
  if (posts.length === 0) {
    throw new Error("RANG_RSS_REQUIRES_DATED_POSTS");
  }

  const orderedPosts = [...posts].sort(comparePostsNewestFirst);
  const lastBuildDate = orderedPosts.reduce((latest, post) => {
    const modifiedAt = Date.parse(post.modifiedAt);
    if (!Number.isFinite(modifiedAt)) {
      throw new Error(`RANG_RSS_INVALID_DATE:modifiedAt:${post.modifiedAt}`);
    }
    return Math.max(latest, modifiedAt);
  }, Number.NEGATIVE_INFINITY);
  const feedUrl = new URL(RSS_PATH, SITE_ORIGIN).href;
  const homeUrl = new URL("/", SITE_ORIGIN).href;
  const channelDescription = `${SITE_NAME} 블로그의 이용 안내와 운영 정보를 전하는 RSS입니다.`;
  const items = orderedPosts.map((post) => {
    const canonical = new URL(getBlogPostPath(post), SITE_ORIGIN).href;
    return [
      "    <item>",
      `      <title>${escapeXml(`${post.title} | ${SITE_NAME}`)}</title>`,
      `      <link>${escapeXml(canonical)}</link>`,
      `      <description>${escapeXml(post.description)}</description>`,
      `      <category>${escapeXml(post.category)}</category>`,
      `      <pubDate>${toRfc822(post.publishedAt, `publishedAt:${post.slug}`)}</pubDate>`,
      `      <guid isPermaLink="true">${escapeXml(canonical)}</guid>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(`${SITE_NAME} 블로그`)}</title>`,
    `    <link>${escapeXml(homeUrl)}</link>`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    "    <language>ko-KR</language>",
    `    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
