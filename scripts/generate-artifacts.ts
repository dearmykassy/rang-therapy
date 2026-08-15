import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage, { metadataContract as homeMetadata } from "../src/app/page";
import AreasPage, { metadataContract as areasMetadata } from "../src/app/areas/page";
import PricingPage, { metadataContract as pricingMetadata } from "../src/app/pricing/page";
import GuidePage, { metadataContract as guideMetadata } from "../src/app/guide/page";
import NoticePage, { metadataContract as noticeMetadata } from "../src/app/notice/page";
import BlogIndexPage, { metadataContract as blogMetadata } from "../src/app/blog/page";
import { BottomNav } from "../src/components/BottomNav";
import { RegionExperience } from "../src/components/RegionExperience";
import { SiteFooter } from "../src/components/SiteFooter";
import { SiteHeader } from "../src/components/SiteHeader";
import {
  BLOG_POSTS,
  findBlogPost,
  getBlogPostPath,
} from "../src/data/blog-posts";
import { PHONE_DISPLAY, PHONE_HREF } from "../src/lib/business";
import { buildDiversityAudit } from "../src/lib/content-quality";
import {
  actualDomSurfaceValues,
  extractActualDomSurface,
  type ActualDomSurface,
} from "../src/lib/dom-surface";
import { createRegionPageModel } from "../src/lib/region-page-model";
import {
  createRouteMetadataContract,
  PREVIEW_ORIGIN,
  SITE_NAME,
} from "../src/lib/metadata";
import { ACTIVE_REGION_NODES, getKeywordRegionLabel } from "../src/lib/regions";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "artifacts/content-corpus.json");
const IMAGE_RELEASE_RECEIPT_RELATIVE_PATH =
  "artifacts/image-release/rang-therapy-regional-release.v1.json";
const IMAGE_ASSIGNMENT_MANIFEST_RELATIVE_PATH =
  "src/data/regional-image-assignments.generated.json";
const IMAGE_RELEASE_DISTRIBUTION = {
  routes: 1291,
  assets: 130,
  maxReuse: 10,
  assetsAtTen: 121,
  assetsAtNine: 9,
} as const;
const IMAGE_PUBLIC_WEBP_COUNT = 390;

const SOURCE_PATHS = [
  "src/app/areas/[...segments]/page.tsx",
  "src/app/areas/page.tsx",
  "src/app/blog/[slug]/page.tsx",
  "src/app/blog/page.tsx",
  "src/app/guide/page.tsx",
  "src/app/globals.css",
  "src/app/layout.tsx",
  "src/app/notice/page.tsx",
  "src/app/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "src/components/RegionExperience.tsx",
  "src/components/RegionGallery.tsx",
  "src/components/BottomNav.tsx",
  "src/components/SiteFooter.tsx",
  "src/components/SiteHeader.tsx",
  "src/data/capital-regions.generated.json",
  "src/data/blog-posts.ts",
  IMAGE_ASSIGNMENT_MANIFEST_RELATIVE_PATH,
  "src/data/service-city-regions.generated.json",
  "src/lib/blog-schema.ts",
  "src/lib/business.ts",
  "src/lib/content.ts",
  "src/lib/content-quality.ts",
  "src/lib/dom-surface.ts",
  "src/lib/metadata.ts",
  "src/lib/region-page-model.ts",
  "src/lib/regional-image-runtime.ts",
  "src/lib/regions.ts",
] as const;

const FIXED_PAGES = [
  { route: "/", id: "home", component: HomePage, metadata: homeMetadata },
  { route: "/areas/", id: "areas", component: AreasPage, metadata: areasMetadata },
  { route: "/pricing/", id: "pricing", component: PricingPage, metadata: pricingMetadata },
  { route: "/guide/", id: "guide", component: GuidePage, metadata: guideMetadata },
  { route: "/notice/", id: "notice", component: NoticePage, metadata: noticeMetadata },
  { route: "/blog/", id: "blog", component: BlogIndexPage, metadata: blogMetadata },
] as const;

const ROUTE_COUNTS = {
  regions: ACTIVE_REGION_NODES.length,
  fixed: FIXED_PAGES.length,
  blogPosts: BLOG_POSTS.length,
  total: ACTIVE_REGION_NODES.length + FIXED_PAGES.length + BLOG_POSTS.length,
} as const;
const ALLOWED_TEL_ACTION_LABELS = ["전화상담", "☎ 전화상담", "☎ 상담", PHONE_DISPLAY] as const;

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

type UnknownRecord = Record<string, unknown>;

function imageReleaseError(code: string): never {
  throw new Error(`RANG_IMAGE_RELEASE_${code}`);
}

function imageRecord(value: unknown, code: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    imageReleaseError(code);
  }
  return value as UnknownRecord;
}

function imageArray(value: unknown, code: string): unknown[] {
  if (!Array.isArray(value)) imageReleaseError(code);
  return value;
}

function exactKeys(value: UnknownRecord, expected: string[], code: string) {
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(normalizedExpected)) {
    imageReleaseError(code);
  }
}

function assertImageDistribution(value: unknown, code: string) {
  const distribution = imageRecord(value, code);
  exactKeys(distribution, Object.keys(IMAGE_RELEASE_DISTRIBUTION), code);
  for (const [key, expected] of Object.entries(IMAGE_RELEASE_DISTRIBUTION)) {
    if (distribution[key] !== expected) imageReleaseError(`${code}_${key}`);
  }
  return distribution;
}

function blogPostMetadataContract(post: (typeof BLOG_POSTS)[number]) {
  const route = getBlogPostPath(post);
  const title = `${post.title} | ${SITE_NAME}`;
  const canonicalUrl = new URL(route, PREVIEW_ORIGIN).href;
  return {
    route,
    title,
    description: post.description,
    keywords: [],
    canonical: canonicalUrl,
    openGraph: {
      type: "article",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title,
      description: post.description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description: post.description,
    },
  } as const;
}

async function loadImageReleaseBoundary() {
  const configuredPath = process.env.RANG_IMAGE_RELEASE_RECEIPT?.trim();
  const inactiveIntegration = {
    activated: false,
    publicAssetManifestBound: false,
    routeAssignmentsBound: false,
  } as const;
  if (!configuredPath) {
    return {
      contractVersion: "rang-image-release-boundary/v1",
      status: "PENDING_EXTERNAL_RELEASE_RECEIPT",
      receipt: null,
      integration: inactiveIntegration,
      deploymentAllowed: false,
      deploymentBlockers: [
        "RELEASE_RECEIPT_NOT_BOUND",
        "PREVIEW_INVALID_ORIGIN_NO_APPROVED_DOMAIN",
      ],
    } as const;
  }

  const receiptPath = resolve(ROOT, configuredPath);
  if (receiptPath !== resolve(ROOT, IMAGE_RELEASE_RECEIPT_RELATIVE_PATH)) {
    imageReleaseError("RECEIPT_UNEXPECTED_PATH");
  }
  const receiptBuffer = await readFile(receiptPath);
  let receiptUnknown: unknown;
  try {
    receiptUnknown = JSON.parse(receiptBuffer.toString("utf8"));
  } catch {
    imageReleaseError("RECEIPT_INVALID_JSON");
  }
  const receipt = imageRecord(receiptUnknown, "RECEIPT_NOT_JSON_OBJECT");
  exactKeys(receipt, [
    "schemaVersion",
    "status",
    "platformKey",
    "assignmentManifest",
    "rootReview",
    "distribution",
    "sourceAssets",
  ], "RECEIPT_SCHEMA_KEYS");
  if (
    receipt.schemaVersion !== "rang-therapy-regional-image-release-receipt/v1" ||
    receipt.status !== "ROOT_APPROVED_RELEASED" ||
    receipt.platformKey !== "rang-therapy"
  ) {
    imageReleaseError("RECEIPT_IDENTITY");
  }
  const receiptDistribution = assertImageDistribution(
    receipt.distribution,
    "RECEIPT_DISTRIBUTION",
  );
  if (receiptDistribution.routes !== ACTIVE_REGION_NODES.length) {
    imageReleaseError("RECEIPT_ACTIVE_ROUTE_COUNT");
  }
  const receiptReview = imageRecord(receipt.rootReview, "RECEIPT_ROOT_REVIEW");
  exactKeys(
    receiptReview,
    ["relativePath", "sha256", "reviewer"],
    "RECEIPT_ROOT_REVIEW_KEYS",
  );
  if (
    receiptReview.relativePath !== "reviews/rang-therapy.regional-release-review.v1.json" ||
    receiptReview.reviewer !== "root" ||
    !/^[a-f0-9]{64}$/u.test(String(receiptReview.sha256 ?? ""))
  ) {
    imageReleaseError("RECEIPT_ROOT_REVIEW_BINDING");
  }
  const assignmentBinding = imageRecord(
    receipt.assignmentManifest,
    "RECEIPT_ASSIGNMENT_BINDING",
  );
  exactKeys(
    assignmentBinding,
    ["relativePath", "sha256"],
    "RECEIPT_ASSIGNMENT_BINDING_KEYS",
  );
  if (
    assignmentBinding.relativePath !== IMAGE_ASSIGNMENT_MANIFEST_RELATIVE_PATH ||
    !/^[a-f0-9]{64}$/u.test(String(assignmentBinding.sha256 ?? ""))
  ) {
    imageReleaseError("RECEIPT_ASSIGNMENT_BINDING_VALUE");
  }

  const manifestBuffer = await readFile(
    resolve(ROOT, IMAGE_ASSIGNMENT_MANIFEST_RELATIVE_PATH),
  );
  if (sha256(manifestBuffer) !== assignmentBinding.sha256) {
    imageReleaseError("ASSIGNMENT_MANIFEST_SHA256");
  }
  let manifestUnknown: unknown;
  try {
    manifestUnknown = JSON.parse(manifestBuffer.toString("utf8"));
  } catch {
    imageReleaseError("ASSIGNMENT_MANIFEST_INVALID_JSON");
  }
  const manifest = imageRecord(manifestUnknown, "ASSIGNMENT_MANIFEST_NOT_OBJECT");
  exactKeys(manifest, [
    "schemaVersion",
    "status",
    "platformKey",
    "rootReview",
    "derivativeProfiles",
    "paletteSource",
    "distribution",
    "routes",
  ], "ASSIGNMENT_MANIFEST_SCHEMA_KEYS");
  if (
    manifest.schemaVersion !== "rang-therapy-regional-image-assignments/v1" ||
    manifest.status !== "ROOT_APPROVED_RELEASED" ||
    manifest.platformKey !== "rang-therapy"
  ) {
    imageReleaseError("ASSIGNMENT_MANIFEST_IDENTITY");
  }
  assertImageDistribution(manifest.distribution, "ASSIGNMENT_MANIFEST_DISTRIBUTION");
  const manifestReview = imageRecord(
    manifest.rootReview,
    "ASSIGNMENT_MANIFEST_ROOT_REVIEW",
  );
  if (
    manifestReview.relativePath !== receiptReview.relativePath ||
    manifestReview.sha256 !== receiptReview.sha256 ||
    manifestReview.reviewer !== "root" ||
    manifestReview.routeAssignmentAuthorized !== true
  ) {
    imageReleaseError("ASSIGNMENT_MANIFEST_ROOT_REVIEW_BINDING");
  }

  const routes = imageRecord(manifest.routes, "ASSIGNMENT_MANIFEST_ROUTES");
  const routeEntries = Object.entries(routes);
  const activeRouteSet = new Set(ACTIVE_REGION_NODES.map((node) => node.path));
  if (
    routeEntries.length !== IMAGE_RELEASE_DISTRIBUTION.routes ||
    routeEntries.some(([route]) => !activeRouteSet.has(route))
  ) {
    imageReleaseError("ASSIGNMENT_MANIFEST_ROUTE_SET");
  }
  const reuseCounts = new Map<string, number>();
  const publicSources = new Set<string>();
  for (const [route, routeUnknown] of routeEntries) {
    const routeEntry = imageRecord(routeUnknown, `ASSIGNMENT_ROUTE_${route}`);
    const assetId = String(routeEntry.assetId ?? "");
    if (
      !/^rng-rgn-\d{3}-c01$/u.test(assetId) ||
      routeEntry.jobId !== assetId
    ) {
      imageReleaseError("ASSIGNMENT_ROUTE_ASSET_ID");
    }
    reuseCounts.set(assetId, (reuseCounts.get(assetId) ?? 0) + 1);
    const sources = imageRecord(routeEntry.sources, "ASSIGNMENT_ROUTE_SOURCES");
    exactKeys(sources, ["desktop", "tablet", "mobile"], "ASSIGNMENT_ROUTE_SOURCE_KEYS");
    for (const profile of ["desktop", "tablet", "mobile"] as const) {
      const source = String(sources[profile] ?? "");
      if (
        source !== `/assets/rang-therapy/regional/${assetId}/${profile}.webp`
      ) {
        imageReleaseError("ASSIGNMENT_ROUTE_SOURCE_PATH");
      }
      publicSources.add(source);
    }
  }
  const reuseValues = [...reuseCounts.values()];
  if (
    reuseCounts.size !== IMAGE_RELEASE_DISTRIBUTION.assets ||
    Math.max(...reuseValues) !== IMAGE_RELEASE_DISTRIBUTION.maxReuse ||
    reuseValues.filter((count) => count === 10).length !==
      IMAGE_RELEASE_DISTRIBUTION.assetsAtTen ||
    reuseValues.filter((count) => count === 9).length !==
      IMAGE_RELEASE_DISTRIBUTION.assetsAtNine ||
    publicSources.size !== IMAGE_PUBLIC_WEBP_COUNT
  ) {
    imageReleaseError("ASSIGNMENT_MANIFEST_COMPUTED_COUNTS");
  }

  const sourceAssets = imageArray(receipt.sourceAssets, "RECEIPT_SOURCE_ASSETS");
  const receiptAssetIds = new Set<string>();
  for (const sourceUnknown of sourceAssets) {
    const source = imageRecord(sourceUnknown, "RECEIPT_SOURCE_ASSET");
    exactKeys(source, [
      "jobId",
      "assetId",
      "sourceSha256",
      "sourceDimensions",
      "provenance",
    ], "RECEIPT_SOURCE_ASSET_KEYS");
    const assetId = String(source.assetId ?? "");
    if (
      !reuseCounts.has(assetId) ||
      source.jobId !== assetId ||
      !/^[a-f0-9]{64}$/u.test(String(source.sourceSha256 ?? "")) ||
      !/^\d+x\d+$/u.test(String(source.sourceDimensions ?? "")) ||
      source.provenance !==
        `public/assets/rang-therapy/regional/${assetId}/provenance.json`
    ) {
      imageReleaseError("RECEIPT_SOURCE_ASSET_BINDING");
    }
    receiptAssetIds.add(assetId);
  }
  if (
    sourceAssets.length !== IMAGE_RELEASE_DISTRIBUTION.assets ||
    receiptAssetIds.size !== IMAGE_RELEASE_DISTRIBUTION.assets
  ) {
    imageReleaseError("RECEIPT_SOURCE_ASSET_COUNTS");
  }
  await Promise.all([...publicSources].map(async (source) => {
    const file = await stat(resolve(ROOT, "public", source.slice(1)));
    if (!file.isFile()) imageReleaseError("PUBLIC_WEBP_NOT_FILE");
  }));
  if (!new URL(PREVIEW_ORIGIN).hostname.endsWith(".invalid")) {
    imageReleaseError("PREVIEW_DEPLOYMENT_BLOCKER_CHANGED");
  }

  return {
    contractVersion: "rang-image-release-boundary/v1",
    status: "ROOT_APPROVED_RELEASE_VALIDATED_INTEGRATED",
    receipt: {
      source: "RANG_IMAGE_RELEASE_RECEIPT",
      relativePath: IMAGE_RELEASE_RECEIPT_RELATIVE_PATH,
      sha256: sha256(receiptBuffer),
      semanticSha256: sha256(canonical(receipt)),
      schemaVersion: receipt.schemaVersion,
      status: receipt.status,
      platformKey: receipt.platformKey,
      rootReviewSha256: receiptReview.sha256,
      assignmentManifest: {
        relativePath: IMAGE_ASSIGNMENT_MANIFEST_RELATIVE_PATH,
        sha256: assignmentBinding.sha256,
        routes: routeEntries.length,
        assets: reuseCounts.size,
        publicWebps: publicSources.size,
      },
      distribution: IMAGE_RELEASE_DISTRIBUTION,
      contractInterpretation:
        "EXACT_V1_SCHEMA_STATUS_MANIFEST_COUNTS_AND_PUBLIC_ASSET_BINDING",
    },
    integration: {
      activated: true,
      publicAssetManifestBound: true,
      routeAssignmentsBound: true,
    },
    deploymentAllowed: false,
    deploymentBlockers: ["PREVIEW_INVALID_ORIGIN_NO_APPROVED_DOMAIN"],
  } as const;
}

function shellMarkup(child: React.ReactNode): string {
  return renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(SiteHeader),
      child,
      React.createElement(SiteFooter),
      React.createElement(BottomNav),
    ),
  );
}

function routeShellMarkup(route: string, child: React.ReactNode): string {
  try {
    return shellMarkup(child);
  } catch (error) {
    throw new Error(`RANG_STATIC_MARKUP_RENDER:${route}`, { cause: error });
  }
}

function normalizeModuleElementTypes(node: React.ReactNode): React.ReactNode {
  if (Array.isArray(node)) return node.map(normalizeModuleElementTypes);
  if (!React.isValidElement(node)) return node;
  const originalType = node.type as unknown;
  const moduleLikeType = originalType && typeof originalType === "object"
    ? originalType as { $$typeof?: symbol; default?: React.ElementType }
    : null;
  const type = moduleLikeType && !moduleLikeType.$$typeof && moduleLikeType.default
    ? moduleLikeType.default
    : node.type;
  const props = { ...(node.props as Record<string, unknown>) };
  const children = normalizeModuleElementTypes(props.children as React.ReactNode);
  delete props.children;
  if (node.key !== null) props.key = node.key;
  if (Array.isArray(children)) {
    return React.createElement(type as React.ElementType, props, ...children);
  }
  return children === undefined
    ? React.createElement(type as React.ElementType, props)
    : React.createElement(type as React.ElementType, props, children);
}

function blogPostArtifactElement(post: (typeof BLOG_POSTS)[number]) {
  const related = findBlogPost(post.relatedSlug);
  return React.createElement(
    "main",
    null,
    React.createElement(
      "header",
      { className: "page-intro article-intro" },
      React.createElement(
        "nav",
        { className: "article-breadcrumb", "aria-label": "현재 위치" },
        React.createElement("a", { href: "/" }, "홈"),
        React.createElement("i", { "aria-hidden": true }, "›"),
        React.createElement("a", { href: "/blog/" }, "블로그"),
      ),
      React.createElement("p", { className: "eyebrow" }, post.category.toUpperCase()),
      React.createElement("h1", null, post.title),
      React.createElement("p", null, post.description),
    ),
    React.createElement(
      "article",
      { className: "article-body" },
      React.createElement("p", null, post.intro),
      ...post.sections.map((section) =>
        React.createElement(
          "section",
          { className: "article-section", key: section.heading },
          React.createElement("h2", null, section.heading),
          ...section.paragraphs.map((paragraph) =>
            React.createElement("p", { key: paragraph }, paragraph),
          ),
        ),
      ),
      React.createElement(
        "aside",
        { className: "article-checklist", "aria-labelledby": "blog-checklist-title" },
        React.createElement("h2", { id: "blog-checklist-title" }, "통화 전 체크"),
        React.createElement(
          "ul",
          null,
          ...post.checklist.map((item) => React.createElement("li", { key: item }, item)),
        ),
      ),
      React.createElement(
        "nav",
        { className: "article-links", "aria-label": "관련 안내" },
        related
          ? React.createElement(
              "a",
              { href: getBlogPostPath(related) },
              `관련 글: ${related.title}`,
            )
          : null,
        React.createElement("a", { href: "/pricing/" }, "코스별 시간과 가격 보기"),
        React.createElement("a", { href: "/guide/" }, "출장마사지 이용 순서 보기"),
        React.createElement("a", { href: "/areas/" }, "서비스 지역 안내 보기"),
        React.createElement("a", { href: PHONE_HREF }, "전화상담"),
      ),
    ),
  );
}

function assertSurface(surface: ActualDomSurface, route: string) {
  if (
    surface.directText.length === 0 ||
    surface.fullBlockText.length === 0 ||
    surface.accessibilityText.length < 4 ||
    surface.counts.exactMultiset !== actualDomSurfaceValues(surface).length
  ) {
    throw new Error(`RANG_ACTUAL_DOM_SURFACE_INCOMPLETE:${route}`);
  }
}

function telActionAudit(markup: string, route: string) {
  const labels = [...markup.matchAll(
    /<a\b[^>]*\bhref="tel:[^"]+"[^>]*>([\s\S]*?)<\/a>/gu,
  )].map((match) =>
    match[1]
      .replace(/<[^>]+>/gu, " ")
      .replace(/&amp;/gu, "&")
      .replace(/\s+/gu, " ")
      .trim(),
  );
  if (
    labels.length === 0 ||
    labels.some(
      (label) => !ALLOWED_TEL_ACTION_LABELS.includes(
        label as (typeof ALLOWED_TEL_ACTION_LABELS)[number],
      ),
    )
  ) {
    throw new Error(
      `RANG_TEL_ACTION_LABEL:${route}:${JSON.stringify(labels)}`,
    );
  }
  return {
    hrefCount: labels.length,
    allowedLabels: ALLOWED_TEL_ACTION_LABELS,
    labelCounts: Object.fromEntries(
      ALLOWED_TEL_ACTION_LABELS.map((label) => [
        label,
        labels.filter((candidate) => candidate === label).length,
      ]),
    ),
    mismatchedLabelCount: 0,
  };
}

function assertDiversityAudit(
  audit: ReturnType<typeof buildDiversityAudit>,
  contents: ReturnType<typeof createRegionPageModel>["content"][],
) {
  const exactAudits = [
    audit.rawDocuments,
    audit.rawParagraphs,
  ];
  if (
    exactAudits.some(
      (entry) =>
        entry.total !== entry.unique ||
        entry.duplicateCount !== 0 ||
        entry.maximumFrequency !== 1,
    )
  ) {
    throw new Error("RANG_CORPUS_VISIBLE_EXACT_DUPLICATE");
  }
  if (
    audit.visibleSentenceReusePolicy.verdict !== "PASS" ||
    audit.visibleSentenceReusePolicy.overCapBucketCount !== 0 ||
    audit.visibleSentenceReusePolicy.crossFamilyBucketCount !== 0 ||
    audit.visibleSentenceReusePolicy.unwhitelistedBucketCount !== 0 ||
    audit.visibleSentenceReusePolicy.unapprovedExactValueBucketCount !== 0
  ) {
    throw new Error("RANG_CORPUS_VISIBLE_SENTENCE_REUSE_POLICY_FAILURE");
  }
  if (
    audit.regionalSentenceBanks.verdict !== "PASS" ||
    audit.regionalSentenceBanks.violations.length !== 0 ||
    audit.regionalSentenceBanks.rawExact.verdict !== "PASS" ||
    audit.regionalSentenceBanks.maximumFrequency >
      audit.regionalSentenceBanks.acceptedMaximumFrequency ||
    audit.regionalSentenceBanks.maximumRepeatedCoreTermFrequency >
      audit.regionalSentenceBanks.acceptedMaximumRepeatedCoreTermFrequency ||
    !Object.values(audit.regionalSentenceBanks.forbiddenPhraseCounts).every(
      (count) => count === 0,
    )
  ) {
    throw new Error("RANG_CORPUS_REGIONAL_SENTENCE_BANK_FAILURE");
  }
  if (
    audit.secondSentenceBanks.verdict !== "PASS" ||
    audit.secondSentenceBanks.violations.length !== 0 ||
    audit.secondSentenceBanks.maximumFrequency >
      audit.secondSentenceBanks.acceptedMaximumFrequency
  ) {
    throw new Error("RANG_CORPUS_SECOND_SENTENCE_BANK_FAILURE");
  }
  const seoTitleMigrationIsValid =
    audit.seoCopyBanks.rawTitles.verdict === "PASS" &&
    audit.seoCopyBanks.rawH1.verdict === "PASS" &&
    audit.seoCopyBanks.maximumTitleLength <= 60 &&
    audit.seoCopyBanks.violations.every(
      (violation) =>
        violation.familyId === "title" &&
        violation.reason === "EXPECTED_ONE_COMPLETE_TEMPLATE_MATCH_FOUND_0",
    ) &&
    contents.every((content) => {
      const match = content.title.match(/^(.+)출장마사지 (.+)출장안마 \| 랑테라피$/u);
      return match?.[1] === match?.[2];
    });
  if (
    !seoTitleMigrationIsValid ||
    audit.seoCopyBanks.maximumFrequency > audit.seoCopyBanks.acceptedMaximumFrequency
  ) {
    throw new Error("RANG_CORPUS_SEO_COPY_BANK_FAILURE");
  }
  if (
    audit.normalizedReusePolicy.verdict !== "PASS" ||
    Object.values({
      documents: audit.normalizedReusePolicy.documents,
      paragraphs: audit.normalizedReusePolicy.paragraphs,
      sentences: audit.normalizedReusePolicy.sentences,
    }).some(
      (entry) =>
        entry.verdict !== "PASS" ||
        entry.overCapBucketCount !== 0 ||
        entry.crossFamilyBucketCount !== 0 ||
        entry.unwhitelistedBucketCount !== 0,
    )
  ) {
    throw new Error("RANG_CORPUS_NORMALIZED_REUSE_POLICY_FAILURE");
  }
  if (
    [
      audit.sentenceSurface.corePhraseViolations,
      audit.sentenceSurface.actionDirectiveViolations,
      audit.sentenceSurface.lengthViolations,
      audit.sentenceSurface.mechanicalScaffoldViolations,
      audit.sentenceSurface.repeatedBigramViolations,
      audit.sentenceSurface.languageQualityViolations,
      audit.sentenceSurface.repeatedConditionalViolations,
      audit.sentenceSurface.repeatedConnectorViolations,
      audit.sentenceSurface.topicParticleViolations,
      audit.sentenceSurface.repeatedActionRootViolations,
    ].some((violations) => violations.length > 0) ||
    audit.sentenceSurface.adjacentSemanticDuplicateCount !== 0 ||
    audit.sentenceSurface.adjacentSemanticDuplicateViolations.length !== 0 ||
    audit.sentenceSurface.movementPatternCounts.customerPhysicalMovement !==
      ACTIVE_REGION_NODES.filter((node) =>
        /(?:이동|출발|도착|찾아가|오시는 길)/u.test(getKeywordRegionLabel(node)),
      ).length ||
    !Object.values(audit.sentenceSurface.rejectedMovementBankCounts).every(
      (count) => count === 0,
    ) ||
    !Object.values(audit.sentenceSurface.roleDirectionPatternCounts).every(
      (count) => count === 0,
    ) ||
    !Object.values(audit.sentenceSurface.knownDefectCounts).every(
      (count) => count === 0,
    )
  ) {
    throw new Error("RANG_CORPUS_SENTENCE_SURFACE_FAILURE");
  }
  if (
    audit.sentencePrefixes.verdict !== "PASS" ||
    audit.sentencePrefixes.overLimitBuckets.length > 0
  ) {
    throw new Error("RANG_CORPUS_SENTENCE_PREFIX_FAILURE");
  }
  if (
    audit.paragraphNgrams.verdict !== "PASS" ||
    audit.paragraphNgrams.paragraphsOverLimit.length > 0 ||
    audit.paragraphNgrams.paragraphsOverRegionMentionLimit.length > 0
  ) {
    throw new Error("RANG_CORPUS_PARAGRAPH_NGRAM_FAILURE");
  }
  if (
    Object.values(audit.intraDocumentNgrams).some(
      (entry) => entry.verdict !== "PASS" || entry.documentsOverLimit.length > 0,
    )
  ) {
    throw new Error("RANG_CORPUS_INTRA_DOCUMENT_NGRAM_FAILURE");
  }
  if (audit.sentenceSimilarity.automatedVerdict !== "PASS") {
    throw new Error("RANG_CORPUS_SENTENCE_SIMILARITY_FAILURE");
  }
}

async function main() {
  if (ACTIVE_REGION_NODES.length !== 1291) throw new Error(`RANG_CORPUS_ROUTE_COUNT:${ACTIVE_REGION_NODES.length}`);
  const sourceManifest = await Promise.all(SOURCE_PATHS.map(async (path) => ({ path, sha256: sha256(await readFile(resolve(ROOT, path))) })));
  const pageModels = ACTIVE_REGION_NODES.map((node) => createRegionPageModel(node));
  const contents = pageModels.map((model) => model.content);
  const diversityAudit = buildDiversityAudit(contents);
  assertDiversityAudit(diversityAudit, contents);
  const documents = ACTIVE_REGION_NODES.map((node, index) => {
    const content = contents[index];
    const renderedSurface = pageModels[index].renderedSurface;
    const metadata = createRouteMetadataContract(
      `${node.path}/`,
      content.title,
      content.description,
      content.keywords,
    );
    const corpusBodyItems = [
      content.eyebrow,
      content.h1,
      ...content.hooks,
      ...content.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
      ...content.ctaLabels,
    ];
    const renderedValues = new Set(renderedSurface.map((copy) => copy.value));
    const omittedBodyItems = corpusBodyItems.filter((value) => !renderedValues.has(value));
    if (omittedBodyItems.length > 0) {
      throw new Error(
        `RANG_CORPUS_BODY_NOT_RENDERED:${node.path}:${omittedBodyItems.join("|")}`,
      );
    }
    const markup = routeShellMarkup(
      node.path,
      React.createElement(RegionExperience, { node }),
    );
    const actualDomSurface = extractActualDomSurface(markup);
    const telActions = telActionAudit(markup, node.path);
    assertSurface(actualDomSurface, node.path);
    if (pageModels[index].semanticAdjacencyAudit.duplicateCount !== 0) {
      throw new Error(`RANG_REGION_HEADING_SEMANTIC_DUPLICATE:${node.path}`);
    }
    return {
      id: node.id,
      route: node.path,
      pageType: `region-${node.kind}`,
      regionId: node.id,
      regionName: node.displayName,
      regionAliases: node.aliases,
      keywordPrefixes: [getKeywordRegionLabel(node)],
      title: content.title,
      description: content.description,
      keywords: content.keywords,
      metadata,
      h1: content.h1,
      hooks: content.hooks,
      sections: content.sections,
      ctaLabels: content.ctaLabels,
      renderedSurface,
      semanticAdjacencyAudit: pageModels[index].semanticAdjacencyAudit,
      actualDomSurface,
      telActions,
    };
  });
  const fixedDocuments = FIXED_PAGES.map(({ route, id, component, metadata }) => {
    const markup = routeShellMarkup(
      route,
      normalizeModuleElementTypes(component()),
    );
    const actualDomSurface = extractActualDomSurface(markup);
    const telActions = telActionAudit(markup, route);
    assertSurface(actualDomSurface, route);
    return {
      id: `rang-fixed-${id}`,
      route,
      pageType: `fixed-${id}`,
      title: metadata.title,
      description: metadata.description,
      metadata,
      actualDomSurface,
      telActions,
    };
  });
  const articleDocuments = await Promise.all(BLOG_POSTS.map(async (post) => {
    const route = getBlogPostPath(post);
    const metadata = blogPostMetadataContract(post);
    const markup = routeShellMarkup(route, blogPostArtifactElement(post));
    const actualDomSurface = extractActualDomSurface(markup);
    const telActions = telActionAudit(markup, route);
    assertSurface(actualDomSurface, route);
    return {
      id: `rang-blog-post-${post.slug}`,
      route,
      pageType: "blog-post",
      title: metadata.title,
      description: metadata.description,
      metadata,
      actualDomSurface,
      telActions,
    };
  }));
  const allSurfaceDocuments = [...documents, ...fixedDocuments, ...articleDocuments];
  if (allSurfaceDocuments.length !== ROUTE_COUNTS.total) {
    throw new Error(
      `RANG_CORPUS_TOTAL_ROUTE_COUNT:${allSurfaceDocuments.length}:${ROUTE_COUNTS.total}`,
    );
  }
  const images = await loadImageReleaseBoundary();
  const corpus = {
    schemaVersion: "platform-content-corpus/v2",
    status: "COMPLETE",
    platformId: "rang-therapy",
    sourceManifest,
    sourceManifestSha256: sha256(canonical(sourceManifest)),
    counts: {
      documents: documents.length,
      fixedPages: fixedDocuments.length,
      blogPosts: articleDocuments.length,
      totalRoutes: allSurfaceDocuments.length,
      roots: documents.filter((document) => document.pageType === "region-root").length,
      hubs: documents.filter((document) => document.pageType === "region-hub").length,
      representatives: documents.filter((document) => document.pageType === "region-representative").length,
      titles: new Set(documents.map((document) => document.title)).size,
      descriptions: new Set(documents.map((document) => document.description)).size,
      h1: new Set(documents.map((document) => document.h1)).size,
      keywords: new Set(documents.flatMap((document) => document.keywords)).size,
      paragraphs: new Set(documents.flatMap((document) => document.sections.flatMap((section) => section.paragraphs))).size,
      renderedCopyEntries: documents.reduce(
        (sum, document) => sum + document.renderedSurface.length,
        0,
      ),
      actualDomSurfaceRoutes: allSurfaceDocuments.length,
      actualDomDirectText: allSurfaceDocuments.reduce(
        (sum, document) => sum + document.actualDomSurface.counts.directText,
        0,
      ),
      actualDomFullBlockText: allSurfaceDocuments.reduce(
        (sum, document) => sum + document.actualDomSurface.counts.fullBlockText,
        0,
      ),
      actualDomAccessibilityText: allSurfaceDocuments.reduce(
        (sum, document) => sum + document.actualDomSurface.counts.accessibilityText,
        0,
      ),
      actualDomExactMultiset: allSurfaceDocuments.reduce(
        (sum, document) => sum + document.actualDomSurface.counts.exactMultiset,
        0,
      ),
      telActionLinks: allSurfaceDocuments.reduce(
        (sum, document) => sum + document.telActions.hrefCount,
        0,
      ),
      telActionLabelMismatches: allSurfaceDocuments.reduce(
        (sum, document) => sum + document.telActions.mismatchedLabelCount,
        0,
      ),
      adjacentHeadingPairsInspected: documents.reduce(
        (sum, document) =>
          sum + document.semanticAdjacencyAudit.headingPairsInspected,
        0,
      ),
      adjacentHeadingSemanticDuplicates: documents.reduce(
        (sum, document) => sum + document.semanticAdjacencyAudit.duplicateCount,
        0,
      ),
    },
    diversityAudit,
    documents,
    fixedDocuments,
    articleDocuments,
    images,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  const rendered = `${JSON.stringify(corpus)}\n`;
  await writeFile(OUTPUT, rendered, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "COMPLETE", documents: documents.length, sha256: sha256(rendered), sourceManifestSha256: corpus.sourceManifestSha256 })}\n`);
}

await main();
