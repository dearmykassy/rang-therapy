import NextLink from "next/link";
import type { ComponentProps } from "react";

import { resolveSiteLinkPrefetch } from "@/lib/link-prefetch";

export type SiteLinkProps = ComponentProps<typeof NextLink>;

/**
 * Single internal-link boundary. NextLink keeps the real anchor, client-side
 * navigation, click handlers and anchor ARIA attributes; only production
 * prefetching is forced off.
 */
export default function SiteLink({ prefetch, ...props }: SiteLinkProps) {
  return (
    <NextLink
      {...props}
      prefetch={resolveSiteLinkPrefetch(prefetch, process.env.NODE_ENV)}
    />
  );
}
