import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  extractActualDomSurface,
  type ActualDomSurface,
} from "../src/lib/dom-surface";
import { BLOG_POSTS, getBlogPostPath } from "../src/data/blog-posts";
import { PHONE_DISPLAY } from "../src/lib/business";
import { SITE_ORIGIN } from "../src/lib/metadata";

const ROOT = resolve(import.meta.dirname, "..");
const AREAS_OUTPUT = resolve(ROOT, "out/areas");
const ROBOTS_OUTPUT = resolve(ROOT, "out/robots.txt");
const SITEMAP_OUTPUT = resolve(ROOT, "out/sitemap.xml");
const EXPECTED_REGION_PAGES = 1291;
const FIXED_PAGE_OUTPUTS = [
  { kind: "fixed", id: "home", route: "/", path: resolve(ROOT, "out/index.html") },
  { kind: "fixed", id: "areas", route: "/areas/", path: resolve(ROOT, "out/areas/index.html") },
  { kind: "fixed", id: "pricing", route: "/pricing/", path: resolve(ROOT, "out/pricing/index.html") },
  { kind: "fixed", id: "guide", route: "/guide/", path: resolve(ROOT, "out/guide/index.html") },
  { kind: "fixed", id: "notice", route: "/notice/", path: resolve(ROOT, "out/notice/index.html") },
  { kind: "fixed", id: "blog", route: "/blog/", path: resolve(ROOT, "out/blog/index.html") },
] as const;
const BLOG_POST_OUTPUTS = BLOG_POSTS.map((post) => {
  const route = getBlogPostPath(post);
  return {
    kind: "article" as const,
    id: `blog-post-${post.slug}`,
    route,
    path: resolve(ROOT, "out", ...route.split("/").filter(Boolean), "index.html"),
  };
});
const STATIC_PAGE_OUTPUTS = [...FIXED_PAGE_OUTPUTS, ...BLOG_POST_OUTPUTS];
const ALLOWED_TEL_ACTION_LABELS = ["전화상담", "☎ 전화상담", "☎ 상담", PHONE_DISPLAY] as const;
type CorpusDocument = {
  route: string;
  title: string;
  description: string;
  h1: string;
  keywords: string[];
  metadata: RouteMetadataContract;
  renderedSurface: Array<{
    id: string;
    value: string;
    classification: string;
  }>;
  actualDomSurface: ActualDomSurface;
  telActions: {
    hrefCount: number;
    allowedLabels: readonly string[];
    labelCounts: Record<string, number>;
    mismatchedLabelCount: number;
  };
};
type FixedCorpusDocument = {
  route: string;
  title: string;
  description: string;
  metadata: RouteMetadataContract;
  actualDomSurface: ActualDomSurface;
  telActions: CorpusDocument["telActions"];
};
type RouteMetadataContract = {
  route: string;
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  openGraph: {
    type: string;
    locale: string;
    siteName: string;
    title: string;
    description: string;
    url: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
  };
};
type Corpus = {
  sourceManifestSha256: string;
  documents: CorpusDocument[];
  fixedDocuments: FixedCorpusDocument[];
  articleDocuments: FixedCorpusDocument[];
};

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function collectRegionHtml(directory: string, depth = 0): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectRegionHtml(path, depth + 1);
      return depth > 0 && entry.name === "index.html" ? [path] : [];
    }),
  );
  return files.flat();
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function visibleText(value: string): string {
  return decodeHtml(
    value
      .replace(/<!--[\s\S]*?-->/gu, "")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/\s+/gu, " ")
    .trim();
}

const BUILT_ROLE_PATTERNS = {
  providerArrivalContactWaitingAssumption:
    /(?:관리사|테라피스트|방문 연락|도착[^.!?]{0,40}연락|연락[^.!?]{0,40}(?:기다리|대기)|연락을 놓치|연락받을 (?:사람|번호)|서비스 중 연락|전화받기 어려운|전화받을 수 있는 상태|휴대전화를 가까이|방문 예정 (?:시간|시각)|기다리|대기)/gu,
  serviceRecipientAddressRoleError:
    /(?:머무는|머물(?:고|러)|체류 주소|체류 지역|실제 주소|상세 위치)/gu,
  providerSubjectAvailabilityAmbiguity:
    /(?:방문 가능 여부|오늘 방문할 수 있는지|방문 가능 시각)/gu,
  customerPhysicalMovement:
    /(?:이동|출발|도착|찾아가|오시는 길)/gu,
  oldTelephoneConsultNumberChangedBeforeInquiry:
    /전화상담 번호가 바뀌었다면 문의 전에 새 번호/gu,
  oldNewTelephoneConsultNumberDuringCall:
    /새 전화상담 번호는 기존 번호가 바뀐 경우 통화 중/gu,
  oldTelephoneConsultNumberDigitCheck:
    /전화상담 번호의 숫자가 맞는지/gu,
  oldServiceSpaceRequestSeparation:
    /서비스 공간 요청은[^.!?]{0,80}구분해/gu,
  ambiguousCustomerContactNumberRole:
    /(?:전화상담에 (?:사용할|쓸|쓴) 번호|통화에 사용할 번호|본인 번호|본인 전화번호|연락처 숫자|새 전화상담 번호)/gu,
} as const;

function builtRoleCounts(html: string, geographicValues: readonly string[] = []) {
  const withoutExecutableText = html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ");
  const text = geographicValues
    .slice()
    .sort((left, right) => right.length - left.length)
    .reduce(
      (value, geography) => value.replaceAll(geography, " "),
      visibleText(withoutExecutableText),
    );
  return Object.fromEntries(
    Object.entries(BUILT_ROLE_PATTERNS).map(([id, pattern]) => [
      id,
      (text.match(pattern) ?? []).length,
    ]),
  );
}

function telActionLabels(html: string) {
  return [...html.matchAll(
    /<a\b[^>]*\bhref="tel:[^"]+"[^>]*>([\s\S]*?)<\/a>/gu,
  )].map((match) => visibleText(match[1]));
}

function expectedTelLabelCounts(labels: readonly string[]) {
  return Object.fromEntries(
    ALLOWED_TEL_ACTION_LABELS.map((label) => [
      label,
      labels.filter((candidate) => candidate === label).length,
    ]),
  );
}

function renderedCopyEntries(html: string, path: string) {
  const entries = [
    ...html.matchAll(
      /<([a-z][a-z0-9]*)\b[^>]*data-region-copy-id="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/giu,
    ),
  ].map((match) => ({
    id: decodeHtml(match[2]),
    value: visibleText(match[3]),
  }));
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`RANG_BUILT_RENDER_COPY_ID_DUPLICATE:${path}`);
  }
  return entries;
}

function capture(html: string, pattern: RegExp, label: string, path: string): string {
  const value = html.match(pattern)?.[1];
  if (!value) throw new Error(`RANG_BUILT_META_MISSING:${label}:${path}`);
  return decodeHtml(value).trim();
}

function captureRouteMetadata(
  html: string,
  route: string,
  path: string,
  keywords: string[] = [],
): RouteMetadataContract {
  const title = capture(html, /<title>([^<]+)<\/title>/u, "title", path);
  const description = capture(
    html,
    /<meta name="description" content="([^"]+)"/u,
    "description",
    path,
  );
  const canonical = capture(
    html,
    /<link rel="canonical" href="([^"]+)"/u,
    "canonical",
    path,
  );
  return {
    route,
    title,
    description,
    keywords,
    canonical,
    openGraph: {
      type: capture(html, /<meta property="og:type" content="([^"]+)"/u, "og:type", path),
      locale: capture(html, /<meta property="og:locale" content="([^"]+)"/u, "og:locale", path),
      siteName: capture(html, /<meta property="og:site_name" content="([^"]+)"/u, "og:site_name", path),
      title: capture(html, /<meta property="og:title" content="([^"]+)"/u, "og:title", path),
      description: capture(html, /<meta property="og:description" content="([^"]+)"/u, "og:description", path),
      url: capture(html, /<meta property="og:url" content="([^"]+)"/u, "og:url", path),
    },
    twitter: {
      card: capture(html, /<meta name="twitter:card" content="([^"]+)"/u, "twitter:card", path),
      title: capture(html, /<meta name="twitter:title" content="([^"]+)"/u, "twitter:title", path),
      description: capture(html, /<meta name="twitter:description" content="([^"]+)"/u, "twitter:description", path),
    },
  };
}

function assertIndexableRobots(html: string, path: string) {
  const value = capture(
    html,
    /<meta name="robots" content="([^"]+)"/u,
    "robots",
    path,
  );
  const directives = new Set(
    value.toLowerCase().split(",").map((directive) => directive.trim()),
  );
  if (
    !directives.has("index") ||
    !directives.has("follow") ||
    directives.has("noindex") ||
    directives.has("nofollow") ||
    directives.has("nocache")
  ) {
    throw new Error(`RANG_BUILT_ROBOTS_META:${path}:${value}`);
  }
}

function assertNaturalMetadata(
  metadata: RouteMetadataContract,
  pageKind: "region" | "fixed" | "article",
) {
  const { route, title, description, canonical, openGraph, twitter } = metadata;
  const minimumDescription = pageKind === "region" ? 90 : 25;
  const maximumDescription = pageKind === "region" ? 160 : 100;
  if (title.length < 8 || title.length > 60) {
    throw new Error(`RANG_BUILT_TITLE_LENGTH:${route}:${title.length}`);
  }
  if (description.length < minimumDescription || description.length > maximumDescription) {
    throw new Error(`RANG_BUILT_DESCRIPTION_LENGTH:${route}:${description.length}`);
  }
  if ((title.match(/랑테라피/gu) ?? []).length !== 1) {
    throw new Error(`RANG_BUILT_TITLE_BRAND_COUNT:${route}`);
  }
  if (!description.endsWith(".")) {
    throw new Error(`RANG_BUILT_DESCRIPTION_SENTENCE_END:${route}`);
  }
  const naturalSurface = [title, description, openGraph.title, openGraph.description, twitter.title, twitter.description].join("\n");
  if (
    /(?:undefined|NaN|\[object Object\]|\{\{|\}\}|—|[,.!?]{2,}|(?:folio|frame|movement)\s*[-#:·]?\s*\d+)/iu.test(
      naturalSurface,
    )
  ) {
    throw new Error(`RANG_BUILT_METADATA_UNNATURAL:${route}`);
  }
  if (
    canonical !== new URL(route, SITE_ORIGIN).href ||
    openGraph.type !== (pageKind === "article" ? "article" : "website") ||
    openGraph.locale !== "ko_KR" ||
    openGraph.siteName !== "랑테라피" ||
    openGraph.title !== title ||
    openGraph.description !== description ||
    openGraph.url !== canonical ||
    twitter.card !== "summary" ||
    twitter.title !== title ||
    twitter.description !== description
  ) {
    throw new Error(`RANG_BUILT_SOCIAL_METADATA_CONTRACT:${route}`);
  }
}

function assertSurfaceEqual(
  route: string,
  expected: ActualDomSurface,
  actual: ActualDomSurface,
) {
  for (const key of [
    "directText",
    "fullBlockText",
    "accessibilityText",
  ] as const) {
    const wanted = expected[key];
    const found = actual[key];
    if (wanted.length !== found.length) {
      throw new Error(
        `RANG_BUILT_ACTUAL_DOM_SURFACE_COUNT:${route}:${key}:${found.length}:${wanted.length}`,
      );
    }
    for (let index = 0; index < wanted.length; index += 1) {
      if (wanted[index] !== found[index]) {
        throw new Error(
          `RANG_BUILT_ACTUAL_DOM_SURFACE_VALUE:${route}:${key}:${index}:${JSON.stringify(wanted[index])}:${JSON.stringify(found[index])}`,
        );
      }
    }
  }
  if (expected.exactMultisetSha256 !== actual.exactMultisetSha256) {
    throw new Error(`RANG_BUILT_ACTUAL_DOM_SURFACE_SHA:${route}`);
  }
}

const files = await collectRegionHtml(AREAS_OUTPUT);
if (files.length !== EXPECTED_REGION_PAGES) {
  throw new Error(`RANG_BUILT_REGION_COUNT:${files.length}`);
}

const rows = await Promise.all(
  files.map(async (path) => {
    const html = await readFile(path, "utf8");
    assertIndexableRobots(html, path);
    const route = capture(
      html,
      /<main\b[^>]*data-region-route="([^"]+)"/u,
      "region-route",
      path,
    );
    const keywords = capture(
      html,
      /<meta name="keywords" content="([^"]+)"/u,
      "keywords",
      path,
    ).split(",");
    const metadata = captureRouteMetadata(html, `${route}/`, path, keywords);
    return {
      path,
      route,
      title: metadata.title,
      description: metadata.description,
      keywords,
      canonical: metadata.canonical,
      metadata,
      h1: capture(html, /<h1\b[^>]*>([^<]+)<\/h1>/u, "h1", path),
      renderedSurface: renderedCopyEntries(html, path),
      actualDomSurface: extractActualDomSurface(html),
      html,
      telActionLabels: telActionLabels(html),
    };
  }),
);

const corpusBuffer = await readFile(resolve(ROOT, "artifacts/content-corpus.json"));
const corpus = JSON.parse(corpusBuffer.toString("utf8")) as Corpus;
const corpusByRoute = new Map(
  corpus.documents.map((document) => [document.route, document]),
);
let renderedCopyEntriesChecked = 0;
let actualDomSurfaceEntriesChecked = 0;
for (const row of rows) {
  const document = corpusByRoute.get(row.route);
  if (!document) throw new Error(`RANG_BUILT_ROUTE_NOT_IN_CORPUS:${row.route}`);
  const expectedCanonical = new URL(
    `${row.route.replace(/\/$/u, "")}/`,
    SITE_ORIGIN,
  ).href;
  if (
    row.title !== document.title ||
    row.description !== document.description ||
    row.h1 !== document.h1 ||
    JSON.stringify(row.keywords) !== JSON.stringify(document.keywords) ||
    row.canonical !== expectedCanonical
  ) {
    throw new Error(`RANG_BUILT_REGION_META_EXACT:${row.route}`);
  }
  if (JSON.stringify(row.metadata) !== JSON.stringify(document.metadata)) {
    throw new Error(`RANG_BUILT_REGION_SOCIAL_META_EXACT:${row.route}`);
  }
  assertNaturalMetadata(row.metadata, "region");
  const expected = [...document.renderedSurface]
    .map(({ id, value }) => ({ id, value }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const actual = [...row.renderedSurface].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  if (expected.length !== actual.length) {
    throw new Error(
      `RANG_BUILT_RENDER_SURFACE_COUNT:${row.route}:${actual.length}:${expected.length}`,
    );
  }
  for (let index = 0; index < expected.length; index += 1) {
    const wanted = expected[index];
    const found = actual[index];
    if (wanted.id !== found.id || wanted.value !== found.value) {
      throw new Error(
        `RANG_BUILT_RENDER_SURFACE_MISMATCH:${row.route}:${wanted.id}:${found.id}`,
      );
    }
  }
  renderedCopyEntriesChecked += actual.length;
  assertSurfaceEqual(row.route, document.actualDomSurface, row.actualDomSurface);
  actualDomSurfaceEntriesChecked += row.actualDomSurface.counts.exactMultiset;
  const geographicValues = document.renderedSurface
    .filter((copy) => copy.classification === "geography")
    .map((copy) => copy.value);
  const roleCounts = builtRoleCounts(row.html, geographicValues);
  if (Object.values(roleCounts).some((count) => count !== 0)) {
    throw new Error(
      `RANG_BUILT_REGION_ROLE_DIRECTION:${row.route}:${JSON.stringify(roleCounts)}`,
    );
  }
  if (
    row.telActionLabels.length !== document.telActions.hrefCount ||
    row.telActionLabels.some(
      (label) => !ALLOWED_TEL_ACTION_LABELS.includes(
        label as (typeof ALLOWED_TEL_ACTION_LABELS)[number],
      ),
    ) ||
    JSON.stringify(document.telActions.allowedLabels) !==
      JSON.stringify(ALLOWED_TEL_ACTION_LABELS) ||
    JSON.stringify(document.telActions.labelCounts) !==
      JSON.stringify(expectedTelLabelCounts(row.telActionLabels)) ||
    document.telActions.mismatchedLabelCount !== 0
  ) {
    throw new Error(
      `RANG_BUILT_REGION_TEL_ACTION_LABEL:${row.route}:${JSON.stringify(row.telActionLabels)}`,
    );
  }
}
if (corpusByRoute.size !== rows.length) {
  throw new Error(
    `RANG_CORPUS_RENDER_ROUTE_COUNT:${corpusByRoute.size}:${rows.length}`,
  );
}

const titles = rows.map((row) => row.title);
const descriptions = rows.map((row) => row.description);
const headings = rows.map((row) => row.h1);
const keywords = rows.flatMap((row) => row.keywords);
const canonicals = rows.map((row) => row.canonical);

if (new Set(titles).size !== EXPECTED_REGION_PAGES) throw new Error("RANG_BUILT_TITLE_DUPLICATE");
if (new Set(descriptions).size !== EXPECTED_REGION_PAGES) throw new Error("RANG_BUILT_DESCRIPTION_DUPLICATE");
if (new Set(headings).size !== EXPECTED_REGION_PAGES) throw new Error("RANG_BUILT_H1_DUPLICATE");
const expectedKeywordCount = corpus.documents.reduce(
  (sum, document) => sum + document.keywords.length,
  0,
);
if (new Set(keywords).size !== expectedKeywordCount) {
  throw new Error("RANG_BUILT_KEYWORD_DUPLICATE");
}
if (new Set(canonicals).size !== EXPECTED_REGION_PAGES) throw new Error("RANG_BUILT_CANONICAL_DUPLICATE");

for (const row of rows) {
  const document = corpusByRoute.get(row.route);
  if (
    !document ||
    row.keywords.length !== document.keywords.length ||
    new Set(row.keywords).size !== document.keywords.length
  ) {
    throw new Error(`RANG_BUILT_KEYWORDS:${row.path}`);
  }
}

const staticHeadingRows = await Promise.all(
  STATIC_PAGE_OUTPUTS.map(async ({ kind, id, route, path }) => {
    const html = await readFile(path, "utf8");
    assertIndexableRobots(html, path);
    const sourceDocuments = kind === "article"
      ? corpus.articleDocuments
      : corpus.fixedDocuments;
    const fixedDocument = sourceDocuments.find(
      (document) => document.route === route,
    );
    if (!fixedDocument) {
      throw new Error(`RANG_BUILT_STATIC_NOT_IN_CORPUS:${kind}:${route}`);
    }
    const actualDomSurface = extractActualDomSurface(html);
    assertSurfaceEqual(route, fixedDocument.actualDomSurface, actualDomSurface);
    const builtKeywords = fixedDocument.metadata.keywords.length === 0
      ? []
      : capture(
          html,
          /<meta name="keywords" content="([^"]+)"/u,
          "keywords",
          path,
        ).split(",");
    const metadata = captureRouteMetadata(html, route, path, builtKeywords);
    const { title, description, canonical } = metadata;
    const expectedCanonical = new URL(
      route,
      SITE_ORIGIN,
    ).href;
    if (
      title !== fixedDocument.title ||
      description !== fixedDocument.description ||
      canonical !== expectedCanonical
    ) {
      throw new Error(`RANG_BUILT_STATIC_META_MISMATCH:${kind}:${route}`);
    }
    if (JSON.stringify(metadata) !== JSON.stringify(fixedDocument.metadata)) {
      throw new Error(`RANG_BUILT_STATIC_SOCIAL_META_EXACT:${kind}:${route}`);
    }
    assertNaturalMetadata(metadata, kind);
    const roleCounts = builtRoleCounts(html);
    if (Object.values(roleCounts).some((count) => count !== 0)) {
      throw new Error(
        `RANG_BUILT_STATIC_ROLE_DIRECTION:${kind}:${id}:${JSON.stringify(roleCounts)}`,
      );
    }
    const phoneLabels = telActionLabels(html);
    if (
      phoneLabels.length !== fixedDocument.telActions.hrefCount ||
      phoneLabels.some(
        (label) => !ALLOWED_TEL_ACTION_LABELS.includes(
          label as (typeof ALLOWED_TEL_ACTION_LABELS)[number],
        ),
      ) ||
      JSON.stringify(fixedDocument.telActions.allowedLabels) !==
        JSON.stringify(ALLOWED_TEL_ACTION_LABELS) ||
      JSON.stringify(fixedDocument.telActions.labelCounts) !==
        JSON.stringify(expectedTelLabelCounts(phoneLabels)) ||
      fixedDocument.telActions.mismatchedLabelCount !== 0
    ) {
      throw new Error(
        `RANG_BUILT_STATIC_TEL_ACTION_LABEL:${kind}:${id}:${JSON.stringify(phoneLabels)}`,
      );
    }
    const levels = [...html.matchAll(/<h([1-6])\b[^>]*>/gu)].map((match) =>
      Number(match[1])
    );
    if (levels.length === 0 || levels[0] !== 1) {
      throw new Error(`RANG_BUILT_STATIC_HEADING_START:${kind}:${id}:${levels.join(",")}`);
    }
    for (let index = 1; index < levels.length; index += 1) {
      if (levels[index] > levels[index - 1] + 1) {
        throw new Error(
          `RANG_BUILT_STATIC_HEADING_SKIP:${kind}:${id}:${levels[index - 1]}_TO_${levels[index]}`,
        );
      }
    }
    if (
      id === "pricing" &&
      (!html.includes('id="course-price-title"') ||
        !html.includes("랑 코스 시간·요금표"))
    ) {
      throw new Error("RANG_BUILT_PRICING_H2_MISSING");
    }
    return { kind, id, levels, roleCounts, actualDomSurface, phoneLabels, canonical, metadata };
  }),
);

if (corpus.fixedDocuments.length !== FIXED_PAGE_OUTPUTS.length) {
  throw new Error(
    `RANG_CORPUS_FIXED_ROUTE_COUNT:${corpus.fixedDocuments.length}:${FIXED_PAGE_OUTPUTS.length}`,
  );
}
if (corpus.articleDocuments.length !== BLOG_POST_OUTPUTS.length) {
  throw new Error(
    `RANG_CORPUS_BLOG_POST_ROUTE_COUNT:${corpus.articleDocuments.length}:${BLOG_POST_OUTPUTS.length}`,
  );
}
actualDomSurfaceEntriesChecked += staticHeadingRows.reduce(
  (sum, row) => sum + row.actualDomSurface.counts.exactMultiset,
  0,
);

const allMetadata = [
  ...rows.map((row) => row.metadata),
  ...staticHeadingRows.map((row) => row.metadata),
];
const expectedMetadataRoutes =
  EXPECTED_REGION_PAGES + FIXED_PAGE_OUTPUTS.length + BLOG_POST_OUTPUTS.length;
if (allMetadata.length !== expectedMetadataRoutes) {
  throw new Error(`RANG_BUILT_METADATA_ROUTE_COUNT:${allMetadata.length}`);
}
for (const field of ["title", "description", "canonical"] as const) {
  if (new Set(allMetadata.map((entry) => entry[field])).size !== allMetadata.length) {
    throw new Error(`RANG_BUILT_METADATA_NOT_UNIQUE:${field}`);
  }
}
if (
  new Set(allMetadata.map((entry) => entry.openGraph.title)).size !== allMetadata.length ||
  new Set(allMetadata.map((entry) => entry.openGraph.description)).size !== allMetadata.length ||
  new Set(allMetadata.map((entry) => entry.openGraph.url)).size !== allMetadata.length ||
  new Set(allMetadata.map((entry) => entry.twitter.title)).size !== allMetadata.length ||
  new Set(allMetadata.map((entry) => entry.twitter.description)).size !== allMetadata.length
) {
  throw new Error("RANG_BUILT_SOCIAL_METADATA_NOT_UNIQUE");
}

const robotsText = await readFile(ROBOTS_OUTPUT, "utf8");
if (
  !/^User-Agent:\s*\*\s*$/imu.test(robotsText) ||
  !/^Allow:\s*\/\s*$/imu.test(robotsText) ||
  /^Disallow:/imu.test(robotsText) ||
  !new RegExp(`^Host:\\s*${SITE_ORIGIN.replaceAll(".", "\\.")}\\s*$`, "imu").test(robotsText) ||
  !robotsText.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
) {
  throw new Error("RANG_BUILT_ROBOTS_TXT_PRODUCTION_CONTRACT");
}

const sitemapXml = await readFile(SITEMAP_OUTPUT, "utf8");
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(
  (match) => decodeHtml(match[1]),
);
if (
  sitemapUrls.length !== expectedMetadataRoutes ||
  new Set(sitemapUrls).size !== expectedMetadataRoutes ||
  sitemapUrls.some((url) => !url.startsWith(`${SITE_ORIGIN}/`))
) {
  throw new Error("RANG_BUILT_SITEMAP_PRODUCTION_CONTRACT");
}

const result = {
  schemaVersion: "rang-built-output-audit/v1",
  status: "PASS",
  platformId: "rang-therapy",
  corpusSha256: sha256(corpusBuffer),
  sourceManifestSha256: corpus.sourceManifestSha256,
  regionPages: rows.length,
  titles: new Set(titles).size,
  descriptions: new Set(descriptions).size,
  h1: new Set(headings).size,
  keywords: new Set(keywords).size,
  canonicals: new Set(canonicals).size,
  regionalMetaExactMismatches: 0,
  fixedMetaExactMismatches: 0,
  blogPostMetaExactMismatches: 0,
  metadataRoutes: allMetadata.length,
  metadataNaturalLanguageViolations: 0,
  metadataBrandViolations: 0,
  metadataUniquenessViolations: 0,
  openGraphExactMismatches: 0,
  openGraphUniqueTitles: new Set(allMetadata.map((entry) => entry.openGraph.title)).size,
  openGraphUniqueDescriptions: new Set(allMetadata.map((entry) => entry.openGraph.description)).size,
  openGraphUniqueUrls: new Set(allMetadata.map((entry) => entry.openGraph.url)).size,
  twitterExactMismatches: 0,
  twitterUniqueTitles: new Set(allMetadata.map((entry) => entry.twitter.title)).size,
  twitterUniqueDescriptions: new Set(allMetadata.map((entry) => entry.twitter.description)).size,
  canonicalMismatches: 0,
  robotsMetaMismatches: 0,
  robotsTxtMismatches: 0,
  sitemapHostMismatches: 0,
  renderedCopyRoutes: rows.length,
  renderedCopyEntriesChecked,
  renderCorpusMissing: 0,
  renderBuiltMissing: 0,
  actualDomSurfaceRoutes: rows.length + staticHeadingRows.length,
  actualDomSurfaceEntriesChecked,
  actualDomCorpusMissing: 0,
  actualDomBuiltMissing: 0,
  providerArrivalContactWaitingAssumptions: 0,
  serviceRecipientAddressRoleErrors: 0,
  customerPhysicalMovementAssumptions: 0,
  customerContactRoleDefects: 0,
  oldTelephoneNumberBanks: 0,
  oldServiceSpaceRequestBanks: 0,
  telActionLinks:
    rows.reduce((sum, row) => sum + row.telActionLabels.length, 0) +
    staticHeadingRows.reduce((sum, row) => sum + row.phoneLabels.length, 0),
  telActionLabelMismatches: 0,
  fixedPages: staticHeadingRows.filter((row) => row.kind === "fixed").length,
  blogPosts: staticHeadingRows.filter((row) => row.kind === "article").length,
  fixedHeadingSkips: 0,
  pricingHeadingLevels: staticHeadingRows.find((row) => row.id === "pricing")?.levels,
};
await writeFile(
  resolve(ROOT, "qa/content/built-output-audit.v1.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(result)}\n`);
