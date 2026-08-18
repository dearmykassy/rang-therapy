import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import corpus from "../artifacts/content-corpus.json";
import { FIXED_SITEMAP_PATHS } from "@/app/sitemap";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { PHONE_DISPLAY } from "@/lib/business";
import {
  createRegionContent,
  CURATED_H1_BANK,
  CURATED_REGIONAL_SENTENCE_BANKS,
  CURATED_SECOND_SENTENCE_BANKS,
  KEYWORD_FAMILIES,
} from "@/lib/content";
import {
  buildDiversityAudit,
  completeCustomerSentences,
  customerText,
  normalizeRegionalText,
  normalizedDocument,
  normalizedParagraphs,
  normalizedSentences,
} from "@/lib/content-quality";
import { createRegionPageModel } from "@/lib/region-page-model";
import { SITE_ORIGIN } from "@/lib/metadata";
import {
  assertPendingReviewPackets,
  REVIEW_SOURCE_PATHS,
  reviewSha256,
} from "@/lib/review-candidate";
import {
  ACTIVE_REGION_NODES,
  getOfficialRegionLabel,
  getSearchRegionLabel,
} from "@/lib/regions";

const contents = ACTIVE_REGION_NODES.map((node) => createRegionContent(node));
const pageModels = ACTIVE_REGION_NODES.map((node) => createRegionPageModel(node));
const documentById = new Map(corpus.documents.map((document) => [document.id, document]));
const REGION_ROUTE_COUNT = ACTIVE_REGION_NODES.length;
const FIXED_PAGE_ROUTES = [...FIXED_SITEMAP_PATHS];
const BLOG_POST_ROUTES = BLOG_POSTS.map(getBlogPostPath);
const TOTAL_ROUTE_COUNT =
  REGION_ROUTE_COUNT + FIXED_PAGE_ROUTES.length + BLOG_POST_ROUTES.length;
const allCorpusDocuments = [
  ...corpus.documents,
  ...corpus.fixedDocuments,
  ...corpus.articleDocuments,
];
const ALLOWED_TEL_ACTION_LABELS = ["전화상담", "☎ 전화상담", "☎ 상담", PHONE_DISPLAY];
const SEO_TITLE_GEOGRAPHIC_MOVEMENT_COUNT = ACTIVE_REGION_NODES.filter((node) =>
  /(?:이동|출발|도착|찾아가|오시는 길)/u.test(getSearchRegionLabel(node)),
).length;

function collectTsx(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? collectTsx(path)
      : entry.name.endsWith(".tsx")
        ? [path]
        : [];
  });
}

function hasBatchim(value: string): boolean {
  const last = [...value.normalize("NFC")].at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : false;
}

describe("rang content corpus", () => {
  it("is complete, deterministic, and bound to every generated customer document", () => {
    expect(corpus.status).toBe("COMPLETE");
    expect(corpus.platformId).toBe("rang-therapy");
    expect(corpus.schemaVersion).toBe("platform-content-corpus/v2");
    expect(corpus.counts.documents).toBe(REGION_ROUTE_COUNT);
    expect(corpus.counts.fixedPages).toBe(FIXED_PAGE_ROUTES.length);
    expect(corpus.counts.blogPosts).toBe(BLOG_POST_ROUTES.length);
    expect(corpus.counts.totalRoutes).toBe(TOTAL_ROUTE_COUNT);
    expect(corpus.counts.titles).toBe(REGION_ROUTE_COUNT);
    expect(corpus.counts.descriptions).toBe(REGION_ROUTE_COUNT);
    expect(corpus.counts.h1).toBe(REGION_ROUTE_COUNT);
    expect(corpus.counts.keywords).toBe(REGION_ROUTE_COUNT * KEYWORD_FAMILIES.length);
    expect(corpus.counts.paragraphs).toBe(REGION_ROUTE_COUNT * 12);
    expect(corpus.sourceManifest.length).toBeGreaterThan(0);
    expect(new Set(corpus.sourceManifest.map((entry) => entry.path)).size).toBe(
      corpus.sourceManifest.length,
    );
    expect(corpus.sourceManifest.map((entry) => entry.path)).toContain(
      "src/lib/region-page-model.ts",
    );
    expect(corpus.sourceManifest.map((entry) => entry.path)).toContain(
      "src/lib/dom-surface.ts",
    );
    expect(corpus.sourceManifest.map((entry) => entry.path)).toContain(
      "src/lib/metadata.ts",
    );
    expect(corpus.sourceManifest.map((entry) => entry.path)).toContain(
      "src/data/regional-image-assignments.generated.json",
    );
    expect(corpus.sourceManifest.map((entry) => entry.path)).toContain(
      "src/lib/regional-image-runtime.ts",
    );
    expect(corpus.sourceManifest.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["src/app/rss.xml/route.ts", "src/lib/rss.ts"]),
    );
    expect(corpus.fixedDocuments).toHaveLength(FIXED_PAGE_ROUTES.length);
    expect(corpus.articleDocuments).toHaveLength(BLOG_POST_ROUTES.length);
    expect(corpus.counts.actualDomSurfaceRoutes).toBe(TOTAL_ROUTE_COUNT);
    expect(corpus.counts.renderedCopyEntries).toBe(68293);
    expect(corpus.counts.actualDomDirectText).toBe(allCorpusDocuments.reduce(
      (sum, document) => sum + document.actualDomSurface.counts.directText,
      0,
    ));
    expect(corpus.counts.actualDomFullBlockText).toBe(allCorpusDocuments.reduce(
      (sum, document) => sum + document.actualDomSurface.counts.fullBlockText,
      0,
    ));
    expect(corpus.counts.actualDomAccessibilityText).toBe(allCorpusDocuments.reduce(
      (sum, document) => sum + document.actualDomSurface.counts.accessibilityText,
      0,
    ));
    expect(corpus.counts.actualDomExactMultiset).toBe(allCorpusDocuments.reduce(
      (sum, document) => sum + document.actualDomSurface.counts.exactMultiset,
      0,
    ));
    expect(corpus.counts.telActionLinks).toBe(allCorpusDocuments.reduce(
      (sum, document) => sum + document.telActions.hrefCount,
      0,
    ));
    expect(corpus.counts.telActionLabelMismatches).toBe(0);

    for (const [index, node] of ACTIVE_REGION_NODES.entries()) {
      const generated = contents[index];
      const artifact = documentById.get(node.id);
      expect(artifact).toBeDefined();
      if (!artifact) throw new Error(`RANG_TEST_CORPUS_DOCUMENT_MISSING:${node.id}`);
      expect(artifact).toMatchObject({
        route: node.path,
        title: generated.title,
        description: generated.description,
        keywords: generated.keywords,
        h1: generated.h1,
        hooks: generated.hooks,
        sections: generated.sections,
        ctaLabels: generated.ctaLabels,
        renderedSurface: pageModels[index].renderedSurface,
      });
      expect(artifact.actualDomSurface).toMatchObject({
        contractVersion: "rang-actual-dom-visible-multiset/v1",
      });
      expect(artifact.actualDomSurface.counts.exactMultiset).toBe(
        artifact.actualDomSurface.directText.length +
          artifact.actualDomSurface.fullBlockText.length +
          artifact.actualDomSurface.accessibilityText.length,
      );
      expect(artifact.actualDomSurface.exactMultisetSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(artifact.telActions).toEqual({
        hrefCount: 5,
        allowedLabels: ALLOWED_TEL_ACTION_LABELS,
        labelCounts: {
          전화상담: 3,
          "☎ 전화상담": 0,
          "☎ 상담": 1,
          [PHONE_DISPLAY]: 1,
        },
        mismatchedLabelCount: 0,
      });
    }
    expect(corpus.fixedDocuments.map((document) => document.route)).toEqual(
      FIXED_PAGE_ROUTES,
    );
    expect(corpus.articleDocuments.map((document) => document.route)).toEqual(
      BLOG_POST_ROUTES,
    );
    expect(corpus.fixedDocuments.every((document) =>
      document.actualDomSurface.contractVersion === "rang-actual-dom-visible-multiset/v1" &&
      document.actualDomSurface.counts.directText > 0 &&
      document.actualDomSurface.counts.fullBlockText > 0 &&
      document.actualDomSurface.counts.accessibilityText >= 4 &&
      document.telActions.hrefCount >= 2 &&
      JSON.stringify(document.telActions.allowedLabels) ===
        JSON.stringify(ALLOWED_TEL_ACTION_LABELS) &&
      document.telActions.mismatchedLabelCount === 0,
    )).toBe(true);
    expect(corpus.articleDocuments.every((document) =>
      document.pageType === "blog-post" &&
      document.metadata.openGraph.type === "article" &&
      document.actualDomSurface.contractVersion === "rang-actual-dom-visible-multiset/v1" &&
      document.telActions.hrefCount >= 2 &&
      JSON.stringify(document.telActions.allowedLabels) ===
        JSON.stringify(ALLOWED_TEL_ACTION_LABELS) &&
      document.telActions.mismatchedLabelCount === 0,
    )).toBe(true);
  });

  it("binds every corpus body item to the shared regional render model and exports every visible copy leaf", () => {
    let renderedEntries = 0;
    for (const [index, model] of pageModels.entries()) {
      const document = documentById.get(ACTIVE_REGION_NODES[index].id);
      expect(document).toBeDefined();
      expect(document?.renderedSurface).toEqual(model.renderedSurface);
      const ids = model.renderedSurface.map((copy) => copy.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(model.renderedSurface.every((copy) => copy.value.trim().length > 0)).toBe(true);

      const renderedValues = new Set(model.renderedSurface.map((copy) => copy.value));
      const bodyItems = [
        model.content.eyebrow,
        model.content.h1,
        ...model.content.hooks,
        ...model.content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
        ...model.content.ctaLabels,
      ];
      expect(bodyItems.every((value) => renderedValues.has(value))).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "opening:hook:1")).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "directory:heading")).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "directory:paragraph:0")).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "directory:paragraph:1")).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "directory:action")).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "gallery:heading")).toBe(true);
      expect(model.renderedSurface.some((copy) => copy.id === "gallery:summary")).toBe(true);
      renderedEntries += model.renderedSurface.length;
    }
    expect(corpus.counts.renderedCopyEntries).toBe(renderedEntries);
    expect(pageModels.every((model) =>
      model.semanticAdjacencyAudit.headingPairsInspected === 1 &&
      model.semanticAdjacencyAudit.duplicateCount === 0 &&
      model.semanticAdjacencyAudit.violations.length === 0,
    )).toBe(true);
    expect(corpus.counts.adjacentHeadingPairsInspected).toBe(REGION_ROUTE_COUNT);
    expect(corpus.counts.adjacentHeadingSemanticDuplicates).toBe(0);
  });

  it("keeps documents and paragraphs exact-unique while limiting reviewed sentence reuse to the same fact slot", () => {
    const audit = buildDiversityAudit(contents);
    const documents = contents.map(normalizedDocument);
    const paragraphs = contents.flatMap(normalizedParagraphs);

    expect(corpus.diversityAudit).toEqual(audit);
    expect(audit).toMatchObject({
      normalizer: "rang-location-number-count-strip/v3",
      rawDocuments: {
        total: REGION_ROUTE_COUNT,
        unique: REGION_ROUTE_COUNT,
        duplicateCount: 0,
        maximumFrequency: 1,
        verdict: "PASS",
      },
      rawParagraphs: {
        total: 15492,
        unique: 15492,
        duplicateCount: 0,
        maximumFrequency: 1,
        verdict: "PASS",
      },
      rawSentences: {
        total: 34857,
        unique: 19508,
        duplicateCount: 15349,
        maximumFrequency: 118,
        exactUniquenessRequired: false,
        exactUniquenessVerdict: "FAIL",
        evaluatedBy: "visibleSentenceReusePolicy",
        verdict: "PASS",
      },
      visibleSentenceReusePolicy: {
        policyVersion: "rang-visible-exact-section-slot-bank/v2",
        acceptedMaximumFrequency: 128,
        maximumFrequency: 118,
        crossFamilyBucketCount: 0,
        overCapBucketCount: 0,
        unwhitelistedBucketCount: 0,
        unapprovedExactValueBucketCount: 0,
        verdict: "PASS",
      },
      secondSentenceBanks: {
        policyVersion: "rang-section-slot-complete-sentence-bank/v1",
        acceptedMaximumFrequency: 128,
        bankCount: 12,
        sentenceCount: 143,
        maximumFrequency: 118,
        violations: [],
        verdict: "PASS",
      },
      regionalSentenceBanks: {
        policyVersion: "rang-region-first-complete-sentence-bank/v1",
        acceptedMaximumFrequency: 128,
        bankCount: 15,
        sentenceTemplateCount: 165,
        inspectedEntries: 19365,
        rawExact: {
          total: 19365,
          unique: 19365,
          duplicateCount: 0,
          maximumFrequency: 1,
          verdict: "PASS",
        },
        maximumFrequency: 118,
        maximumRepeatedCoreTermFrequency: 1,
        acceptedMaximumRepeatedCoreTermFrequency: 1,
        violations: [],
        verdict: "PASS",
      },
      seoCopyBanks: {
        policyVersion: "rang-seo-title-h1-complete-copy-bank/v1",
        acceptedMaximumFrequency: 128,
        bankCount: 2,
        templateCount: 22,
        maximumFrequency: 118,
        rawTitles: {
          total: REGION_ROUTE_COUNT,
          unique: REGION_ROUTE_COUNT,
          duplicateCount: 0,
          maximumFrequency: 1,
          verdict: "PASS",
        },
        rawH1: {
          total: REGION_ROUTE_COUNT,
          unique: REGION_ROUTE_COUNT,
          duplicateCount: 0,
          maximumFrequency: 1,
          verdict: "PASS",
        },
      },
      normalizedDocuments: {
        total: REGION_ROUTE_COUNT,
        unique: 339,
        duplicateCount: 952,
        maximumFrequency: 7,
      },
      normalizedParagraphs: {
        total: 15492,
        unique: 154,
        duplicateCount: 15338,
        maximumFrequency: 118,
      },
      normalizedSentences: {
        total: 34857,
        unique: 319,
        duplicateCount: 34538,
        maximumFrequency: 118,
      },
      normalizedReusePolicy: {
        verdict: "PASS",
        documents: {
          acceptedMaximumFrequency: 128,
          maximumFrequency: 7,
          crossFamilyBucketCount: 0,
          overCapBucketCount: 0,
          unwhitelistedBucketCount: 0,
          unapprovedExactValueBucketCount: 0,
          verdict: "PASS",
        },
        paragraphs: {
          acceptedMaximumFrequency: 128,
          maximumFrequency: 118,
          crossFamilyBucketCount: 0,
          overCapBucketCount: 0,
          unwhitelistedBucketCount: 0,
          unapprovedExactValueBucketCount: 0,
          verdict: "PASS",
        },
        sentences: {
          acceptedMaximumFrequency: 128,
          maximumFrequency: 118,
          crossFamilyBucketCount: 0,
          overCapBucketCount: 0,
          unwhitelistedBucketCount: 0,
          unapprovedExactValueBucketCount: 0,
          verdict: "PASS",
        },
      },
      sentenceSurface: {
        inspectedSentences: 34857,
        maximumCorePhraseFrequency: 1,
        maximumActionDirectives: 1,
        maximumRepeatedBigramFrequency: 1,
        adjacentSemanticDuplicateCount: 0,
        adjacentSemanticDuplicateViolations: [],
        movementPatternCounts: {
          customerPhysicalMovement: SEO_TITLE_GEOGRAPHIC_MOVEMENT_COUNT,
        },
        rejectedMovementBankCounts: {
          nextAppointmentTravelBuffer: 0,
          postVisitTravelPlan: 0,
          nextScheduleTravelTime: 0,
        },
        roleDirectionPatternCounts: {
          providerArrivalContactWaitingAssumption: 0,
          serviceRecipientAddressRoleError: 0,
        },
        verdict: "FAIL",
      },
      sentencePrefixes: {
        prefixTokens: 3,
        acceptedMaximumFrequency: 128,
        maximumFrequency: 118,
        overLimitBuckets: [],
        verdict: "PASS",
      },
      paragraphNgrams: {
        ngramSize: 4,
        acceptedMaximumFrequency: 1,
        maximumFrequency: 1,
        acceptedMaximumRegionMentions: 1,
        maximumRegionMentions: 1,
        paragraphsOverLimit: [],
        paragraphsOverRegionMentionLimit: [],
        verdict: "PASS",
      },
      sentenceSimilarity: {
        method:
          "same-curated-sentence-family distinct-normalized-and-verified-root-order-canonicalized word-trigram Jaccard over ordinal deltas 1,11,121,143",
        sentenceSlots: 27,
        candidatePairsBeforeExactReuseExclusion: 131976,
        skippedWhitelistedExactReusePairs: 92943,
        sampledPairs: 39033,
        humanReviewSampleMethod:
          "highest distinct-normalized candidate per sentence family, then top 12 across families",
        acceptanceThreshold: 0.75,
        maximumSimilarity: 0.222222,
        automatedVerdict: "PASS",
      },
    });
    expect(audit.geographicTermsRemoved).toBeGreaterThan(6000);
    expect(documents.every(Boolean)).toBe(true);
    expect(paragraphs.every(Boolean)).toBe(true);
    expect(Math.max(...Object.values(audit.intraDocumentNgrams).map((entry) => entry.maximumFrequency))).toBeLessThanOrEqual(2);
    expect(Object.values(audit.intraDocumentNgrams).every((entry) =>
      entry.verdict === "PASS" && entry.documentsOverLimit.length === 0,
    )).toBe(true);
    expect(audit.sentenceSurface.repeatedConditionalViolations).toEqual([]);
    expect(audit.sentenceSurface.repeatedConnectorViolations).toEqual([]);
    expect(audit.sentenceSurface.topicParticleViolations).toEqual([]);
    expect(audit.sentenceSurface.repeatedActionRootViolations).toEqual([]);
    expect(audit.sentenceSurface.adjacentSemanticDuplicateCount).toBe(0);
    expect(audit.sentenceSurface.adjacentSemanticDuplicateViolations).toEqual([]);
    expect(audit.sentenceSurface.movementPatternCounts.customerPhysicalMovement).toBe(
      SEO_TITLE_GEOGRAPHIC_MOVEMENT_COUNT,
    );
    expect(
      Object.values(audit.sentenceSurface.rejectedMovementBankCounts).every(
        (count) => count === 0,
      ),
    ).toBe(true);
    expect(
      Object.values(audit.sentenceSurface.roleDirectionPatternCounts).every(
        (count) => count === 0,
      ),
    ).toBe(true);
    expect(
      Object.values(audit.sentenceSurface.knownDefectCounts).every((count) => count === 0),
    ).toBe(true);
    expect(audit.sentenceSurface.knownDefectCounts).toMatchObject({
      oldTelephoneConsultNumberChangedBeforeInquiry: 0,
      oldNewTelephoneConsultNumberDuringCall: 0,
      oldTelephoneConsultNumberDigitCheck: 0,
      oldServiceSpaceRequestSeparation: 0,
      ambiguousCustomerContactNumberRole: 0,
    });
    expect(audit.sentencePrefixes.overLimitBuckets).toEqual([]);
    expect(audit.visibleSentenceReusePolicy.violationSamples).toEqual([]);
    const sentences = contents.flatMap(normalizedSentences);
    const visibleSentences = contents.flatMap(completeCustomerSentences);
    const visibleParagraphs = contents.flatMap((content) =>
      content.sections.flatMap((section) => section.paragraphs),
    );
    const paragraphSentences = contents.flatMap((content) =>
      content.sections.flatMap((section) =>
        section.paragraphs.flatMap((paragraph) =>
          paragraph.split(/(?<=[.!?])\s+/u).map((sentence) => sentence.trim()),
        ),
      ),
    );
    expect(sentences).toHaveLength(34857);
    expect(visibleSentences).toHaveLength(34857);
    expect(new Set(visibleSentences).size).toBe(19508);
    expect(audit.visibleSentenceReusePolicy.maximumFrequency).toBeLessThanOrEqual(128);
    expect(audit.visibleSentenceReusePolicy.unapprovedExactValueBucketCount).toBe(0);
    expect(audit.secondSentenceBanks.banks).toHaveLength(12);
    const registeredSecondSentenceBanks = Object.entries(CURATED_SECOND_SENTENCE_BANKS);
    expect(registeredSecondSentenceBanks).toHaveLength(12);
    expect(new Set(registeredSecondSentenceBanks.map(([familyId]) => familyId)).size).toBe(12);
    expect(registeredSecondSentenceBanks.every(([familyId, bank]) =>
      bank.sentences.length === (familyId === "frame-directory-first:p1:s1" ? 22 : 11),
    )).toBe(true);
    expect(audit.secondSentenceBanks.banks.every((bank) => {
      const expanded = bank.familyId === "frame-directory-first:p1:s1";
      return bank.sentenceCount === (expanded ? 22 : 11) &&
        bank.minimumFrequency >= (expanded ? 58 : 117) &&
        bank.maximumFrequency <= 128 &&
        bank.sentences.every((sentence) =>
          sentence.count >= (expanded ? 58 : 117) &&
          sentence.count <= 128 &&
          sentence.sentenceId.length > 0,
        );
    })).toBe(true);
    const registeredRegionalSentenceBanks = Object.entries(CURATED_REGIONAL_SENTENCE_BANKS);
    expect(registeredRegionalSentenceBanks).toHaveLength(15);
    expect(new Set(registeredRegionalSentenceBanks.map(([familyId]) => familyId)).size).toBe(15);
    expect(registeredRegionalSentenceBanks.every(([, bank]) => bank.length === 11)).toBe(true);
    expect(audit.regionalSentenceBanks.banks).toHaveLength(15);
    expect(audit.regionalSentenceBanks.banks.every((bank) =>
      bank.sentenceTemplateCount === 11 &&
      bank.minimumFrequency >= 117 &&
      bank.maximumFrequency <= 128 &&
      bank.sentenceTemplates.every((sentence) =>
        sentence.count >= 117 && sentence.count <= 128 && sentence.sentenceId.length > 0,
      ),
    )).toBe(true);
    expect(Object.values(audit.regionalSentenceBanks.forbiddenPhraseCounts).every((count) => count === 0)).toBe(true);
    expect(CURATED_H1_BANK).toHaveLength(11);
    expect(audit.seoCopyBanks.banks).toHaveLength(2);
    const titleBank = audit.seoCopyBanks.banks.find((bank) => bank.familyId === "title");
    const h1Bank = audit.seoCopyBanks.banks.find((bank) => bank.familyId === "h1");
    expect(titleBank?.sentenceTemplates.every((sentence) => sentence.count === 0)).toBe(true);
    expect(h1Bank &&
      h1Bank.templateCount === 11 &&
      h1Bank.minimumFrequency >= 117 &&
      h1Bank.maximumFrequency <= 128 &&
      h1Bank.sentenceTemplates.every((sentence) =>
        sentence.count >= 117 && sentence.count <= 128 && sentence.sentenceId.length > 0,
      ),
    ).toBe(true);
    expect(audit.seoCopyBanks.violations.every((violation) =>
      violation.familyId === "title" &&
      violation.reason === "EXPECTED_ONE_COMPLETE_TEMPLATE_MATCH_FOUND_0",
    )).toBe(true);
    expect(contents.every((content) => {
      const match = content.title.match(/^(.+)출장마사지 (.+)출장안마 \| 랑테라피$/u);
      return match?.[1] === match?.[2];
    })).toBe(true);
    expect(audit.seoCopyBanks.maximumTitleLength).toBeLessThanOrEqual(60);
    expect(audit.seoCopyBanks.maximumFrequency).toBeLessThanOrEqual(
      audit.seoCopyBanks.acceptedMaximumFrequency,
    );
    expect(audit.seoCopyBanks.rawTitles.verdict).toBe("PASS");
    expect(audit.seoCopyBanks.rawH1.verdict).toBe("PASS");
    expect(audit.seoCopyBanks.banks.filter((bank) => bank.familyId === "h1").every((bank) =>
      bank.templateCount === 11 &&
      bank.minimumFrequency >= 117 &&
      bank.maximumFrequency <= 128 &&
      bank.sentenceTemplates.every((sentence) =>
        sentence.count >= 117 && sentence.count <= 128 && sentence.sentenceId.length > 0,
      ),
    )).toBe(true);
    expect(contents.every((content) => !/(?:주소로 찾아가는|출발|도착|방문 관리$)/u.test(content.h1))).toBe(true);
    expect(contents.every((content) => !/방문 관리/u.test(`${content.title}\n${content.h1}`))).toBe(true);
    for (const [index, content] of contents.entries()) {
      const node = ACTIVE_REGION_NODES[index];
      const directoryHeading = content.sections.find(
        (section) => section.id === "frame-directory-first",
      )?.heading;
      if (node.kind === "representative") {
        expect(directoryHeading).toBe(`${getOfficialRegionLabel(node)}, 서비스 주소 확인`);
        expect(content.ctaLabels.at(-1)).toBe("상위 지역 다시 보기");
      } else {
        expect(directoryHeading).toContain("먼저 지역 찾기");
        expect(content.ctaLabels.at(-1)).toBe("다음 지역 찾기");
      }
    }
    expect(new Set(visibleParagraphs).size).toBe(visibleParagraphs.length);
    expect(paragraphSentences).toHaveLength(30984);
    const normalizedParagraphSentences = paragraphSentences.map(normalizeRegionalText);
    expect(normalizedParagraphSentences.every(Boolean)).toBe(true);
    expect(audit.sentenceSimilarity.topCandidates).toHaveLength(12);
    expect(audit.sentenceSimilarity.maximumSimilarity).toBeLessThan(0.75);
    expect(audit.sentenceSimilarity.topCandidates.every((candidate) =>
      candidate.similarity < 0.75 && candidate.left !== candidate.right && candidate.familyId.length > 0,
    )).toBe(true);
  });

  it("keeps historical external-review packets fail-closed when their corpus binding is stale", () => {
    const corpusBuffer = readFileSync(resolve("artifacts/content-corpus.json"));
    const corpusSha256 = createHash("sha256").update(corpusBuffer).digest("hex");
    const semanticPacket = JSON.parse(
      readFileSync(
        resolve("qa/content/normalized-sentence-semantic-review.v1.json"),
        "utf8",
      ),
    );
    const routePacket = JSON.parse(
      readFileSync(
        resolve("qa/content/curated-copy-human-review.v1.json"),
        "utf8",
      ),
    );
    const crossBuffer = readFileSync(
      resolve("qa/content/cross-platform-exact-audit.v1.json"),
    );
    const browserBuffer = readFileSync(resolve("qa/browser/report.json"));
    const sourceManifest = REVIEW_SOURCE_PATHS.map((path) => ({
      path,
      sha256: reviewSha256(readFileSync(resolve(path))),
    }));

    const validationArgs = {
      corpus,
      corpusBuffer,
      sourceManifest,
      crossReceiptSha256: reviewSha256(crossBuffer),
      browserReceiptSha256: reviewSha256(browserBuffer),
      semanticPacket,
      routePacket,
    };
    const packetsMatchCurrentCorpus =
      semanticPacket.corpusSha256 === corpusSha256 &&
      routePacket.corpusSha256 === corpusSha256 &&
      semanticPacket.corpusSourceManifestSha256 === corpus.sourceManifestSha256 &&
      routePacket.corpusSourceManifestSha256 === corpus.sourceManifestSha256;
    expect(semanticPacket).toMatchObject({
      schemaVersion:
        "rang-normalized-sentence-semantic-review-candidate/v5",
      status: "PENDING_EXTERNAL_HUMAN_REVIEW",
      platformId: "rang-therapy",
      candidateOnly: true,
      releaseEligible: false,
      decision: {
        status: "UNDECIDED",
        reviewer: null,
        reviewedAt: null,
        verdict: null,
        reason: null,
      },
    });
    expect(semanticPacket.candidates).toHaveLength(12);
    expect(
      semanticPacket.candidates.every(
        (candidate: {
          exactCandidate: Record<string, unknown>;
          exactCandidateSha256: string;
          reviewerDecision: null;
          reviewerReason: null;
        }) =>
          candidate.exactCandidateSha256 ===
            reviewSha256(JSON.stringify(candidate.exactCandidate)) &&
          candidate.reviewerDecision === null &&
          candidate.reviewerReason === null,
      ),
    ).toBe(true);

    expect(routePacket).toMatchObject({
      schemaVersion: "rang-curated-copy-human-review-candidate/v5",
      status: "PENDING_EXTERNAL_HUMAN_REVIEW",
      platformId: "rang-therapy",
      candidateOnly: true,
      releaseEligible: false,
      decision: {
        status: "UNDECIDED",
        reviewer: null,
        reviewedAt: null,
        verdict: null,
        reason: null,
      },
      automatedEvidenceOnly: {
        regionRoutes: REGION_ROUTE_COUNT,
        fixedRoutes: FIXED_PAGE_ROUTES.length,
        telActionLabelMismatches: 0,
        adjacentSemanticDuplicates: 0,
        humanDecisionInferred: false,
      },
    });
    expect(routePacket.selectedRoutes).toHaveLength(33);
    expect(
      new Set(
        routePacket.selectedRoutes.map((entry: { route: string }) => entry.route),
      ).size,
    ).toBe(33);
    for (const entry of routePacket.selectedRoutes as Array<{
      route: string;
      kind: string;
      documentIndex: number;
      sourceDocumentSha256: string;
      exactCandidateCopy: Record<string, unknown>;
      exactCandidateCopySha256: string;
      reviewerDecision: null;
      reviewerNotes: null;
    }>) {
      const document = corpus.documents[entry.documentIndex];
      if (packetsMatchCurrentCorpus) {
        expect(document.route).toBe(entry.route);
        expect(document.pageType).toBe(`region-${entry.kind}`);
        expect(entry.sourceDocumentSha256).toBe(
          reviewSha256(JSON.stringify(document)),
        );
      } else {
        expect(entry.sourceDocumentSha256).toMatch(/^[a-f0-9]{64}$/u);
      }
      expect(entry.exactCandidateCopySha256).toBe(
        reviewSha256(JSON.stringify(entry.exactCandidateCopy)),
      );
      expect(entry.reviewerDecision).toBeNull();
      expect(entry.reviewerNotes).toBeNull();
    }

    if (packetsMatchCurrentCorpus) {
      expect(() => assertPendingReviewPackets(validationArgs)).not.toThrow();
    } else {
      expect(() => assertPendingReviewPackets(validationArgs)).toThrow(
        /RANG_REVIEW_CANDIDATE_(?:SEMANTIC|ROUTE)_EXACT_MISMATCH/u,
      );
    }

    const falseApproval = structuredClone(routePacket);
    falseApproval.decision.verdict = "APPROVED";
    expect(() =>
      assertPendingReviewPackets({
        ...validationArgs,
        routePacket: falseApproval,
      }),
    ).toThrow(/RANG_REVIEW_CANDIDATE_(?:SEMANTIC|ROUTE)_EXACT_MISMATCH/u);
  });

  it("pins unique human SEO fields and every owned keyword head on every route", () => {
    const titles = corpus.documents.map((document) => document.title);
    const descriptions = corpus.documents.map((document) => document.description);
    const headings = corpus.documents.map((document) => document.h1);
    const allKeywords = corpus.documents.flatMap((document) => document.keywords);
    const folioPattern = /(?:folio|frame|movement)\s*[-#:·]?\s*\d+/iu;

    expect(new Set(titles).size).toBe(REGION_ROUTE_COUNT);
    expect(new Set(descriptions).size).toBe(REGION_ROUTE_COUNT);
    expect(new Set(headings).size).toBe(REGION_ROUTE_COUNT);
    expect(new Set(allKeywords).size).toBe(
      REGION_ROUTE_COUNT * KEYWORD_FAMILIES.length,
    );

    const allRouteMetadata = [
      ...corpus.documents.map((document) => document.metadata),
      ...corpus.fixedDocuments.map((document) => document.metadata),
      ...corpus.articleDocuments.map((document) => document.metadata),
    ];
    expect(allRouteMetadata).toHaveLength(TOTAL_ROUTE_COUNT);
    expect(new Set(allRouteMetadata.map((entry) => entry.title)).size).toBe(TOTAL_ROUTE_COUNT);
    expect(new Set(allRouteMetadata.map((entry) => entry.description)).size).toBe(TOTAL_ROUTE_COUNT);
    expect(new Set(allRouteMetadata.map((entry) => entry.canonical)).size).toBe(TOTAL_ROUTE_COUNT);
    expect(new Set(allRouteMetadata.map((entry) => entry.openGraph.url)).size).toBe(TOTAL_ROUTE_COUNT);
    expect(new Set(allRouteMetadata.map((entry) => entry.twitter.title)).size).toBe(TOTAL_ROUTE_COUNT);

    for (const document of corpus.documents) {
      expect(document.title.length).toBeGreaterThan(0);
      expect(document.title.length).toBeLessThanOrEqual(60);
      expect(document.description.length).toBeGreaterThanOrEqual(90);
      expect(document.description.length).toBeLessThanOrEqual(160);
      expect(document.h1.trim().length).toBeGreaterThan(0);
      expect(document.title.match(/랑테라피/gu)).toHaveLength(1);
      expect(document.keywordPrefixes).toHaveLength(1);
      expect(document.keywords).toEqual(
        KEYWORD_FAMILIES.map((family) => `${document.keywordPrefixes[0]}${family}`),
      );
      expect(new Set(document.keywords).size).toBe(KEYWORD_FAMILIES.length);
      expect(
        folioPattern.test(
          [document.title, document.description, document.h1, ...document.keywords].join(" "),
        ),
      ).toBe(false);
      expect(new Set(document.sections.map((section) => section.id)).size).toBe(6);
      expect(document.metadata).toMatchObject({
        route: `${document.route}/`,
        title: document.title,
        description: document.description,
        keywords: document.keywords,
        canonical: `${SITE_ORIGIN}${document.route}/`,
        openGraph: {
          type: "website",
          locale: "ko_KR",
          siteName: "랑테라피",
          title: document.title,
          description: document.description,
          url: `${SITE_ORIGIN}${document.route}/`,
        },
        twitter: {
          card: "summary",
          title: document.title,
          description: document.description,
        },
      });
    }

    expect(corpus.fixedDocuments.every((document) =>
      document.metadata.title === document.title &&
      document.metadata.description === document.description &&
      document.metadata.openGraph.title === document.title &&
      document.metadata.openGraph.description === document.description &&
      document.metadata.twitter.card === "summary" &&
      document.metadata.twitter.title === document.title &&
      document.metadata.twitter.description === document.description &&
      document.metadata.canonical === document.metadata.openGraph.url &&
      (document.title.match(/랑테라피/gu) ?? []).length === 1,
    )).toBe(true);

    const regionMetadataSource = readFileSync(
      resolve("src/app/areas/[...segments]/page.tsx"),
      "utf8",
    );
    expect(regionMetadataSource).toContain("createRouteMetadataContract(");
    expect(regionMetadataSource).toContain("toNextMetadata(");
  });

  it("keeps Korean particles and sentence surfaces grammatical", () => {
    const geographicTerms = [
      ...new Set(
        ACTIVE_REGION_NODES.flatMap((node) => [
          node.qualifiedName,
          node.displayName,
          ...node.aliases,
          ...node.records.flatMap((record) => [
            record.sidoName,
            record.municipality,
            record.district ?? "",
            record.officialSigungu,
            record.name,
            ...record.sourceNames,
            ...record.legalAreas.map((area) => area.name),
          ]),
        ]).filter((value) => value.length >= 2),
      ),
    ].sort((left, right) => right.length - left.length);
    const escaped = geographicTerms.map((term) =>
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const particlePattern = new RegExp(
      `(${escaped.join("|")})(은|는|이|가|을|를|과|와)(?=[\\s,.!?·]|$)`,
      "gu",
    );

    for (const content of contents) {
      const text = customerText(content).join("\n");
      expect(completeCustomerSentences(content)).toHaveLength(27);
      for (const match of text.matchAll(particlePattern)) {
        const [, term, particle] = match;
        const batchim = hasBatchim(term);
        const expected =
          particle === "은" || particle === "는"
            ? batchim
              ? "은"
              : "는"
            : particle === "이" || particle === "가"
              ? batchim
                ? "이"
                : "가"
              : particle === "을" || particle === "를"
                ? batchim
                  ? "을"
                  : "를"
                : batchim
                  ? "과"
                  : "와";
        expect(particle, `${term}${particle}`).toBe(expected);
      }

      for (const section of content.sections) {
        for (const paragraph of section.paragraphs) {
          expect(paragraph.length).toBeGreaterThanOrEqual(50);
          expect(paragraph.length).toBeLessThanOrEqual(220);
          expect(paragraph.endsWith(".")).toBe(true);
          expect(paragraph).not.toMatch(/undefined|NaN|\[object Object\]|\{\{|\}\}|\s{2,}|[,.!?]{2,}/u);
          expect(paragraph).not.toMatch(/—|구분이\s+구분|차이가\s+차이|대표 좌표|현재 좌표|세부 좌표/u);
        }
      }
    }
  });

  it("exposes neither production mechanics nor another platform brand in source or corpus copy", () => {
    const files = [
      ...collectTsx(resolve("src/app")),
      ...collectTsx(resolve("src/components")),
    ];
    const visibleSources = files
      .map((path) =>
        readFileSync(path, "utf8").replace(/data-(?:image|palette)-state="[^"]+"/g, ""),
      )
      .join("\n");
    const corpusCopy = contents.flatMap(customerText).join("\n");
    const regionalRenderedCopy = pageModels.flatMap((model) =>
      model.renderedSurface.map((copy) => copy.value),
    ).join("\n");
    const actualDomCopy = [
      ...corpus.documents,
      ...corpus.fixedDocuments,
      ...corpus.articleDocuments,
    ].flatMap((document) => [
      ...document.actualDomSurface.directText,
      ...document.actualDomSurface.fullBlockText,
      ...document.actualDomSurface.accessibilityText,
    ]).join("\n");
    const regionalActualDomCopyWithoutGeography = normalizeRegionalText(
      corpus.documents.flatMap((document) => [
        ...document.actualDomSurface.directText,
        ...document.actualDomSurface.fullBlockText,
        ...document.actualDomSurface.accessibilityText,
      ]).join("\n"),
    );
    const forbiddenMechanics = [
      "이미지 준비",
      "이미지 전용",
      "이미지를",
      "사진은",
      "생성 단계",
      "이미지 정제",
      "정제 MCP",
      "승인을 마친",
      "템플릿",
      "원장",
      "중복 감사",
      "공식 API",
      "공식 채널 직접확인",
      "페이지 구조",
      "내부 분류",
      "전체 플랫폼",
      "전체 플랫폼 공통",
      "첫 선택 화면",
      "목적지 카드",
      "이용 요청을 시작하는 문장",
      "안내 범위",
      "첫 갈래",
      "대표 좌표",
      "현재 좌표",
      "세부 좌표",
      "페이지의 가격",
      "대표동마다",
      "복제하지",
      "편집 범위",
      "검증한 정보만",
      "파이프라인",
      "코퍼스",
    ];
    const otherBrands = [
      "마사지봄",
      "스타 토닥이",
      "스타토닥이",
      "마사지러브",
      "마사지 러브",
      "혼혈 러브 마사지",
      "혼혈러브마사지",
      "마사지킹",
      "콜미 마사지",
      "건마에반하다",
      "필링홈타이",
      "촉촉마사지",
    ];

    for (const phrase of [...forbiddenMechanics, ...otherBrands]) {
      expect(visibleSources, phrase).not.toContain(phrase);
      expect(corpusCopy, phrase).not.toContain(phrase);
      expect(regionalRenderedCopy, phrase).not.toContain(phrase);
    }
    expect(corpusCopy).not.toMatch(
      /(?:\d+|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*개\s+(?:하위|세부|첫)\s*지역/u,
    );
    expect(`${visibleSources}\n${corpusCopy}\n${regionalRenderedCopy}`).not.toMatch(
      /(?:관리사|테라피스트|방문 연락|도착[^.!?]{0,40}연락|연락[^.!?]{0,40}(?:기다리|대기)|연락을 놓치|연락받을 (?:사람|번호)|서비스 중 연락|전화받기 어려운|전화받을 수 있는 상태|휴대전화를 가까이|방문 예정 (?:시간|시각)|머무는|체류 주소|체류 지역)/u,
    );
    expect(actualDomCopy).not.toMatch(
      /(?:실제 주소|상세 위치|방문 가능 여부|오늘 방문할 수 있는지|방문 가능 시각|방문 조건에는|연락처와 이용 인원을 챙겨 주세요)/u,
    );
    expect(regionalActualDomCopyWithoutGeography).not.toMatch(
      /(?:관리사|테라피스트|방문 연락|도착[^.!?]{0,40}연락|연락[^.!?]{0,40}(?:기다리|대기)|연락을 놓치|연락받을 (?:사람|번호)|서비스 중 연락|전화받기 어려운|전화받을 수 있는 상태|휴대전화를 가까이|방문 예정 (?:시간|시각)|머무는|머물(?:고|러)|체류 주소|체류 지역)/u,
    );
    expect(actualDomCopy).not.toMatch(
      /(?:전화상담 번호가 바뀌었다면 문의 전에 새 번호|새 전화상담 번호는 기존 번호가 바뀐 경우 통화 중|전화상담 번호의 숫자가 맞는지|서비스 공간 요청은[^.!?]{0,80}구분해|전화 연결|전화로 박자 맞추기|랑에게 일정 건네기)/u,
    );
    expect(corpusCopy).not.toContain("지역 갤러리");
    expect(corpusCopy).not.toMatch(/이 지역|지역 간 연결/u);
    expect(corpusCopy).not.toMatch(/예약 내역|목적지|방문 위치/u);
    const corpusCopyWithoutRouteLabels = contents.flatMap((content, index) => {
      const node = ACTIVE_REGION_NODES[index];
      const routeLabel = getOfficialRegionLabel(node);
      return customerText(content).map((value) => value.replaceAll(routeLabel, " "));
    }).join("\n");
    expect(corpusCopyWithoutRouteLabels).not.toMatch(
      /(?:이동|출발|도착|찾아가|오시는 길)/u,
    );
    expect(corpusCopy).not.toMatch(
      /(?:다음 약속이 있다면 이동에 필요한 시간도 비워 두는 편이 좋습니다|방문 뒤 이동 계획이 있다면 충분한 여유를 남겨 주세요|코스의 시작 시각과 다음 일정까지의 이동 시간을 하루 계획에 넣으세요)/u,
    );
  });

  it("binds the approved regional image release while keeping public deployment blocked", () => {
    const releaseReceiptBuffer = readFileSync(
      resolve("artifacts/image-release/rang-therapy-regional-release.v1.json"),
    );
    const assignmentManifestBuffer = readFileSync(
      resolve("src/data/regional-image-assignments.generated.json"),
    );
    const releaseReceipt = JSON.parse(releaseReceiptBuffer.toString("utf8"));
    const assignmentManifest = JSON.parse(
      assignmentManifestBuffer.toString("utf8"),
    ) as {
      schemaVersion: string;
      status: string;
      platformKey: string;
      distribution: Record<string, number>;
      routes: Record<string, {
        assetId: string;
        sources: Record<string, string>;
      }>;
    };
    const imageState = corpus.images as unknown as {
      status: string;
      receipt: {
        source: string;
        relativePath: string;
        contractInterpretation: string;
        sha256: string;
        semanticSha256: string;
        schemaVersion: string;
        status: string;
        platformKey: string;
        rootReviewSha256: string;
        assignmentManifest: {
          relativePath: string;
          sha256: string;
          routes: number;
          assets: number;
          publicWebps: number;
        };
        distribution: Record<string, number>;
      };
    };
    expect(imageState).toMatchObject({
      contractVersion: "rang-image-release-boundary/v1",
      status: "ROOT_APPROVED_RELEASE_VALIDATED_INTEGRATED",
      deploymentAllowed: true,
      deploymentBlockers: [],
      integration: {
        activated: true,
        publicAssetManifestBound: true,
        routeAssignmentsBound: true,
      },
    });
    expect(imageState.receipt).toMatchObject({
      source: "RANG_IMAGE_RELEASE_RECEIPT",
      relativePath:
        "artifacts/image-release/rang-therapy-regional-release.v1.json",
      schemaVersion: "rang-therapy-regional-image-release-receipt/v1",
      status: "ROOT_APPROVED_RELEASED",
      platformKey: "rang-therapy",
      assignmentManifest: {
        relativePath: "src/data/regional-image-assignments.generated.json",
        routes: REGION_ROUTE_COUNT,
        assets: 130,
        publicWebps: 390,
      },
      distribution: {
        routes: REGION_ROUTE_COUNT,
        assets: 130,
        maxReuse: 10,
        assetsAtTen: 121,
        assetsAtNine: 9,
      },
      contractInterpretation:
        "EXACT_V1_SCHEMA_STATUS_MANIFEST_COUNTS_AND_PUBLIC_ASSET_BINDING",
    });
    expect(imageState.receipt.sha256).toBe(
      createHash("sha256").update(releaseReceiptBuffer).digest("hex"),
    );
    expect(imageState.receipt.assignmentManifest.sha256).toBe(
      createHash("sha256").update(assignmentManifestBuffer).digest("hex"),
    );
    expect(imageState.receipt.semanticSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(imageState.receipt.rootReviewSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(releaseReceipt).toMatchObject({
      schemaVersion: imageState.receipt.schemaVersion,
      status: imageState.receipt.status,
      platformKey: imageState.receipt.platformKey,
      assignmentManifest: {
        relativePath: imageState.receipt.assignmentManifest.relativePath,
        sha256: imageState.receipt.assignmentManifest.sha256,
      },
      distribution: imageState.receipt.distribution,
    });
    expect(assignmentManifest).toMatchObject({
      schemaVersion: "rang-therapy-regional-image-assignments/v1",
      status: "ROOT_APPROVED_RELEASED",
      platformKey: "rang-therapy",
      distribution: imageState.receipt.distribution,
    });
    const routeAssignments = Object.values(assignmentManifest.routes);
    expect(routeAssignments).toHaveLength(REGION_ROUTE_COUNT);
    expect(new Set(routeAssignments.map((entry) => entry.assetId)).size).toBe(130);
    expect(new Set(routeAssignments.flatMap((entry) =>
      Object.values(entry.sources),
    )).size).toBe(390);
  });
});
