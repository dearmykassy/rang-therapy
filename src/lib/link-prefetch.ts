export type SiteLinkPrefetchValue = boolean | "auto" | null | undefined;

/**
 * Googlebot can render the production App Router tree, where viewport
 * prefetches become React Server Component (`?_rsc=`) requests. Development
 * keeps the requested value, while production always disables prefetching.
 */
export function resolveSiteLinkPrefetch(
  requested: SiteLinkPrefetchValue,
  environment: string | undefined,
): SiteLinkPrefetchValue {
  return environment === "production" ? false : requested;
}
