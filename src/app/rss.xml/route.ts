import { createRssFeed, RSS_CONTENT_TYPE } from "@/lib/rss";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(createRssFeed(), {
    headers: { "Content-Type": RSS_CONTENT_TYPE },
  });
}
