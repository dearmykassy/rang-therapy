import type { Metadata } from "next";

export const PREVIEW_ORIGIN = "https://preview.rang-therapy.invalid";
export const SITE_NAME = "랑테라피";

export type RouteMetadataContract = {
  route: string;
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  openGraph: {
    type: "website";
    locale: "ko_KR";
    siteName: typeof SITE_NAME;
    title: string;
    description: string;
    url: string;
  };
  twitter: {
    card: "summary";
    title: string;
    description: string;
  };
};

function normalizedRoute(route: string): string {
  if (route === "/") return route;
  return `${route.replace(/^\/+|\/+$/gu, "")}/`.replace(/^/u, "/");
}

export function createRouteMetadataContract(
  route: string,
  title: string,
  description: string,
  keywords: readonly string[] = [],
): RouteMetadataContract {
  const normalized = normalizedRoute(route);
  const canonical = new URL(normalized, PREVIEW_ORIGIN).href;
  return {
    route: normalized,
    title,
    description,
    keywords: [...keywords],
    canonical,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function toNextMetadata(contract: RouteMetadataContract): Metadata {
  return {
    title: { absolute: contract.title },
    description: contract.description,
    keywords: contract.keywords.length > 0 ? contract.keywords : undefined,
    alternates: { canonical: contract.canonical },
    openGraph: contract.openGraph,
    twitter: contract.twitter,
    robots: { index: false, follow: false, nocache: true },
  };
}
