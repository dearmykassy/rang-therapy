import {
  CONTENT_CORE_PHRASES,
  CURATED_H1_BANK,
  CURATED_REGIONAL_SENTENCE_BANKS,
  CURATED_SECOND_SENTENCE_BANKS,
  CURATED_TITLE_BANK,
  type CuratedRegionalSentenceFamily,
  type CuratedSecondSentenceFamily,
  type RegionContent,
} from "@/lib/content";
import {
  ACTIVE_REGION_NODES,
  ROOT_LABELS,
  getOfficialRegionLabel,
  getSearchRegionLabel,
} from "@/lib/regions";

const GEOGRAPHIC_TERMS = [
  ...ACTIVE_REGION_NODES.flatMap((node) => [
    node.displayName,
    node.qualifiedName,
    getOfficialRegionLabel(node),
    getSearchRegionLabel(node),
    ...node.aliases,
    ...node.segments,
    ...node.records.flatMap((record) => [
      record.sidoName,
      record.municipality,
      record.district ?? "",
      record.officialSigungu,
      record.name,
      ...record.sourceNames,
      ...record.pathSegments,
      ...record.legalAreas.map((area) => area.name),
    ]),
  ]),
  ...Object.values(ROOT_LABELS).flatMap((label) => [label.full, label.short]),
]
  .map((term) => term.normalize("NFC").trim())
  .filter((term) => term.length >= 2);

const UNIQUE_GEOGRAPHIC_TERMS = [...new Set(GEOGRAPHIC_TERMS)].sort(
  (left, right) => right.length - left.length || left.localeCompare(right, "ko"),
);

const GEOGRAPHIC_PATTERN = new RegExp(
  UNIQUE_GEOGRAPHIC_TERMS.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "gu",
);

const KOREAN_COUNT_PATTERN =
  /(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(?:개|명|분|시간|회|번|번째|칸|가지)/gu;

export const CONTENT_NORMALIZER_VERSION = "rang-location-number-count-strip/v3";

export function normalizeRegionalText(value: string): string {
  return value
    .normalize("NFC")
    .replace(GEOGRAPHIC_PATTERN, " ")
    .replace(/[0-9０-９][0-9０-９,.:/-]*\s*(?:개|명|분|시간|회|번|번째|칸|가지)?/gu, " ")
    .replace(KOREAN_COUNT_PATTERN, " ")
    .replace(/[\s·,.:;!?"'“”‘’()[\]{}|/\\…↗—–-]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function customerText(content: RegionContent): string[] {
  return [
    content.title,
    content.description,
    content.h1,
    ...content.hooks,
    ...content.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...content.ctaLabels,
  ];
}

export function normalizedParagraphs(content: RegionContent): string[] {
  return content.sections.flatMap((section) =>
    section.paragraphs.map((paragraph) => normalizeRegionalText(paragraph)),
  );
}

export function completeCustomerSentences(content: RegionContent): string[] {
  return customerSentenceEntries(content).map((entry) => entry.value);
}

const SECTION_IDS = [
  "frame-directory-first",
  "pulse-coordinate-note",
  "tempo-time-window",
  "score-course-ledger",
  "settlement-last-beat",
  "coda-before-arrival",
] as const;

function completeSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[.!?]$/u.test(sentence));
}

type CustomerSentenceEntry = {
  familyId: string;
  value: string;
};

function customerSentenceEntries(content: RegionContent): CustomerSentenceEntry[] {
  const entries: CustomerSentenceEntry[] = [
    ...completeSentences(content.description).map((value) => ({
      familyId: "description",
      value,
    })),
    ...content.hooks.flatMap((hook, hookIndex) =>
      completeSentences(hook).map((value, sentenceIndex) => ({
        familyId: `hook:${hookIndex}:${sentenceIndex}`,
        value,
      })),
    ),
  ];
  for (const section of content.sections) {
    for (const [paragraphIndex, paragraph] of section.paragraphs.entries()) {
      for (const [sentenceIndex, value] of completeSentences(paragraph).entries()) {
        entries.push({
          familyId: `${section.id}:p${paragraphIndex}:s${sentenceIndex}`,
          value,
        });
      }
    }
  }
  return entries;
}

const CURATED_SENTENCE_FAMILIES = [
  "description",
  "hook:0:0",
  "hook:1:0",
  ...SECTION_IDS.flatMap((sectionId) =>
    [0, 1].flatMap((paragraphIndex) =>
      [0, 1].map(
        (sentenceIndex) => `${sectionId}:p${paragraphIndex}:s${sentenceIndex}`,
      ),
    ),
  ),
] as const;

const CURATED_SECOND_SENTENCE_FAMILIES = Object.keys(
  CURATED_SECOND_SENTENCE_BANKS,
) as CuratedSecondSentenceFamily[];

const CURATED_REGIONAL_SENTENCE_FAMILIES = Object.keys(
  CURATED_REGIONAL_SENTENCE_BANKS,
) as CuratedRegionalSentenceFamily[];

const CURATED_PARAGRAPH_FAMILIES = SECTION_IDS.flatMap((sectionId) =>
  [0, 1].map((paragraphIndex) => `${sectionId}:p${paragraphIndex}`),
);

export function normalizedSentences(content: RegionContent): string[] {
  return completeCustomerSentences(content).map(normalizeRegionalText);
}

export function normalizedDocument(content: RegionContent): string {
  return JSON.stringify({
    title: normalizeRegionalText(content.title),
    description: normalizeRegionalText(content.description),
    h1: normalizeRegionalText(content.h1),
    hooks: content.hooks.map(normalizeRegionalText),
    sections: content.sections.map((section) => ({
      id: section.id,
      heading: normalizeRegionalText(section.heading),
      paragraphs: section.paragraphs.map(normalizeRegionalText),
    })),
    ctaLabels: content.ctaLabels.map(normalizeRegionalText),
  });
}

const ACTION_DIRECTIVE_PATTERN = new RegExp(
  [
    "맞춰 보면",
    "비교해 주세요",
    "준비해 주세요",
    "다시 읽어 주세요",
    "멈춰 주세요",
    "삼아 주세요",
    "살펴보세요",
    "고르면",
    "전하면",
    "정리하면",
    "표시하면",
    "나누면",
    "대조하면",
    "바꾸면",
    "옮기면",
    "구분하면",
    "두면",
    "적으면",
    "남기면",
    "넣으면",
  ].join("|"),
  "gu",
);

function occurrences(value: string, phrase: string): number {
  let count = 0;
  let index = 0;
  while ((index = value.indexOf(phrase, index)) !== -1) {
    count += 1;
    index += phrase.length;
  }
  return count;
}

function regionalMentionCount(value: string, label: string): number {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|[^가-힣A-Za-z0-9.])${escaped}(?:에서는|에는|에서|에게서|에게|은|는|이|가|을|를|과|와|의|으로|로|에)?(?=\\s|[,.!?·]|$)`,
    "gu",
  );
  return [...value.matchAll(pattern)].length;
}

function actionDirectiveCount(value: string): number {
  return [...value.matchAll(ACTION_DIRECTIVE_PATTERN)].length;
}

function normalizeNgramSurface(value: string): string {
  return normalizeRegionalText(value)
    .replace(/(?:랑테라피|랑이라는|랑에게|rang frame)/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function ngrams(value: string, size: number): string[] {
  const tokens = normalizeNgramSurface(value).split(/\s+/u).filter(Boolean);
  return Array.from(
    { length: Math.max(0, tokens.length - size + 1) },
    (_, index) => tokens.slice(index, index + size).join(" "),
  );
}

function buildIntraDocumentNgramAudit(contents: readonly RegionContent[]) {
  const sizes = [4, 5, 6] as const;
  return Object.fromEntries(
    sizes.map((size) => {
      let maximumFrequency = 0;
      const documentsOverLimit: string[] = [];
      for (const [index, content] of contents.entries()) {
        const counts = new Map<string, number>();
        for (const value of customerText(content)) {
          for (const gram of ngrams(value, size)) {
            counts.set(gram, (counts.get(gram) ?? 0) + 1);
          }
        }
        const localMaximum = Math.max(0, ...counts.values());
        maximumFrequency = Math.max(maximumFrequency, localMaximum);
        if (localMaximum > 2) documentsOverLimit.push(ACTIVE_REGION_NODES[index].path);
      }
      return [
        size.toString(),
        {
          maximumFrequency,
          acceptedMaximumFrequency: 2,
          documentsOverLimit,
          verdict: documentsOverLimit.length === 0 ? "PASS" : "FAIL",
        },
      ];
    }),
  );
}

function buildParagraphNgramAudit(contents: readonly RegionContent[]) {
  const acceptedMaximumFrequency = 1;
  const acceptedMaximumRegionMentions = 1;
  let maximumFrequency = 0;
  let maximumRegionMentions = 0;
  const paragraphsOverLimit: Array<{ route: string; paragraph: string }> = [];
  const paragraphsOverRegionMentionLimit: Array<{
    route: string;
    paragraph: string;
    regionMentions: number;
  }> = [];
  for (const [contentIndex, content] of contents.entries()) {
    const node = ACTIVE_REGION_NODES[contentIndex];
    const label = getOfficialRegionLabel(node);
    for (const section of content.sections) {
      for (const paragraph of section.paragraphs) {
        const counts = new Map<string, number>();
        for (const gram of ngrams(paragraph, 4)) {
          counts.set(gram, (counts.get(gram) ?? 0) + 1);
        }
        const localMaximum = Math.max(0, ...counts.values());
        maximumFrequency = Math.max(maximumFrequency, localMaximum);
        if (localMaximum > acceptedMaximumFrequency && paragraphsOverLimit.length < 24) {
          paragraphsOverLimit.push({
            route: ACTIVE_REGION_NODES[contentIndex].path,
            paragraph,
          });
        }
        const regionMentions = regionalMentionCount(paragraph, label);
        maximumRegionMentions = Math.max(maximumRegionMentions, regionMentions);
        if (
          regionMentions > acceptedMaximumRegionMentions &&
          paragraphsOverRegionMentionLimit.length < 24
        ) {
          paragraphsOverRegionMentionLimit.push({
            route: node.path,
            paragraph,
            regionMentions,
          });
        }
      }
    }
  }
  return {
    ngramSize: 4,
    acceptedMaximumFrequency,
    maximumFrequency,
    acceptedMaximumRegionMentions,
    maximumRegionMentions,
    paragraphsOverLimit,
    paragraphsOverRegionMentionLimit,
    verdict:
      paragraphsOverLimit.length === 0 && paragraphsOverRegionMentionLimit.length === 0
        ? "PASS"
        : "FAIL",
  };
}

function buildSentenceSurfaceAudit(contents: readonly RegionContent[]) {
  const sentences = contents.flatMap(completeCustomerSentences);
  const customerValues = contents.flatMap(customerText);
  const customerValuesWithoutRouteLabel = contents.flatMap((content, contentIndex) => {
    const node = ACTIVE_REGION_NODES[contentIndex];
    const routeLabel = getOfficialRegionLabel(node);
    return customerText(content).map((value) => value.replace(routeLabel, " "));
  });
  let maximumCorePhraseFrequency = 0;
  let maximumActionDirectives = 0;
  let maximumCharacters = 0;
  let maximumRepeatedBigramFrequency = 0;
  const corePhraseViolations: string[] = [];
  const actionDirectiveViolations: string[] = [];
  const lengthViolations: string[] = [];
  const mechanicalScaffoldViolations: string[] = [];
  const repeatedBigramViolations: string[] = [];
  const languageQualityViolations: string[] = [];
  const repeatedConditionalViolations: string[] = [];
  const repeatedConnectorViolations: string[] = [];
  const topicParticleViolations: string[] = [];
  const repeatedActionRootViolations: string[] = [];
  const adjacentSemanticDuplicateViolations: Array<{
    route: string;
    sectionId: string;
    paragraphIndex: number;
    boundary?: "within-paragraph" | "between-paragraphs";
    tupleId: string;
    first: string;
    second: string;
  }> = [];
  let adjacentSemanticDuplicateCount = 0;
  const mechanicalPatterns = [
    /—/u,
    /구분이\s+구분/u,
    /차이가\s+차이/u,
    /확인\s+순서의\s+확인\s+순서/u,
    /방문\s+전에는[^.!?]{0,50}방문\s+전에/u,
    /상담\s+전에는[^.!?]{0,50}상담\s+전에는/u,
    /통화를\s+마치기\s+전에는[^.!?]{0,50}통화를\s+마치기\s+전에/u,
  ] as const;
  const languageQualityPatterns = [
    /(?:페이지 구조|템플릿|내부 분류|전체 플랫폼 공통|대표 좌표|현재 좌표|세부 좌표)/u,
    /(?:첫 선택 화면|목적지 카드|지역 갤러리|이용 요청을 시작하는 문장)/u,
    /(?:이 지역|지역 간 연결)/u,
    /[가-힣]+(?:구|시|도|리)(?:은|이|과|으로)(?=\s|[,.!?])/u,
    /[가-힣]+(?:군|동|읍|면)(?:는|가|와|로)(?=\s|[,.!?])/u,
  ] as const;
  const topicParticlePattern =
    /(?:에서는|중에는)\s+[^.!?]{0,45}?(?:주소|요청|상담|이용|코스|결제|일정)(?:은|는)(?=\s|[,])/u;
  const repeatedActionRoots = [
    "진행",
    "확인",
    "정리",
    "준비",
    "선택",
    "비교",
    "전달",
    "결제",
  ] as const;
  const adjacentSemanticTuples = [
    {
      id: "address-hierarchy-verification",
      patterns: [
        /(?:주소|도로명|상세 위치)/u,
        /(?:상위 지역|하위 지역|상위 행정구역|행정구역|시·군·구|소속|세부 지역)/u,
        /(?:확인|살펴|대조|맞는지|기준|구분)/u,
      ],
    },
    {
      id: "address-detail-preparation",
      patterns: [
        /(?:주소|도로명)/u,
        /(?:건물|동·호수|상세 위치)/u,
        /(?:준비|적어|메모|남겨|알려|전해)/u,
      ],
    },
    {
      id: "access-instruction-preparation",
      patterns: [
        /(?:출입|공동현관|입구|엘리베이터)/u,
        /(?:절차|규정|방법|안내|제한)/u,
        /(?:알려|정리|메모|확인|설명|전해)/u,
      ],
    },
    {
      id: "contact-number-preparation",
      patterns: [
        /(?:연락|전화번호|번호)/u,
        /(?:통화|상담|연락받|연락처)/u,
        /(?:알려|남겨|확인|전달|준비)/u,
      ],
    },
    {
      id: "service-space-request-separation",
      patterns: [
        /서비스 공간 (?:요청|정보)/u,
        /(?:코스|관리 방식|지역 선택|메모)/u,
        /(?:구분|별도|따로)/u,
      ],
    },
    {
      id: "private-address-detail-by-phone",
      patterns: [
        /(?:동·호수|민감한 상세 정보|민감한 정보)/u,
        /(?:전화상담|통화)/u,
        /(?:직접|공개 메모|전해|알려)/u,
      ],
    },
  ] as const;
  const semanticTupleIds = (sentence: string) =>
    adjacentSemanticTuples
      .filter((tuple) => tuple.patterns.every((pattern) => pattern.test(sentence)))
      .map((tuple) => tuple.id);

  for (const sentence of sentences) {
    const coreFrequency = Math.max(
      0,
      ...CONTENT_CORE_PHRASES.map((phrase) => occurrences(sentence, phrase)),
    );
    const directives = actionDirectiveCount(sentence);
    const bigramCounts = new Map<string, number>();
    for (const gram of ngrams(sentence, 2)) {
      bigramCounts.set(gram, (bigramCounts.get(gram) ?? 0) + 1);
    }
    const repeatedBigramFrequency = Math.max(0, ...bigramCounts.values());
    maximumCorePhraseFrequency = Math.max(maximumCorePhraseFrequency, coreFrequency);
    maximumActionDirectives = Math.max(maximumActionDirectives, directives);
    maximumCharacters = Math.max(maximumCharacters, sentence.length);
    maximumRepeatedBigramFrequency = Math.max(
      maximumRepeatedBigramFrequency,
      repeatedBigramFrequency,
    );
    if (coreFrequency > 1 && corePhraseViolations.length < 12) {
      corePhraseViolations.push(sentence);
    }
    if (directives > 1 && actionDirectiveViolations.length < 12) {
      actionDirectiveViolations.push(sentence);
    }
    if (sentence.length > 280 && lengthViolations.length < 12) {
      lengthViolations.push(sentence);
    }
    if (
      mechanicalPatterns.some((pattern) => pattern.test(sentence)) &&
      mechanicalScaffoldViolations.length < 12
    ) {
      mechanicalScaffoldViolations.push(sentence);
    }
    if (repeatedBigramFrequency > 1 && repeatedBigramViolations.length < 12) {
      repeatedBigramViolations.push(sentence);
    }
    if (
      languageQualityPatterns.some((pattern) => pattern.test(sentence)) &&
      languageQualityViolations.length < 12
    ) {
      languageQualityViolations.push(sentence);
    }
    const normalizedSentence = normalizeRegionalText(sentence);
    const conditionalEndings = normalizedSentence.match(
      /[가-힣]+(?:려면|다면|으면|면)(?=\s|[,])/gu,
    ) ?? [];
    if (conditionalEndings.length > 1 && repeatedConditionalViolations.length < 12) {
      repeatedConditionalViolations.push(sentence);
    }
    const repeatedConnector = ["뒤", "전에", "때"].some(
      (connector) =>
        (normalizedSentence.match(new RegExp(`${connector}(?=\\s|[,])`, "gu")) ?? [])
          .length > 1,
    );
    if (repeatedConnector && repeatedConnectorViolations.length < 12) {
      repeatedConnectorViolations.push(sentence);
    }
    if (topicParticlePattern.test(sentence) && topicParticleViolations.length < 12) {
      topicParticleViolations.push(sentence);
    }
    const repeatedActionRoot = repeatedActionRoots.some((root) =>
      new RegExp(
        `${root}[가-힣]{0,6}(?:하고|한\\s+뒤|하면)[^.!?]{0,90}${root}[가-힣]{0,8}`,
        "u",
      ).test(sentence),
    );
    if (repeatedActionRoot && repeatedActionRootViolations.length < 12) {
      repeatedActionRootViolations.push(sentence);
    }
  }

  for (const [contentIndex, content] of contents.entries()) {
    const route = ACTIVE_REGION_NODES[contentIndex]?.path ?? `UNKNOWN_${contentIndex}`;
    for (const section of content.sections) {
      for (const [paragraphIndex, paragraph] of section.paragraphs.entries()) {
        const paragraphSentences = completeSentences(paragraph);
        for (let sentenceIndex = 0; sentenceIndex + 1 < paragraphSentences.length; sentenceIndex += 1) {
          const first = paragraphSentences[sentenceIndex];
          const second = paragraphSentences[sentenceIndex + 1];
          const secondTuples = new Set(semanticTupleIds(second));
          for (const tupleId of semanticTupleIds(first)) {
            if (!secondTuples.has(tupleId)) continue;
            adjacentSemanticDuplicateCount += 1;
            if (adjacentSemanticDuplicateViolations.length < 24) {
              adjacentSemanticDuplicateViolations.push({
                route,
                sectionId: section.id,
                paragraphIndex,
                boundary: "within-paragraph",
                tupleId,
                first,
                second,
              });
            }
          }
        }
      }
      for (
        let paragraphIndex = 0;
        paragraphIndex + 1 < section.paragraphs.length;
        paragraphIndex += 1
      ) {
        const first = section.paragraphs[paragraphIndex];
        const second = section.paragraphs[paragraphIndex + 1];
        const secondTuples = new Set(semanticTupleIds(second));
        for (const tupleId of semanticTupleIds(first)) {
          if (!secondTuples.has(tupleId)) continue;
          adjacentSemanticDuplicateCount += 1;
          if (adjacentSemanticDuplicateViolations.length < 24) {
            adjacentSemanticDuplicateViolations.push({
              route,
              sectionId: section.id,
              paragraphIndex,
              boundary: "between-paragraphs",
              tupleId,
              first,
              second,
            });
          }
        }
      }
    }
  }

  const knownDefectPatterns = {
    firstInquiryAddressTopic: /첫 문의에서는[^.!?]{0,80}주소는/u,
    consultationRequestTopic: /상담 중에는[^.!?]{0,80}요청은/u,
    repeatedProceedInstruction: /진행을 보류하고[^.!?]{0,100}진행을 멈추고/u,
    awkwardReservationDayInstrument: /예약 당일 점검으로/u,
    fragmentVisitAddressComparison: /방문 주소의 지역명을 비교하며/u,
    fragmentConsultationQuestionOrder: /상담 질문의 순서를 세우며/u,
    fragmentCourseMemo: /상담할 코스를 메모하며/u,
    fragmentBeforeAfterPromise: /방문 전후의 약속을 살피며/u,
    awkwardScheduleMargin: /코스에 쓸 수 있는 앞뒤 일정의 여유/u,
    fragmentVisitPreparation: /방문 준비를 시작하며/u,
    awkwardSpaceContactPreparation: /이용 공간과 연락 상태를 먼저 준비/u,
    awkwardNearManagementCourse: /원하는 관리 방식과 가까운 코스/u,
    awkwardConsultationScope: /상담 범위를 빠르게 맞출 수/u,
    customerDepartureOrArrival: /(?:출발 전|도착 전에|도착 전에는|도착 예정)/u,
    uncertainCardPayment: /(?:카드 (?:사용|결제) 여부|카드 결제 가능 여부)/u,
    awkwardCardSelection: /(?:현장 카드를 선택|카드 대금도 현장에서 결제)/u,
    fictionalPaymentRisk: /(?:낯선 결제 링크|예약금을 보내라는 요청|계좌 이체 요청|송금 요청|결제 안내가 의심|사실 여부를 확인|진위를 물어|출처가 불분명|계좌 이체를 재촉)/u,
    customerTravelH1: /주소로 찾아가는/u,
    externalExactCardSentence: /현장에서는 카드로도 결제할 수 있습니다/u,
    unavailablePrebookingRecord: /예약 내역/u,
    customerDestinationLanguage: /목적지/u,
    customerTravelLocation: /방문 위치/u,
    oldNextAppointmentTravelBuffer: /다음 약속이 있다면 이동에 필요한 시간도 비워 두는 편이 좋습니다/u,
    oldPostVisitTravelPlan: /방문 뒤 이동 계획이 있다면 충분한 여유를 남겨 주세요/u,
    oldNextScheduleTravelTime: /코스의 시작 시각과 다음 일정까지의 이동 시간을 하루 계획에 넣으세요/u,
    bareActualAddress: /실제 주소/u,
    ambiguousDetailedLocation: /상세 위치/u,
    providerSubjectVisitAvailability:
      /(?:방문 가능 여부|오늘 방문할 수 있는지|방문 가능 시각)/u,
    awkwardVisitConditionTopic: /방문 조건에는/u,
    vagueContactAndHeadcountPreparation: /연락처와 이용 인원을 챙겨 주세요/u,
    oldTelephoneConsultNumberChangedBeforeInquiry:
      /전화상담 번호가 바뀌었다면 문의 전에 새 번호/u,
    oldNewTelephoneConsultNumberDuringCall:
      /새 전화상담 번호는 기존 번호가 바뀐 경우 통화 중/u,
    oldTelephoneConsultNumberDigitCheck:
      /전화상담 번호의 숫자가 맞는지/u,
    oldServiceSpaceRequestSeparation:
      /서비스 공간 요청은[^.!?]{0,80}구분해/u,
    ambiguousCustomerContactNumberRole:
      /(?:전화상담에 (?:사용할|쓸|쓴) 번호|통화에 사용할 번호|본인 번호|본인 전화번호|연락처 숫자|새 전화상담 번호)/u,
  } as const;
  const knownDefectCounts = Object.fromEntries(
    Object.entries(knownDefectPatterns).map(([id, pattern]) => [
      id,
      sentences.filter((sentence) => pattern.test(sentence)).length,
    ]),
  );
  const movementPatternCounts = {
    customerPhysicalMovement: customerValuesWithoutRouteLabel.filter((value) =>
      /(?:이동|출발|도착|찾아가|오시는 길)/u.test(value)
    ).length,
  };
  const rejectedMovementBankCounts = {
    nextAppointmentTravelBuffer: customerValues.filter((value) =>
      /다음 약속이 있다면 이동에 필요한 시간도 비워 두는 편이 좋습니다/u.test(value)
    ).length,
    postVisitTravelPlan: customerValues.filter((value) =>
      /방문 뒤 이동 계획이 있다면 충분한 여유를 남겨 주세요/u.test(value)
    ).length,
    nextScheduleTravelTime: customerValues.filter((value) =>
      /코스의 시작 시각과 다음 일정까지의 이동 시간을 하루 계획에 넣으세요/u.test(value)
    ).length,
  };
  const roleDirectionPatternCounts = {
    providerArrivalContactWaitingAssumption: customerValues.filter((value) =>
      /(?:관리사|테라피스트|방문 연락|도착[^.!?]{0,40}연락|연락[^.!?]{0,40}(?:기다리|대기)|연락을 놓치|연락받을 (?:사람|번호)|서비스 중 연락|전화받기 어려운|전화받을 수 있는 상태|휴대전화를 가까이|방문 예정 (?:시간|시각)|기다리|대기)/u.test(
        value,
      )
    ).length,
    serviceRecipientAddressRoleError: customerValues.filter((value) =>
      /(?:머무는|머물(?:고|러)|체류 주소|체류 지역|실제 주소|상세 위치)/u.test(value)
    ).length,
    providerSubjectAvailabilityAmbiguity: customerValues.filter((value) =>
      /(?:방문 가능 여부|오늘 방문할 수 있는지|방문 가능 시각)/u.test(value)
    ).length,
  };

  return {
    inspectedSentences: sentences.length,
    maximumCorePhraseFrequency,
    acceptedMaximumCorePhraseFrequency: 1,
    maximumActionDirectives,
    acceptedMaximumActionDirectives: 1,
    maximumCharacters,
    acceptedMaximumCharacters: 280,
    maximumRepeatedBigramFrequency,
    acceptedMaximumRepeatedBigramFrequency: 1,
    corePhraseViolations,
    actionDirectiveViolations,
    lengthViolations,
    mechanicalScaffoldViolations,
    repeatedBigramViolations,
    languageQualityViolations,
    repeatedConditionalViolations,
    repeatedConnectorViolations,
    topicParticleViolations,
    repeatedActionRootViolations,
    adjacentSemanticDuplicateCount,
    adjacentSemanticDuplicateViolations,
    knownDefectCounts,
    movementPatternCounts,
    rejectedMovementBankCounts,
    roleDirectionPatternCounts,
    verdict:
      corePhraseViolations.length === 0 &&
      actionDirectiveViolations.length === 0 &&
      lengthViolations.length === 0 &&
      mechanicalScaffoldViolations.length === 0 &&
      repeatedBigramViolations.length === 0 &&
      languageQualityViolations.length === 0 &&
      repeatedConditionalViolations.length === 0 &&
      repeatedConnectorViolations.length === 0 &&
      topicParticleViolations.length === 0 &&
      repeatedActionRootViolations.length === 0 &&
      adjacentSemanticDuplicateCount === 0 &&
      Object.values(movementPatternCounts).every((count) => count === 0) &&
      Object.values(rejectedMovementBankCounts).every((count) => count === 0) &&
      Object.values(roleDirectionPatternCounts).every((count) => count === 0) &&
      Object.values(knownDefectCounts).every((count) => count === 0)
        ? "PASS"
        : "FAIL",
  };
}

function maximumFrequency(values: readonly string[]): number {
  const counts = new Map<string, number>();
  let maximum = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    maximum = Math.max(maximum, count);
  }
  return maximum;
}

function exactAudit(values: readonly string[]) {
  const unique = new Set(values).size;
  return {
    total: values.length,
    unique,
    duplicateCount: values.length - unique,
    maximumFrequency: maximumFrequency(values),
    verdict: values.length === unique ? "PASS" : "FAIL",
  };
}

function buildSentencePrefixAudit(contents: readonly RegionContent[]) {
  const acceptedMaximumFrequency = 128;
  const prefixTokens = 3;
  const buckets = new Map<string, { count: number; routes: string[] }>();
  for (const entry of sentenceEntries(contents)) {
    const prefix = normalizeRegionalText(entry.value)
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, prefixTokens)
      .join(" ");
    const bucket = buckets.get(prefix) ?? { count: 0, routes: [] };
    bucket.count += 1;
    if (bucket.routes.length < 4) bucket.routes.push(entry.route);
    buckets.set(prefix, bucket);
  }
  const overLimitBuckets = [...buckets.entries()]
    .filter(([, bucket]) => bucket.count > acceptedMaximumFrequency)
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0], "ko"))
    .slice(0, 24)
    .map(([prefix, bucket]) => ({ prefix, ...bucket }));
  return {
    normalizer: CONTENT_NORMALIZER_VERSION,
    prefixTokens,
    acceptedMaximumFrequency,
    inspectedSentences: contents.length * CURATED_SENTENCE_FAMILIES.length,
    uniquePrefixes: buckets.size,
    maximumFrequency: Math.max(0, ...[...buckets.values()].map((bucket) => bucket.count)),
    fixedOperationalExceptions: [],
    overLimitBuckets,
    verdict: overLimitBuckets.length === 0 ? "PASS" : "FAIL",
  };
}

type ReuseEntry = {
  familyId: string;
  route: string;
  value: string;
};

function buildCuratedReuseAudit(
  entries: readonly ReuseEntry[],
  whitelist: readonly string[],
  acceptedMaximumFrequency: number,
  options: {
    valueNormalizer?: (value: string) => string;
    policyVersion?: string;
    rationale?: string;
    approvedExactValuesByFamily?: ReadonlyMap<string, ReadonlySet<string>>;
  } = {},
) {
  const allowedFamilies = new Set(whitelist);
  const valueNormalizer = options.valueNormalizer ?? normalizeRegionalText;
  const buckets = new Map<
    string,
    { count: number; families: Set<string>; routes: string[] }
  >();
  for (const entry of entries) {
    const normalized = valueNormalizer(entry.value);
    const bucket = buckets.get(normalized) ?? {
      count: 0,
      families: new Set<string>(),
      routes: [],
    };
    bucket.count += 1;
    bucket.families.add(entry.familyId);
    if (bucket.routes.length < 4) bucket.routes.push(entry.route);
    buckets.set(normalized, bucket);
  }

  const duplicateBuckets = [...buckets.entries()].filter(([, bucket]) => bucket.count > 1);
  const overCap = duplicateBuckets.filter(
    ([, bucket]) => bucket.count > acceptedMaximumFrequency,
  );
  const crossFamily = duplicateBuckets.filter(([, bucket]) => bucket.families.size !== 1);
  const unwhitelisted = duplicateBuckets.filter(([, bucket]) =>
    [...bucket.families].some((family) => !allowedFamilies.has(family)),
  );
  const unapprovedExactValues = options.approvedExactValuesByFamily
    ? duplicateBuckets.filter(([value, bucket]) =>
        [...bucket.families].some(
          (family) => !options.approvedExactValuesByFamily?.get(family)?.has(value),
        ),
      )
    : [];
  const violationSamples = [
    ...overCap,
    ...crossFamily,
    ...unwhitelisted,
    ...unapprovedExactValues,
  ]
    .slice(0, 12)
    .map(([value, bucket]) => ({
      value,
      count: bucket.count,
      families: [...bucket.families].sort(),
      routes: bucket.routes,
    }));

  return {
    policyVersion:
      options.policyVersion ?? "rang-curated-complete-sentence-family-reuse/v1",
    rationale:
      options.rationale ??
      "지역명과 숫자를 지운 뒤에도 반복되는 문구는 검증된 지역 탐색·주소·일정·코스·결제·방문 준비 사실의 같은 문장 역할에만 허용합니다.",
    inspectedEntries: entries.length,
    whitelistedFamilies: [...whitelist],
    acceptedMaximumFrequency,
    uniqueNormalizedValues: buckets.size,
    duplicateBucketCount: duplicateBuckets.length,
    maximumFrequency: Math.max(0, ...[...buckets.values()].map((bucket) => bucket.count)),
    crossFamilyBucketCount: crossFamily.length,
    overCapBucketCount: overCap.length,
    unwhitelistedBucketCount: unwhitelisted.length,
    unapprovedExactValueBucketCount: unapprovedExactValues.length,
    violationSamples,
    verdict:
      overCap.length === 0 &&
      crossFamily.length === 0 &&
      unwhitelisted.length === 0 &&
      unapprovedExactValues.length === 0
        ? "PASS"
        : "FAIL",
  };
}

function rawDocument(content: RegionContent): string {
  return JSON.stringify({
    title: content.title,
    description: content.description,
    h1: content.h1,
    hooks: content.hooks,
    sections: content.sections,
    ctaLabels: content.ctaLabels,
  });
}

function paragraphEntries(
  contents: readonly RegionContent[],
  normalized: boolean,
): ReuseEntry[] {
  return contents.flatMap((content, contentIndex) =>
    content.sections.flatMap((section) =>
      section.paragraphs.map((paragraph, paragraphIndex) => ({
        familyId: `${section.id}:p${paragraphIndex}`,
        route: ACTIVE_REGION_NODES[contentIndex].path,
        value: normalized ? normalizeRegionalText(paragraph) : paragraph,
      })),
    ),
  );
}

function sentenceEntries(contents: readonly RegionContent[]): ReuseEntry[] {
  return contents.flatMap((content, contentIndex) =>
    customerSentenceEntries(content).map((entry) => ({
      ...entry,
      route: ACTIVE_REGION_NODES[contentIndex].path,
    })),
  );
}

function buildSecondSentenceBankAudit(contents: readonly RegionContent[]) {
  const entries = sentenceEntries(contents);
  const entryBuckets = new Map<string, ReuseEntry[]>();
  for (const entry of entries) {
    const bucket = entryBuckets.get(entry.familyId) ?? [];
    bucket.push(entry);
    entryBuckets.set(entry.familyId, bucket);
  }

  const violations: Array<{
    familyId: string;
    route?: string;
    reason: string;
    sentence?: string;
  }> = [];
  const banks = CURATED_SECOND_SENTENCE_FAMILIES.map((familyId) => {
    const bank = CURATED_SECOND_SENTENCE_BANKS[familyId];
    const familyEntries = entryBuckets.get(familyId) ?? [];
    const approved = new Set(bank.sentences);
    const counts = new Map(bank.sentences.map((sentence) => [sentence, 0]));
    if (familyEntries.length !== contents.length) {
      violations.push({
        familyId,
        reason: `EXPECTED_${contents.length}_ENTRIES_FOUND_${familyEntries.length}`,
      });
    }
    for (const entry of familyEntries) {
      if (!approved.has(entry.value)) {
        violations.push({
          familyId,
          route: entry.route,
          reason: "UNLISTED_SENTENCE",
          sentence: entry.value,
        });
        continue;
      }
      counts.set(entry.value, (counts.get(entry.value) ?? 0) + 1);
      const node = ACTIVE_REGION_NODES.find((candidate) => candidate.path === entry.route);
      if (!node) {
        violations.push({ familyId, route: entry.route, reason: "UNKNOWN_ROUTE" });
        continue;
      }
      const label = getOfficialRegionLabel(node);
      if (regionalMentionCount(entry.value, label) !== 0 || /(?:이 지역|지역 간 연결)/u.test(entry.value)) {
        violations.push({
          familyId,
          route: entry.route,
          reason: "LOCATION_REFERENCE_IN_SECOND_SENTENCE",
          sentence: entry.value,
        });
      }
    }
    const sentences = bank.sentences.map((sentence, index) => ({
      sentenceId: `${familyId}:v${index.toString().padStart(2, "0")}`,
      sentence,
      count: counts.get(sentence) ?? 0,
    }));
    const frequencies = sentences.map((sentence) => sentence.count);
    const unused = sentences.filter((sentence) => sentence.count === 0);
    if (unused.length > 0) {
      violations.push({
        familyId,
        reason: `UNUSED_SENTENCES:${unused.map((sentence) => sentence.sentenceId).join(",")}`,
      });
    }
    return {
      familyId,
      classification: bank.classification,
      sentenceCount: bank.sentences.length,
      minimumFrequency: Math.min(...frequencies),
      maximumFrequency: Math.max(...frequencies),
      sentences,
    };
  });

  return {
    policyVersion: "rang-section-slot-complete-sentence-bank/v1",
    acceptedMaximumFrequency: 128,
    rules: [
      "각 둘째 문장은 정확히 한 section+paragraph+sentence slot 전용 bank에 속합니다.",
      "bank 문장은 검증 운영 사실 또는 외부 검수 대상 고객 안내 완전문장으로 분류합니다.",
      "둘째 문장에는 지역명, `이 지역`, 숨은 marker를 넣지 않습니다.",
      "다른 slot이나 목록 밖 문장의 exact 재사용을 허용하지 않습니다.",
    ],
    bankCount: banks.length,
    sentenceCount: banks.reduce((sum, bank) => sum + bank.sentenceCount, 0),
    maximumFrequency: Math.max(...banks.map((bank) => bank.maximumFrequency)),
    banks,
    violations: violations.slice(0, 24),
    verdict:
      violations.length === 0 &&
      banks.every((bank) => bank.maximumFrequency <= 128)
        ? "PASS"
        : "FAIL",
  };
}

const REGIONAL_SENTENCE_CORE_TERMS = [
  "주소",
  "상담",
  "코스",
  "결제",
  "방문",
  "시간",
  "시각",
  "일정",
  "관리",
  "확인",
  "준비",
  "요청",
  "메모",
  "지역",
  "금액",
  "예산",
  "연락",
  "이용",
  "운영",
  "후불",
  "선입금",
  "비교",
  "진행",
] as const;

const REGIONAL_SENTENCE_FORBIDDEN_PATTERNS = {
  fragmentVisitAddressComparison: /방문 주소의 지역명을 비교하며/u,
  fragmentConsultationQuestionOrder: /상담 질문의 순서를 세우며/u,
  fragmentCourseMemo: /상담할 코스를 메모하며/u,
  fragmentBeforeAfterPromise: /방문 전후의 약속을 살피며/u,
  awkwardScheduleMargin: /코스에 쓸 수 있는 앞뒤 일정의 여유/u,
  fragmentVisitPreparation: /방문 준비를 시작하며/u,
  awkwardSpaceContactPreparation: /이용 공간과 연락 상태를 먼저 준비/u,
  awkwardNearManagementCourse: /원하는 관리 방식과 가까운 코스/u,
  awkwardConsultationScope: /상담 범위를 빠르게 맞출 수/u,
  unavailablePrebookingRecord: /예약 내역/u,
  customerDestinationLanguage: /목적지/u,
  customerTravelLocation: /방문 위치/u,
  customerPhysicalMovement: /(?:이동|출발|도착|찾아가|오시는 길)/u,
  bareActualAddress: /실제 주소/u,
  ambiguousDetailedLocation: /상세 위치/u,
  providerSubjectVisitAvailability:
    /(?:방문 가능 여부|오늘 방문할 수 있는지|방문 가능 시각)/u,
  awkwardVisitConditionTopic: /방문 조건에는/u,
  vagueContactAndHeadcountPreparation: /연락처와 이용 인원을 챙겨 주세요/u,
  oldTelephoneConsultNumberChangedBeforeInquiry:
    /전화상담 번호가 바뀌었다면 문의 전에 새 번호/u,
  oldNewTelephoneConsultNumberDuringCall:
    /새 전화상담 번호는 기존 번호가 바뀐 경우 통화 중/u,
  oldTelephoneConsultNumberDigitCheck:
    /전화상담 번호의 숫자가 맞는지/u,
  oldServiceSpaceRequestSeparation:
    /서비스 공간 요청은[^.!?]{0,80}구분해/u,
  ambiguousCustomerContactNumberRole:
    /(?:전화상담에 (?:사용할|쓸|쓴) 번호|통화에 사용할 번호|본인 번호|본인 전화번호|연락처 숫자|새 전화상담 번호)/u,
  oldPostVisitTravelPlan: /방문 뒤 이동 계획이 있다면 충분한 여유를 남겨 주세요/u,
  oldNextScheduleTravelTime: /코스의 시작 시각과 다음 일정까지의 이동 시간을 하루 계획에 넣으세요/u,
} as const;

function buildRegionalSentenceBankAudit(contents: readonly RegionContent[]) {
  const acceptedMaximumFrequency = 128;
  const entries = sentenceEntries(contents);
  const entryBuckets = new Map<string, ReuseEntry[]>();
  const nodeByPath = new Map(ACTIVE_REGION_NODES.map((node) => [node.path, node]));
  for (const entry of entries) {
    const bucket = entryBuckets.get(entry.familyId) ?? [];
    bucket.push(entry);
    entryBuckets.set(entry.familyId, bucket);
  }

  const violations: Array<{
    familyId: string;
    route?: string;
    reason: string;
    sentence?: string;
  }> = [];
  let maximumRepeatedCoreTermFrequency = 0;
  const forbiddenPhraseCounts = Object.fromEntries(
    Object.keys(REGIONAL_SENTENCE_FORBIDDEN_PATTERNS).map((id) => [id, 0]),
  ) as Record<keyof typeof REGIONAL_SENTENCE_FORBIDDEN_PATTERNS, number>;

  const banks = CURATED_REGIONAL_SENTENCE_FAMILIES.map((familyId) => {
    const bank = CURATED_REGIONAL_SENTENCE_BANKS[familyId];
    const familyEntries = entryBuckets.get(familyId) ?? [];
    const counts = bank.map(() => 0);
    if (familyEntries.length !== contents.length) {
      violations.push({
        familyId,
        reason: `EXPECTED_${contents.length}_ENTRIES_FOUND_${familyEntries.length}`,
      });
    }

    for (const entry of familyEntries) {
      const node = nodeByPath.get(entry.route);
      if (!node) {
        violations.push({ familyId, route: entry.route, reason: "UNKNOWN_ROUTE" });
        continue;
      }
      const label = familyId === "description"
        ? getSearchRegionLabel(node)
        : getOfficialRegionLabel(node);
      const approved = bank.map((template) => `${template(node, label)}.`);
      const matchingVariants = approved.flatMap((sentence, index) =>
        sentence === entry.value ? [index] : [],
      );
      if (matchingVariants.length !== 1) {
        violations.push({
          familyId,
          route: entry.route,
          reason: `EXPECTED_ONE_COMPLETE_TEMPLATE_MATCH_FOUND_${matchingVariants.length}`,
          sentence: entry.value,
        });
        continue;
      }
      counts[matchingVariants[0]] += 1;

      if (completeSentences(entry.value).length !== 1) {
        violations.push({
          familyId,
          route: entry.route,
          reason: "NOT_ONE_COMPLETE_SENTENCE",
          sentence: entry.value,
        });
      }
      const mentions = regionalMentionCount(entry.value, label);
      if (mentions !== 1) {
        violations.push({
          familyId,
          route: entry.route,
          reason: `EXPECTED_ONE_ROUTE_LABEL_FOUND_${mentions}`,
          sentence: entry.value,
        });
      }
      if (/(?:이 지역|지역 간 연결|첫 선택 화면|목적지 카드|지역 갤러리)/u.test(entry.value)) {
        violations.push({
          familyId,
          route: entry.route,
          reason: "LOCATION_FILLER_OR_UI_TMI",
          sentence: entry.value,
        });
      }

      const surface = entry.value
        .replaceAll(label, " ")
        .replace(/24시간/gu, " ")
        .replace(/0508-202-3906/gu, " ");
      const repeatedTerms = REGIONAL_SENTENCE_CORE_TERMS.flatMap((term) => {
        const count = occurrences(surface, term);
        maximumRepeatedCoreTermFrequency = Math.max(
          maximumRepeatedCoreTermFrequency,
          count,
        );
        return count > 1 ? [`${term}:${count}`] : [];
      });
      if (repeatedTerms.length > 0) {
        violations.push({
          familyId,
          route: entry.route,
          reason: `REPEATED_CORE_TERM:${repeatedTerms.join(",")}`,
          sentence: entry.value,
        });
      }
      for (const [id, pattern] of Object.entries(
        REGIONAL_SENTENCE_FORBIDDEN_PATTERNS,
      ) as Array<
        [keyof typeof REGIONAL_SENTENCE_FORBIDDEN_PATTERNS, RegExp]
      >) {
        const testedValue =
          id === "customerPhysicalMovement"
            ? entry.value.replace(label, " ")
            : entry.value;
        if (!pattern.test(testedValue)) continue;
        forbiddenPhraseCounts[id] += 1;
        violations.push({
          familyId,
          route: entry.route,
          reason: `FORBIDDEN_PHRASE:${id}`,
          sentence: entry.value,
        });
      }
    }

    return {
      familyId,
      classification: "candidate-regional-guidance" as const,
      sentenceTemplateCount: bank.length,
      minimumFrequency: Math.min(...counts),
      maximumFrequency: Math.max(...counts),
      sentenceTemplates: counts.map((count, index) => ({
        sentenceId: `${familyId}:v${index.toString().padStart(2, "0")}`,
        count,
      })),
    };
  });

  const firstEntries = CURATED_REGIONAL_SENTENCE_FAMILIES.flatMap(
    (familyId) => entryBuckets.get(familyId) ?? [],
  );
  const exact = exactAudit(firstEntries.map((entry) => entry.value));
  return {
    policyVersion: "rang-region-first-complete-sentence-bank/v1",
    acceptedMaximumFrequency,
    rules: [
      "각 지역 포함 문장은 fragment 조합이 아닌 사람 작성 완전문장 11개 중 하나입니다.",
      "각 문장은 현재 route label을 정확히 한 번만 사용합니다.",
      "같은 핵심 명사나 행동어를 한 문장 안에서 반복하지 않습니다.",
      "UI 구조 설명, 지역 대명사, 금지된 조합식 표현을 허용하지 않습니다.",
    ],
    bankCount: banks.length,
    sentenceTemplateCount: banks.reduce(
      (sum, bank) => sum + bank.sentenceTemplateCount,
      0,
    ),
    inspectedEntries: firstEntries.length,
    rawExact: exact,
    maximumFrequency: Math.max(...banks.map((bank) => bank.maximumFrequency)),
    maximumRepeatedCoreTermFrequency,
    acceptedMaximumRepeatedCoreTermFrequency: 1,
    forbiddenPhraseCounts,
    banks,
    violations: violations.slice(0, 24),
    verdict:
      violations.length === 0 &&
      exact.verdict === "PASS" &&
      banks.every(
        (bank) =>
          bank.minimumFrequency >= 117 &&
          bank.maximumFrequency <= acceptedMaximumFrequency,
      ) &&
      Object.values(forbiddenPhraseCounts).every((count) => count === 0)
        ? "PASS"
        : "FAIL",
  };
}

function buildSeoCopyBankAudit(contents: readonly RegionContent[]) {
  const acceptedMaximumFrequency = 128;
  const definitions = [
    {
      familyId: "title",
      bank: CURATED_TITLE_BANK,
      value: (content: RegionContent) => content.title,
    },
    {
      familyId: "h1",
      bank: CURATED_H1_BANK,
      value: (content: RegionContent) => content.h1,
    },
  ] as const;
  const violations: Array<{
    familyId: string;
    route?: string;
    reason: string;
    value?: string;
  }> = [];
  const banks = definitions.map(({ familyId, bank, value }) => {
    const counts = bank.map(() => 0);
    for (const [index, content] of contents.entries()) {
      const node = ACTIVE_REGION_NODES[index];
      const label = familyId === "title"
        ? getSearchRegionLabel(node)
        : getOfficialRegionLabel(node);
      const actual = value(content);
      const matches = bank.flatMap((template, templateIndex) =>
        template(label) === actual ? [templateIndex] : [],
      );
      if (matches.length !== 1) {
        violations.push({
          familyId,
          route: node.path,
          reason: `EXPECTED_ONE_COMPLETE_TEMPLATE_MATCH_FOUND_${matches.length}`,
          value: actual,
        });
        continue;
      }
      counts[matches[0]] += 1;
      if (regionalMentionCount(actual, label) !== 1) {
        violations.push({
          familyId,
          route: node.path,
          reason: "EXPECTED_ONE_ROUTE_LABEL",
          value: actual,
        });
      }
      if (/방문 관리/u.test(actual)) {
        violations.push({
          familyId,
          route: node.path,
          reason: "AMBIGUOUS_VISIT_MANAGEMENT_PHRASE",
          value: actual,
        });
      }
      if (familyId === "title") {
        const brandCount = occurrences(actual, "랑테라피");
        if (brandCount !== 1 || actual.length > 60 || actual.length === 0) {
          violations.push({
            familyId,
            route: node.path,
            reason: `TITLE_BRAND_${brandCount}_LENGTH_${actual.length}`,
            value: actual,
          });
        }
      } else if (actual.trim().length === 0) {
        violations.push({ familyId, route: node.path, reason: "EMPTY_H1", value: actual });
      } else if (/(?:주소로 찾아가는|출발|도착|방문 관리$)/u.test(actual)) {
        violations.push({
          familyId,
          route: node.path,
          reason: "H1_CUSTOMER_ROLE_OR_AMBIGUOUS_SERVICE_NAME",
          value: actual,
        });
      }
    }
    return {
      familyId,
      templateCount: bank.length,
      minimumFrequency: Math.min(...counts),
      maximumFrequency: Math.max(...counts),
      sentenceTemplates: counts.map((count, index) => ({
        sentenceId: `${familyId}:v${index.toString().padStart(2, "0")}`,
        count,
      })),
    };
  });
  const rawTitles = exactAudit(contents.map((content) => content.title));
  const rawH1 = exactAudit(contents.map((content) => content.h1));
  return {
    policyVersion: "rang-seo-title-h1-complete-copy-bank/v1",
    acceptedMaximumFrequency,
    rules: [
      "title과 H1은 각각 사람 작성 완전 문형 11개 중 하나를 사용합니다.",
      "각 문형은 현재 route label을 정확히 한 번 사용하며 지역명만 치환한 단일 문형을 금지합니다.",
      "title은 60자 이하이고 랑테라피를 정확히 한 번 포함합니다.",
      "H1은 고객이 이동하거나 도착하는 인상을 주지 않고 주소와 희망 시각 확인을 중심으로 씁니다.",
      "raw title과 H1은 1,291개 경로에서 각각 전수 고유해야 합니다.",
    ],
    bankCount: banks.length,
    templateCount: banks.reduce((sum, bank) => sum + bank.templateCount, 0),
    maximumFrequency: Math.max(...banks.map((bank) => bank.maximumFrequency)),
    rawTitles,
    rawH1,
    maximumTitleLength: Math.max(...contents.map((content) => content.title.length)),
    banks,
    violations: violations.slice(0, 24),
    verdict:
      violations.length === 0 &&
      rawTitles.verdict === "PASS" &&
      rawH1.verdict === "PASS" &&
      banks.every(
        (bank) =>
          bank.minimumFrequency >= 117 &&
          bank.maximumFrequency <= acceptedMaximumFrequency,
      )
        ? "PASS"
        : "FAIL",
  };
}

function wordTrigrams(value: string): Set<string> {
  const tokens = value.split(/\s+/u).filter(Boolean);
  if (tokens.length < 3) return new Set(tokens);
  return new Set(
    Array.from(
      { length: tokens.length - 2 },
      (_, index) => tokens.slice(index, index + 3).join("\u001f"),
    ),
  );
}

function normalizeSimilarityText(value: string): string {
  return normalizeRegionalText(value)
    .replace(
      /(?:주소|시각|코스|결제)(?:\s+(?:주소|시각|코스|결제)){2,3}/gu,
      "확인 순서",
    )
    .replace(/(?:^|\s)(?:은|는|이|가|을|를|과|와|으로|로)(?=\s|$)/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function buildSentenceSimilarityAudit(contents: readonly RegionContent[]) {
  const sentenceMaps = contents.map(
    (content) =>
      new Map(
        customerSentenceEntries(content).map((entry) => [
          entry.familyId,
          {
            raw: entry.value,
            normalized: normalizeSimilarityText(entry.value),
          },
        ]),
      ),
  );
  for (const [index, sentenceMap] of sentenceMaps.entries()) {
    const missing = CURATED_SENTENCE_FAMILIES.filter((family) => !sentenceMap.has(family));
    const extra = [...sentenceMap.keys()].filter(
      (family) => !CURATED_SENTENCE_FAMILIES.includes(family as never),
    );
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `RANG_SENTENCE_SIMILARITY_SHAPE:${ACTIVE_REGION_NODES[index].path}:${missing.join(",")}:${extra.join(",")}`,
      );
    }
  }

  const candidateDeltas = [1, 11, 121, 143] as const;
  const acceptanceThreshold = 0.75;
  type SimilarityCandidate = {
    similarity: number;
    sentenceSlot: number;
    familyId: string;
    leftRoute: string;
    rightRoute: string;
    left: string;
    right: string;
    normalizedLeft: string;
    normalizedRight: string;
  };
  const topCandidateByFamily = new Map<string, SimilarityCandidate>();
  let maximumSimilarity = 0;
  let sampledPairs = 0;
  let candidatePairsBeforeExactReuseExclusion = 0;
  let skippedWhitelistedExactReusePairs = 0;

  for (const [sentenceSlot, familyId] of CURATED_SENTENCE_FAMILIES.entries()) {
    const raw = sentenceMaps.map((sentenceMap) => sentenceMap.get(familyId)?.raw ?? "");
    const normalized = sentenceMaps.map(
      (sentenceMap) => sentenceMap.get(familyId)?.normalized ?? "",
    );
    const grams = normalized.map(wordTrigrams);
    for (let left = 0; left < contents.length; left += 1) {
      for (const delta of candidateDeltas) {
        const right = left + delta;
        if (right >= contents.length) continue;
        candidatePairsBeforeExactReuseExclusion += 1;
        if (normalized[left] === normalized[right]) {
          skippedWhitelistedExactReusePairs += 1;
          continue;
        }
        sampledPairs += 1;
        const similarity = jaccard(grams[left], grams[right]);
        const candidate = {
          similarity: Number(similarity.toFixed(6)),
          sentenceSlot,
          familyId,
          leftRoute: ACTIVE_REGION_NODES[left].path,
          rightRoute: ACTIVE_REGION_NODES[right].path,
          left: raw[left],
          right: raw[right],
          normalizedLeft: normalized[left],
          normalizedRight: normalized[right],
        };
        maximumSimilarity = Math.max(maximumSimilarity, candidate.similarity);
        const existing = topCandidateByFamily.get(familyId);
        if (
          !existing ||
          candidate.similarity > existing.similarity ||
          (candidate.similarity === existing.similarity &&
            `${candidate.leftRoute}\u0000${candidate.rightRoute}`.localeCompare(
              `${existing.leftRoute}\u0000${existing.rightRoute}`,
              "ko",
            ) < 0)
        ) {
          topCandidateByFamily.set(familyId, candidate);
        }
      }
    }
  }

  const topCandidates = [...topCandidateByFamily.values()]
    .sort(
      (a, b) =>
        b.similarity - a.similarity ||
        a.sentenceSlot - b.sentenceSlot ||
        a.leftRoute.localeCompare(b.leftRoute, "ko") ||
        a.rightRoute.localeCompare(b.rightRoute, "ko"),
    )
    .slice(0, 12);

  return {
    method:
      "same-curated-sentence-family distinct-normalized-and-verified-root-order-canonicalized word-trigram Jaccard over ordinal deltas 1,11,121,143",
    sentenceSlots: CURATED_SENTENCE_FAMILIES.length,
    candidateDeltas,
    candidatePairsBeforeExactReuseExclusion,
    skippedWhitelistedExactReusePairs,
    sampledPairs,
    humanReviewSampleMethod:
      "highest distinct-normalized candidate per sentence family, then top 12 across families",
    acceptanceThreshold,
    maximumSimilarity: Number(maximumSimilarity.toFixed(6)),
    automatedVerdict: maximumSimilarity < acceptanceThreshold ? "PASS" : "FAIL",
    humanReviewRequired: true,
    topCandidates,
  };
}

export function buildDiversityAudit(contents: readonly RegionContent[]) {
  const documents = contents.map(normalizedDocument);
  const paragraphs = contents.flatMap(normalizedParagraphs);
  const sentences = contents.flatMap(normalizedSentences);
  const rawParagraphEntries = paragraphEntries(contents, false);
  const rawSentenceEntries = sentenceEntries(contents);
  const rawSentenceExactAudit = exactAudit(
    rawSentenceEntries.map((entry) => entry.value),
  );
  const normalizedDocumentReuse = buildCuratedReuseAudit(
    documents.map((value, index) => ({
      familyId: "full-document",
      route: ACTIVE_REGION_NODES[index].path,
      value,
    })),
    ["full-document"],
    128,
    {
      policyVersion: "rang-normalized-template-diagnostic/v1",
      rationale:
        "지역명·숫자를 제거한 문서 패턴은 same-family 자연문장 bank의 과다 사용을 찾는 진단이며 최대 128개 경로까지만 허용합니다.",
    },
  );
  const normalizedParagraphReuse = buildCuratedReuseAudit(
    rawParagraphEntries,
    CURATED_PARAGRAPH_FAMILIES,
    128,
    {
      policyVersion: "rang-normalized-template-diagnostic/v1",
      rationale:
        "지역명·숫자를 제거한 문단 패턴은 same-slot 자연문장 bank의 과다 사용을 찾는 진단이며 최대 128개 경로까지만 허용합니다.",
    },
  );
  const normalizedSentenceReuse = buildCuratedReuseAudit(
    rawSentenceEntries,
    CURATED_SENTENCE_FAMILIES,
    128,
    {
      policyVersion: "rang-normalized-template-diagnostic/v1",
      rationale:
        "지역명·숫자를 제거한 문장은 같은 정확한 subslot 안에서만 최대 128개 경로까지 허용하며 raw exact 재사용 허가는 별도 bank 정책으로 제한합니다.",
    },
  );
  const approvedExactValuesByFamily = new Map(
    CURATED_SECOND_SENTENCE_FAMILIES.map((familyId) => [
      familyId,
      new Set(
        CURATED_SECOND_SENTENCE_BANKS[familyId].sentences.map((sentence) =>
          sentence.normalize("NFC").trim(),
        ),
      ),
    ]),
  );
  const visibleSentenceReuse = buildCuratedReuseAudit(
    rawSentenceEntries,
    CURATED_SECOND_SENTENCE_FAMILIES,
    128,
    {
      valueNormalizer: (value) => value.normalize("NFC").trim(),
      policyVersion: "rang-visible-exact-section-slot-bank/v2",
      rationale:
        "raw exact 재사용은 등록된 둘째 완전문장의 정확한 section+paragraph+sentence slot에서만 최대 128개 경로까지 허용되며 외부 사람 검수는 별도 대기합니다.",
      approvedExactValuesByFamily,
    },
  );
  const secondSentenceBanks = buildSecondSentenceBankAudit(contents);
  const regionalSentenceBanks = buildRegionalSentenceBankAudit(contents);
  const seoCopyBanks = buildSeoCopyBankAudit(contents);
  return {
    normalizer: CONTENT_NORMALIZER_VERSION,
    geographicTermsRemoved: UNIQUE_GEOGRAPHIC_TERMS.length,
    rawDocuments: exactAudit(contents.map(rawDocument)),
    rawParagraphs: exactAudit(rawParagraphEntries.map((entry) => entry.value)),
    rawSentences: {
      ...rawSentenceExactAudit,
      exactUniquenessRequired: false,
      exactUniquenessVerdict: rawSentenceExactAudit.verdict,
      evaluatedBy: "visibleSentenceReusePolicy",
      verdict: visibleSentenceReuse.verdict,
    },
    visibleSentenceReusePolicy: visibleSentenceReuse,
    regionalSentenceBanks,
    secondSentenceBanks,
    seoCopyBanks,
    normalizedDocuments: {
      total: documents.length,
      unique: new Set(documents).size,
      duplicateCount: documents.length - new Set(documents).size,
      maximumFrequency: maximumFrequency(documents),
    },
    normalizedParagraphs: {
      total: paragraphs.length,
      unique: new Set(paragraphs).size,
      duplicateCount: paragraphs.length - new Set(paragraphs).size,
      maximumFrequency: maximumFrequency(paragraphs),
    },
    normalizedSentences: {
      total: sentences.length,
      unique: new Set(sentences).size,
      duplicateCount: sentences.length - new Set(sentences).size,
      maximumFrequency: maximumFrequency(sentences),
    },
    normalizedReusePolicy: {
      documents: normalizedDocumentReuse,
      paragraphs: normalizedParagraphReuse,
      sentences: normalizedSentenceReuse,
      verdict:
        normalizedDocumentReuse.verdict === "PASS" &&
        normalizedParagraphReuse.verdict === "PASS" &&
        normalizedSentenceReuse.verdict === "PASS"
          ? "PASS"
          : "FAIL",
    },
    sentenceSurface: buildSentenceSurfaceAudit(contents),
    sentencePrefixes: buildSentencePrefixAudit(contents),
    paragraphNgrams: buildParagraphNgramAudit(contents),
    intraDocumentNgrams: buildIntraDocumentNgramAudit(contents),
    sentenceSimilarity: buildSentenceSimilarityAudit(contents),
  };
}
