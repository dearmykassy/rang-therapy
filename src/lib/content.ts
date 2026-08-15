import { COURSE_SCORES } from "@/lib/business";
import type { RegionNode } from "@/lib/regions";
import {
  ACTIVE_REGION_NODES,
  getKeywordRegionLabel,
} from "@/lib/regions";

export const KEYWORD_FAMILIES = [
  "출장마사지",
  "출장안마",
  "출장타이마사지",
  "출장스웨디시",
  "출장홈타이",
  "토닥이",
  "남성전용마사지",
  "여성전용마사지",
] as const;

export const CONTENT_CORE_PHRASES = [
  "서비스를 받을 정확한 주소",
  "도로명과 건물명",
  "희망 시작 시각",
  "이용 인원",
  "연락받을 고객 번호",
  "코스별 시간",
  "해당 주소의 서비스 가능 여부",
  "표시 금액",
  "선입금 없는 현장 후불",
  "현장 카드 결제",
  "공식 전화번호",
  "건물 출입 방식",
  "당일 운영 여부",
  "주소·시각·코스·결제",
] as const;

export type ContentSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

export type RegionContent = {
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  eyebrow: string;
  hooks: string[];
  sections: ContentSection[];
  ctaLabels: string[];
};

type RegionalSentenceTemplate = (node: RegionNode, label: string) => string;
type ElevenRegionalSentences = readonly [
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
  RegionalSentenceTemplate,
];
export type CuratedRegionalSentenceFamily =
  | "description"
  | "hook:0:0"
  | "hook:1:0"
  | "frame-directory-first:p0:s0"
  | "frame-directory-first:p1:s0"
  | "pulse-coordinate-note:p0:s0"
  | "pulse-coordinate-note:p1:s0"
  | "tempo-time-window:p0:s0"
  | "tempo-time-window:p1:s0"
  | "score-course-ledger:p0:s0"
  | "score-course-ledger:p1:s0"
  | "settlement-last-beat:p0:s0"
  | "settlement-last-beat:p1:s0"
  | "coda-before-arrival:p0:s0"
  | "coda-before-arrival:p1:s0";
export type CuratedSecondSentenceFamily =
  | "frame-directory-first:p0:s1"
  | "frame-directory-first:p1:s1"
  | "pulse-coordinate-note:p0:s1"
  | "pulse-coordinate-note:p1:s1"
  | "tempo-time-window:p0:s1"
  | "tempo-time-window:p1:s1"
  | "score-course-ledger:p0:s1"
  | "score-course-ledger:p1:s1"
  | "settlement-last-beat:p0:s1"
  | "settlement-last-beat:p1:s1"
  | "coda-before-arrival:p0:s1"
  | "coda-before-arrival:p1:s1";

type RegionalSeoTemplate = (label: string) => string;
type ElevenRegionalSeoTemplates = readonly [
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
  RegionalSeoTemplate,
];

type ParagraphPlan = readonly [
  CuratedRegionalSentenceFamily,
  CuratedSecondSentenceFamily,
];
type ElevenContexts = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

function contextBank(...values: ElevenContexts): ElevenContexts {
  return values;
}

function regionalSentenceBank(
  ...values: ElevenRegionalSentences
): ElevenRegionalSentences {
  return values;
}

function regionalSeoBank(
  ...values: ElevenRegionalSeoTemplates
): ElevenRegionalSeoTemplates {
  return values;
}

export const CURATED_TITLE_BANK = regionalSeoBank(
  (label) => `${label} 랑테라피 | 주소·시간·코스 이용 안내`,
  (label) => `${label} 랑테라피 | 코스와 시간을 고르는 이용 안내`,
  (label) => `${label} 랑테라피 | 가격표부터 현장 결제까지`,
  (label) => `${label} 랑테라피 | 원하는 일정에 맞춘 테라피`,
  (label) => `${label} 랑테라피 | 코스·가격·시작 시간 안내`,
  (label) => `${label} 랑테라피 | 서비스 주소와 희망 시각 상담`,
  (label) => `${label} 랑테라피 | 24시간 이용 일정 상담`,
  (label) => `${label} 랑테라피 | 선입금 없는 현장 후불 안내`,
  (label) => `${label} 랑테라피 | 코스별 시간과 가격표 확인`,
  (label) => `${label} 랑테라피 | 서비스 전 주소·일정 준비`,
  (label) => `${label} 랑테라피 | 현장 카드 결제와 코스 안내`,
);

export const CURATED_H1_BANK = regionalSeoBank(
  (label) => `${label}, 원하는 시간에 맞춘 랑테라피`,
  (label) => `${label} 일정에 맞춰 고르는 랑테라피`,
  (label) => `${label} 서비스 전에 확인하는 코스와 시간`,
  (label) => `${label}, 서비스를 받을 주소와 희망 시각을 맞추는 랑테라피`,
  (label) => `${label}, 하루 일정에 맞춘 코스와 시작 시간`,
  (label) => `${label}의 주소와 일정에 맞춘 랑테라피`,
  (label) => `${label}, 코스부터 현장 결제까지 한눈에`,
  (label) => `${label} 서비스에 필요한 주소·시간·코스 안내`,
  (label) => `${label}에서 준비하는 나만의 테라피 일정`,
  (label) => `${label}, 선입금 없이 확인하는 코스와 현장 결제`,
  (label) => `${label}에서 고르는 코스와 희망 시작 시각`,
);

type CuratedSecondSentenceBank = {
  classification: "verified-operating-fact" | "candidate-customer-guidance";
  sentences: readonly string[];
};

export const CURATED_SECOND_SENTENCE_BANKS: Record<
  CuratedSecondSentenceFamily,
  CuratedSecondSentenceBank
> = {
  "frame-directory-first:p0:s1": {
    classification: "candidate-customer-guidance",
    sentences: [
      "도로명과 건물명을 적은 뒤 필요한 동·호수는 별도 항목으로 남겨 주세요.",
      "도로명, 건물명, 동·호수 순서로 서비스를 받을 정확한 주소를 정리하면 전달하기 쉽습니다.",
      "건물 출입 안내가 필요하다면 주소와 구분해 메모해 주세요.",
      "주소 표기가 길어도 도로명과 건물명은 생략하지 않는 편이 좋습니다.",
      "서비스를 받을 건물명까지 확인하면 같은 도로 안에서도 이용할 주소를 구분하기 쉽습니다.",
      "도로명 주소가 없다면 지번과 건물명을 함께 준비해 주세요.",
      "건물 이름만 알고 있다면 지도나 건물 안내에서 도로명 주소를 함께 확인해 보세요.",
      "동·호수처럼 민감한 상세 정보는 전화상담에서 직접 전해 주세요.",
      "출입 방법은 주소와 분리해 적어 두면 통화 중 빠뜨리지 않습니다.",
      "건물명이 비슷한 곳이 있을 수 있으니 도로명도 함께 확인하세요.",
      "전달할 서비스 주소에 오탈자가 없는지 전화상담 전에 한 번 살펴보세요.",
    ] as const,
  },
  "frame-directory-first:p1:s1": {
    classification: "candidate-customer-guidance",
    sentences: [
      "지역 선택을 마쳤다면 희망 시각과 코스 후보를 따로 적어 주세요.",
      "전화상담 메모에는 이용 인원과 연락받을 고객 번호를 따로 적어 주세요.",
      "공동현관이나 출입 절차가 있다면 통화 전에 필요한 내용만 정리하세요.",
      "현장 카드 결제를 계획했다면 코스와 시간을 고를 때 함께 알려 주세요.",
      "가장 원하는 시작 시각과 조정 가능한 범위를 나눠 메모해 주세요.",
      "이용 시간과 예산을 함께 살펴 코스 후보를 두 가지 안으로 줄여 보세요.",
      "전화상담에서 확인할 질문은 짧은 목록으로 적어 주세요.",
      "연락받을 고객 번호에 오타가 없는지 통화 전에 확인하세요.",
      "이용 인원이 달라졌다면 상담을 마치기 전에 새 인원을 알려 주세요.",
      "사용할 입구는 출입구가 여러 곳일 때 통화에서 구체적으로 설명해 주세요.",
      "희망 코스를 정한 뒤 현장 결제 방식을 함께 확인해 주세요.",
      "당일 일정이 바뀔 수 있다면 조정 가능한 시간 범위도 함께 알려 주세요.",
      "공동현관 정보는 통화에서 필요한 범위만 전해 주세요.",
      "연락받을 고객 번호를 정확히 적었는지 먼저 확인해 주세요.",
      "코스 후보와 이용 인원은 구분해 알려 주세요.",
      "출입 절차가 있다면 서비스 시작 전에 필요한 내용만 설명해 주세요.",
      "개인 요청은 주소 정보와 섞지 말고 따로 정리해 주세요.",
      "코스와 시각을 정할 때 카드 결제 계획도 함께 말해 주세요.",
      "시간 조정 범위가 있다면 가장 원하는 시각과 나눠 알려 주세요.",
      "사용할 출입구는 건물 입구가 여러 곳일 때 통화로 설명해 주세요.",
      "연락받을 고객 번호가 바뀌었다면 현재 사용하는 번호를 상담 중 알려 주세요.",
      "코스 메모에는 이용 시간과 예산을 별도로 적어 주세요.",
    ] as const,
  },
  "pulse-coordinate-note:p0:s1": {
    classification: "candidate-customer-guidance",
    sentences: contextBank(
      "도로명과 건물명 뒤에 필요한 동·호수를 덧붙여 주세요.",
      "주소와 희망 시각을 한 줄씩 나누면 상담 내용을 전달하기 쉽습니다.",
      "공동현관 안내가 있다면 서비스 장소의 도로명과 구분해 메모해 두세요.",
      "건물 이름만 적기보다 도로명 주소도 함께 준비해 주세요.",
      "주소를 복사한 뒤 건물명과 동·호수가 빠지지 않았는지 확인하세요.",
      "지번 주소를 쓸 때도 서비스를 받을 정확한 건물명과 동·호수를 함께 알려 주세요.",
      "도로명과 건물명을 먼저 적고 출입 안내는 마지막에 덧붙이세요.",
      "희망 시작 시각은 오전과 오후를 구분해 적어 주세요.",
      "긴 서비스 주소는 도로명, 건물명, 동·호수로 나누어 메모하세요.",
      "건물 안내에 적힌 주소와 메모가 같은지 대조해 보세요.",
      "서비스를 받을 곳이 달라졌다면 최종 도로명과 건물명을 분명히 알려 주세요.",
    ),
  },
  "pulse-coordinate-note:p1:s1": {
    classification: "candidate-customer-guidance",
    sentences: contextBank(
      "이용 인원과 연락받을 고객 번호를 상담 중 함께 알려 주세요.",
      "연락받을 고객 번호는 오타를 확인한 뒤 알려 주세요.",
      "여러 명이 이용한다면 정확한 인원을 상담 중 알려 주세요.",
      "주소와 희망 시각, 이용 인원을 서로 다른 줄에 적어 보세요.",
      "문의할 때는 현재 연락받을 고객 번호를 알려 주세요.",
      "예산이 정해졌다면 코스 후보와 함께 별도 항목으로 적어 주세요.",
      "개인 요청은 서비스 주소와 섞지 말고 따로 메모하세요.",
      "이용 인원이 바뀌었다면 상담 중 바로 알려 주세요.",
      "상담이 끝나기 전에 연락받을 고객 번호를 다시 확인해 주세요.",
      "서비스 주소와 연락받을 고객 번호는 서로 다른 줄에 적어 두세요.",
      "예약자와 이용자가 다르면 정확한 이용 인원을 알려 주세요.",
    ),
  },
  "tempo-time-window:p0:s1": {
    classification: "candidate-customer-guidance",
    sentences: contextBank(
      "가격표에는 60분, 90분, 120분 코스가 구분되어 있습니다.",
      "실제로 비워 둘 수 있는 시간 안에서 코스를 골라 주세요.",
      "시작 시각뿐 아니라 코스가 끝날 무렵의 일정도 함께 생각해 보세요.",
      "다른 약속이 이어진다면 코스 종료 시각과 겹치지 않는지 확인하세요.",
      "시간이 넉넉하지 않다면 이용 가능한 짧은 코스를 전화로 물어보세요.",
      "하루 일정표에 시작 시각과 예상 종료 시각을 함께 적어 두세요.",
      "60분과 90분, 120분 가운데 필요한 길이를 가격표에서 확인할 수 있습니다.",
      "각 코스의 이용 시간은 가격표에서 확인할 수 있습니다.",
      "일정이 겹치지 않도록 시작 전후의 여유를 확인하세요.",
      "가격표에서 코스별 이용 시간을 확인한 뒤 후보를 정하세요.",
      "시작 시간을 정하기 어렵다면 가능한 시간대를 전화로 문의하세요.",
    ),
  },
  "tempo-time-window:p1:s1": {
    classification: "verified-operating-fact",
    sentences: contextBank(
      "당일 요청한 주소에서 서비스를 받을 수 있는지와 시작 시각은 전화상담에서 확인합니다.",
      "전화상담은 24시간 열려 있어 가능한 일정을 언제든 물어볼 수 있습니다.",
      "희망 시각의 가능 여부는 통화에서 확인한 뒤 확정됩니다.",
      "코스 시간과 시작 시각은 전화상담에서 함께 조율합니다.",
      "같은 날이라도 가능한 시각은 전화상담에서 다시 확인해 주세요.",
      "24시간 전화상담을 통해 당일 운영 여부를 확인할 수 있습니다.",
      "시작 시각은 상담에서 해당 주소의 서비스 가능 여부를 확인한 뒤 정해집니다.",
      "원하는 시작 시각과 코스 시간을 함께 말하면 가능 여부를 확인할 수 있습니다.",
      "일정이 바뀌었다면 전화상담에서 새 시각의 가능 여부를 다시 물어보세요.",
      "당일 가능한 시작 시각은 통화 시점의 운영 상황에 따라 안내합니다.",
      "서비스 일정은 전화상담으로 가능 여부를 확인해야 확정됩니다.",
    ),
  },
  "score-course-ledger:p0:s1": {
    classification: "verified-operating-fact",
    sentences: contextBank(
      "타이마사지는 60분 80,000원부터 가격표에 표시되어 있습니다.",
      "아로마마사지는 60분 90,000원부터 시작합니다.",
      "힐링마사지는 60분 100,000원부터 가격표에서 확인할 수 있습니다.",
      "스페셜마사지는 60분 110,000원부터 표시되어 있습니다.",
      "남성전용 코스는 60분 120,000원과 90분 150,000원으로 표시됩니다.",
      "타이마사지 90분은 100,000원, 120분은 120,000원입니다.",
      "아로마마사지 90분은 110,000원이고 120분은 130,000원입니다.",
      "힐링마사지 90분은 120,000원, 120분은 140,000원입니다.",
      "스페셜마사지 90분은 130,000원이며 120분은 150,000원입니다.",
      "가격표에는 코스 이름과 이용 시간, 표시 금액이 함께 정리되어 있습니다.",
      "타이마사지 60분 코스는 80,000원으로 표시되어 있습니다.",
    ),
  },
  "score-course-ledger:p1:s1": {
    classification: "candidate-customer-guidance",
    sentences: contextBank(
      "실제 이용 가능한 코스는 전화상담에서 확인합니다.",
      "선택한 코스의 당일 가능 여부는 희망 시각과 함께 물어보세요.",
      "가격표의 코스가 모두 같은 시간대에 가능한 것은 아니므로 통화로 확인해 주세요.",
      "코스와 시작 시각은 24시간 전화상담에서 함께 문의할 수 있습니다.",
      "최종 코스는 요청한 주소와 시각의 서비스 가능 여부를 확인한 뒤 정해집니다.",
      "원하는 관리 방식과 이용 시간을 함께 말하면 가능한 코스를 안내받을 수 있습니다.",
      "당일 가능한 코스와 시작 시각은 전화상담에서 확인해 주세요.",
      "코스를 고른 뒤 희망 시각에 이용할 수 있는지 전화로 물어보세요.",
      "일정이 먼저 정해졌다면 그 시각에 가능한 코스를 상담해 보세요.",
      "코스 선택이 어렵다면 관리 방식과 예산을 말하고 가능한 코스를 확인하세요.",
      "가격표에서 후보를 고른 뒤 전화로 가능 여부를 확인하세요.",
    ),
  },
  "settlement-last-beat:p0:s1": {
    classification: "verified-operating-fact",
    sentences: contextBank(
      "현장에서는 카드로 결제할 수 있습니다.",
      "서비스를 받은 뒤 현장 카드 결제가 가능합니다.",
      "후불 결제 시 카드도 사용할 수 있습니다.",
      "이용이 끝나면 현장에서 카드로 결제할 수 있습니다.",
      "현장 후불 결제에는 카드를 사용할 수 있습니다.",
      "이용이 끝난 뒤 카드로 현장 정산할 수 있습니다.",
      "카드를 사용할 경우에도 결제는 현장에서 진행됩니다.",
      "현장 결제에는 카드 사용이 가능합니다.",
      "카드 결제는 서비스를 받은 뒤 현장에서 진행됩니다.",
      "카드 결제는 이용을 마친 뒤 현장에서 할 수 있습니다.",
      "현장에서 카드로 결제할 수 있으며, 원하면 상담할 때 미리 알려 주세요.",
    ),
  },
  "settlement-last-beat:p1:s1": {
    classification: "verified-operating-fact",
    sentences: contextBank(
      "모든 이용은 선입금 없이 서비스를 받은 뒤 현장에서 결제합니다.",
      "예약 전에 비용을 송금하지 않는 100% 현장 후불이 원칙입니다.",
      "비용은 이용이 끝난 다음 현장에서 정산합니다.",
      "선결제를 요구하지 않으며 이용을 마친 뒤 현장에서 정산합니다.",
      "예약금이나 선입금 없이 현장 후불로 이용할 수 있습니다.",
      "비용은 미리 보내지 않고 서비스가 끝난 뒤 현장에서 결제합니다.",
      "상담에서 정한 금액은 이용 후 현장에서 지불합니다.",
      "결제 시점은 예약 전이 아니라 서비스를 받은 뒤입니다.",
      "현장 후불 원칙에 따라 이용 전에 송금할 필요가 없습니다.",
      "선입금 없는 결제 방식이므로 이용을 마친 뒤 현장에서 정산합니다.",
      "예약 과정에서는 선결제를 받지 않고 현장에서 후불로 결제합니다.",
    ),
  },
  "coda-before-arrival:p0:s1": {
    classification: "candidate-customer-guidance",
    sentences: contextBank(
      "원하는 관리 방식은 상담 메모에 다시 적어 두세요.",
      "건물 입구가 여러 곳이면 사용할 출입구를 구체적으로 알려 주세요.",
      "별도 출입 절차는 서비스 주소와 함께 전화상담에서 전해 주세요.",
      "서비스 공간에 관한 요청은 상담을 마치기 전에 알려 주세요.",
      "시작 시각이 달라졌다면 기존 시각 대신 새 일정을 메모해 주세요.",
      "이용 공간의 개인 물품은 서비스 전에 한쪽으로 정리해 주세요.",
      "공동현관 이용 방법은 서비스 주소와 구분해 알려 주세요.",
      "건물 출입 규정이 있다면 필요한 안내만 간단히 정리해 주세요.",
      "건물명이 비슷한 곳과 헷갈리지 않도록 도로명을 함께 전해 주세요.",
      "엘리베이터나 출입구 이용에 제한이 있다면 전화상담에서 알려 주세요.",
      "출입구가 여러 곳이면 서비스 주소와 가까운 입구를 지정해 주세요.",
    ),
  },
  "coda-before-arrival:p1:s1": {
    classification: "candidate-customer-guidance",
    sentences: contextBank(
      "주소와 시작 시각은 통화 말미에 한 번 더 확인하세요.",
      "최종 메모에는 확정된 코스와 현장 결제 방식만 남겨 주세요.",
      "예정 시각이 달라졌다면 전화상담으로 새 일정을 확인해 주세요.",
      "확정된 주소와 시작 시각은 마지막 메모에서 다시 확인하세요.",
      "주소, 코스, 시작 시각이 통화 내용과 같은지 살펴보세요.",
      "현장 후불과 카드 결제 계획도 마지막 메모에 함께 적어 두세요.",
      "일정이 바뀌면 기존 메모를 지우고 새로 확인한 내용만 남기세요.",
      "확정된 코스와 결제 방식은 통화 내용을 기준으로 확인하세요.",
      "시작 시각을 바꾸려면 새 시각에 서비스를 받을 수 있는지 먼저 물어보세요.",
      "통화 말미에는 연락받을 고객 번호를 다시 확인해 주세요.",
      "서비스 일정은 주소, 시각, 코스와 현장 결제 방식을 확인한 뒤 확정됩니다.",
    ),
  },
};

const REGION_ORDINAL = new Map(
  ACTIVE_REGION_NODES.map((node, index) => [node.id, index]),
);

const SECTION_ORDERS = [
  ["coordinate", "tempo", "score", "settlement", "arrival"],
  ["coordinate", "score", "tempo", "settlement", "arrival"],
  ["tempo", "coordinate", "score", "arrival", "settlement"],
  ["score", "coordinate", "tempo", "settlement", "arrival"],
  ["coordinate", "tempo", "settlement", "score", "arrival"],
  ["tempo", "score", "coordinate", "settlement", "arrival"],
  ["coordinate", "settlement", "score", "tempo", "arrival"],
  ["score", "tempo", "coordinate", "arrival", "settlement"],
  ["tempo", "coordinate", "settlement", "score", "arrival"],
  ["coordinate", "score", "settlement", "tempo", "arrival"],
] as const;

const ROOT_KEYS: RegionNode["rootKey"][] = [
  "seoul",
  "incheon",
  "gyeonggi",
  "cheonan",
  "asan",
  "daejeon",
  "daegu",
  "gumi",
  "pohang",
  "busan",
  "jeju",
];

const COURSE_NAMES = [...new Set(COURSE_SCORES.map((score) => score.course))].join("·");

function ordinalFor(node: RegionNode): number {
  const ordinal = REGION_ORDINAL.get(node.id);
  if (ordinal === undefined) throw new Error(`RANG_CONTENT_NODE_NOT_ACTIVE:${node.id}`);
  return ordinal;
}

export const CURATED_REGIONAL_SENTENCE_BANKS: Record<
  CuratedRegionalSentenceFamily,
  ElevenRegionalSentences
> = {
  description: regionalSentenceBank(
    (_node, label) => `${label} 랑테라피 안내에서는 서비스를 받을 정확한 주소와 희망 시각, 코스별 시간과 표시 금액, 24시간 전화상담, 선입금 없는 현장 후불과 카드 결제 기준을 한눈에 살펴볼 수 있습니다`,
    (_node, label) => `${label} 랑테라피 이용 안내에는 도로명과 건물명, 원하는 시작 시각, 코스별 소요 시간과 표시 금액, 24시간 전화상담, 현장 후불과 카드 결제 기준이 정리되어 있습니다`,
    (_node, label) => `${label} 랑테라피는 서비스를 받을 정확한 주소와 연락받을 고객 번호를 준비하는 방법, 관리 방식별 코스 시간과 표시 금액, 24시간 전화상담, 선입금 없는 현장 결제 원칙을 간결하게 안내합니다`,
    (_node, label) => `${label} 랑테라피 소개에는 도로명 주소와 희망 시작 시각, 이용 인원, 코스별 소요 시간과 예산, 당일 가능 여부를 묻는 24시간 전화상담, 예약금 없는 후불과 카드 결제 기준이 담겨 있습니다`,
    (_node, label) => `${label} 랑테라피 이용 안내에서는 도로명 주소와 건물명, 희망 시각, 관리 방식별 가격표, 24시간 전화상담, 선입금 없는 현장 후불·카드 결제 정보를 확인할 수 있습니다`,
    (_node, label) => `${label} 랑테라피 방문 정보에는 코스 종류와 소요 시간, 표시 금액, 상담 전에 준비할 서비스 주소와 연락받을 고객 번호, 당일 운영 여부, 이용 후 현장 결제 원칙이 보기 쉽게 정리되어 있습니다`,
    (_node, label) => `${label} 랑테라피에서는 관리 방식별 코스와 가격표, 요청한 주소와 희망 시각의 서비스 가능 여부, 24시간 전화상담, 예약금 없는 현장 후불과 카드 결제 기준을 차례로 소개합니다`,
    (_node, label) => `${label} 랑테라피를 알아보는 분을 위해 건물명과 도로명, 시작 시각, 코스별 시간과 예산, 당일 가능 여부를 묻는 상담, 선입금 없는 후불 및 카드 결제 기준을 보기 쉽게 정리했습니다`,
    (_node, label) => `${label} 랑테라피 안내에는 서비스 주소·이용 인원·연락받을 고객 번호, 관리 방식별 코스 시간과 표시 금액, 당일 가능 여부를 묻는 상담, 선입금 없는 현장 후불과 카드 결제 기준이 담겨 있습니다`,
    (_node, label) => `${label} 랑테라피 소개에서 코스별 관리 방식과 가격, 서비스를 받을 정확한 주소와 희망 시각, 당일 가능 여부를 묻는 24시간 전화상담, 예약금 없는 현장 결제 정보를 한눈에 확인하세요`,
    (_node, label) => `${label} 랑테라피의 가격표와 관리 방식별 코스, 서비스 전 확인할 주소와 시작 시각, 당일 운영 여부, 24시간 전화상담, 선입금 없는 현장 후불과 카드 결제 기준을 안내합니다`,
  ),
  "hook:0:0": regionalSentenceBank(
    (_node, label) => `${label} 서비스 메모에는 서비스를 받을 정확한 주소, 희망 시각, 코스, 결제 방식을 나누어 적으세요`,
    (_node, label) => `${label}에서 확인하지 못한 이용 조건은 전화 전에 따로 표시해 두세요`,
    (_node, label) => `${label} 문의 전에는 희망 시작 시각과 이용 인원을 준비하세요`,
    (_node, label) => `${label} 서비스 주소가 정해졌다면 관리 방식과 예산을 메모하세요`,
    (_node, label) => `${label} 서비스 계획은 주소, 코스, 희망 시간을 구분해 메모하세요`,
    (_node, label) => `${label} 문의에서는 서비스를 받을 주소와 희망 시각을 전화로 알려 주세요`,
    (_node, label) => `${label} 서비스 주소와 출입 방법은 서로 다른 항목으로 남겨 주세요`,
    (_node, label) => `${label} 일정을 잡기 전에 코스별 시간과 금액을 함께 살펴보세요`,
    (_node, label) => `${label} 서비스 요청에는 도로명, 시작 시각, 관리 방식을 분명히 적으세요`,
    (_node, label) => `${label} 서비스 일정을 정하기 전에 희망 시각과 코스를 정리해 두세요`,
    (_node, label) => `${label} 상담 메모에는 희망 시각과 코스, 인원을 따로 적으세요`,
  ),
  "hook:1:0": regionalSentenceBank(
    (_node, label) => `${label}에서 오늘 요청한 주소와 시각으로 서비스를 받을 수 있는지는 24시간 전화상담으로 확인하며, 카드 결제를 원하면 통화 중 알려 주세요`,
    (_node, label) => `${label}에서 가능한 시작 시각과 이용할 코스는 통화한 뒤 확정됩니다`,
    (_node, label) => `${label} 운영 여부는 전화로 확인하며 비용은 서비스를 받은 뒤 현장에서 결제합니다`,
    (_node, label) => `${label}의 코스와 희망 시각이 가능하다는 답변을 받은 뒤 요청 내용을 확정하세요`,
    (_node, label) => `${label}에서는 선입금을 받지 않으며 현장에서 카드로 결제할 수 있습니다`,
    (_node, label) => `${label}의 당일 서비스 시작 시각은 운영 상황에 따라 달라질 수 있으니 전화로 물어보세요`,
    (_node, label) => `${label}에서는 예약금을 미리 보내지 않고 서비스를 받은 뒤 현장에서 후불로 정산합니다`,
    (_node, label) => `${label}에서 원하는 시간대가 가능한지는 24시간 전화상담으로 확인하세요`,
    (_node, label) => `${label} 이용 전에 표시 금액을 확인하고 카드 결제를 원하면 통화에서 알려 주세요`,
    (_node, label) => `${label} 서비스 일정은 주소와 시각, 코스를 확인한 뒤에만 확정됩니다`,
    (_node, label) => `${label}의 운영 조건은 전화로 안내하며 결제는 선입금 없는 현장 후불이 원칙입니다`,
  ),
  "frame-directory-first:p0:s0": regionalSentenceBank(
    (node, label) => node.kind === "representative" ? `${label} 서비스 요청 전에는 정확한 도로명과 건물명을 먼저 확인하세요` : `${label}에 속한 지역 중 서비스를 받을 정확한 주소에 적힌 곳을 먼저 고르세요`,
    (node, label) => node.kind === "representative" ? `${label} 서비스 주소는 건물명까지 함께 확인하세요` : `${label}의 세부 지역에서 이용할 주소와 같은 행정구역 이름을 찾아보세요`,
    (node, label) => node.kind === "representative" ? `${label} 상담에는 도로명 주소와 필요한 동·호수를 준비해 주세요` : `${label}에서 서비스 주소와 일치하는 하위 지역을 찾아보세요`,
    (node, label) => node.kind === "representative" ? `${label}의 별칭보다 실제 도로명 표기를 기준으로 서비스 주소를 확인하세요` : `${label}에 속한 지역은 건물 주소에 적힌 행정구역을 기준으로 고르세요`,
    (node, label) => node.kind === "representative" ? `${label} 지역명만 적지 말고 서비스를 받을 정확한 도로명과 건물명을 함께 준비하세요` : `${label}의 세부 지역 가운데 서비스를 받을 정확한 주소가 속한 곳을 확인하세요`,
    (node, label) => node.kind === "representative" ? `${label} 지도나 건물 안내에서 서비스를 받을 주소 표기를 대조해 보세요` : `${label}에 속한 지역은 서비스를 받을 정확한 주소의 읍·면·동 이름을 따라 고르세요`,
    (node, label) => node.kind === "representative" ? `${label} 서비스 요청에는 지번보다 도로명과 건물명을 함께 적는 편이 좋습니다` : `${label}에 같은 이름의 지역이 있다면 상위 행정구역도 확인하세요`,
    (node, label) => node.kind === "representative" ? `${label} 상담 전에는 서비스를 받을 정확한 주소의 오탈자를 살펴보세요` : `${label}에서 익숙한 별칭을 보더라도 서비스를 받을 정확한 주소와 맞는지 확인하세요`,
    (node, label) => node.kind === "representative" ? `${label} 서비스 주소는 건물 안내와 도로명 표기를 함께 확인하세요` : `${label}에서 서비스 주소의 도로명 앞 행정구역을 확인하세요`,
    (node, label) => node.kind === "representative" ? `${label} 도로명 표기와 건물명이 서비스 주소와 맞는지 살펴보세요` : `${label}의 서비스 주소에서 행정동이나 읍·면 이름을 확인해 주세요`,
    (node, label) => node.kind === "representative" ? `${label}에서 건물 출입 안내가 필요하면 서비스를 받을 주소와 분리해 적어 두세요` : `${label} 하위 지역을 고른 뒤 도로명과 건물명까지 준비하세요`,
  ),
  "frame-directory-first:p1:s0": regionalSentenceBank(
    (_node, label) => `${label} 다음 준비에는 희망 시작 시각과 코스 후보를 포함하세요`,
    (_node, label) => `${label} 이용 계획에는 조정 가능한 시간대와 예산을 나누어 적으세요`,
    (_node, label) => `${label} 코스 후보는 이용 시간과 관리 방식을 기준으로 줄여 보세요`,
    (_node, label) => `${label} 카드 결제 계획은 원하는 코스와 함께 메모하세요`,
    (_node, label) => `${label} 희망 시각은 가장 원하는 시간과 조정 범위로 나누세요`,
    (_node, label) => `${label} 이용 인원은 코스 후보와 별도 항목으로 적어 주세요`,
    (_node, label) => `${label} 개인 요청은 일정이나 코스 메모와 구분해 정리하세요`,
    (_node, label) => `${label} 준비 메모에는 시간, 코스, 예산을 차례로 남겨 주세요`,
    (_node, label) => `${label} 코스 후보마다 원하는 관리 방식을 짧게 메모해 주세요`,
    (_node, label) => `${label} 일정 후보가 여러 개라면 우선순위를 표시해 주세요`,
    (_node, label) => `${label} 결제 수단은 코스와 시간을 고른 뒤 확인하세요`,
  ),
  "pulse-coordinate-note:p0:s0": regionalSentenceBank(
    (_node, label) => `${label} 문의에는 서비스를 받을 정확한 주소와 희망 시작 시각을 함께 알려 주세요`,
    (_node, label) => `${label} 서비스 요청은 도로명과 건물명을 적는 데서 시작합니다`,
    (_node, label) => `${label} 문의를 위해 서비스를 받을 정확한 주소를 준비한 뒤 원하는 시간을 정하세요`,
    (_node, label) => `${label} 상담 전에는 건물명과 시작 시각을 한 줄씩 메모해 두세요`,
    (_node, label) => `${label} 서비스 주소가 길다면 도로명, 건물명, 동·호수로 나누어 적으세요`,
    (_node, label) => `${label} 이용을 문의할 때 서비스를 받을 정확한 주소와 희망 시간대를 분명히 알려 주세요`,
    (_node, label) => `${label} 상담에서 주소와 시각을 먼저 말하면 나머지 조건을 이어서 확인하기 쉽습니다`,
    (_node, label) => `${label} 서비스 주소가 바뀌었다면 새 도로명을 전화로 알려 주세요`,
    (_node, label) => `${label}에서 이용할 건물의 이름과 희망 시간을 통화 전에 확인하세요`,
    (_node, label) => `${label} 요청 메모에는 지번보다 현재 도로명 주소를 우선해 적어 주세요`,
    (_node, label) => `${label} 서비스 상담을 위해 도로명 주소와 원하는 시작 시간을 준비하세요`,
  ),
  "pulse-coordinate-note:p1:s0": regionalSentenceBank(
    (_node, label) => `${label} 상담 메모는 주소, 희망 시각, 코스, 이용 인원 순서로 적어 주세요`,
    (_node, label) => `${label} 문의에는 도로명과 시작 시간, 원하는 관리 방식을 포함하세요`,
    (_node, label) => `${label} 이용 요청에는 서비스를 받을 정확한 주소와 코스 이름을 서로 다른 항목으로 나누세요`,
    (_node, label) => `${label}에서 여러 명이 이용한다면 정확한 인원을 상담 중 알려 주세요`,
    (_node, label) => `${label} 예약 문의 전에는 서비스 주소와 희망 시간부터 정리해 보세요`,
    (_node, label) => `${label} 통화 전에 주소, 이용 시간, 예산을 각각 메모해 두세요`,
    (_node, label) => `${label} 서비스 요청 메모에는 도로명, 코스, 시작 시각, 인원을 빠뜨리지 마세요`,
    (_node, label) => `${label}에서 원하는 관리 방식과 이용 시간을 상담 중 알려 주세요`,
    (_node, label) => `${label} 문의 메모에는 건물명과 희망 시각을 먼저 적으세요`,
    (_node, label) => `${label} 상담에 필요한 주소와 코스, 인원 정보는 따로 적어 주세요`,
    (_node, label) => `${label} 이용 메모에는 도로명 주소와 시작 시간, 희망 코스를 남겨 주세요`,
  ),
  "tempo-time-window:p0:s0": regionalSentenceBank(
    (_node, label) => `${label} 이용 전후의 다른 약속을 고려해 코스 시간을 고르세요`,
    (_node, label) => `${label}에서 비워 둘 수 있는 시간을 계산해 60분, 90분, 120분 코스를 비교해 보세요`,
    (_node, label) => `${label} 일정에는 시작 시각과 마칠 시간을 함께 표시해 두세요`,
    (_node, label) => `${label}에서 다른 일정이 이어지는 날에는 코스 종료 시각을 기준으로 여유를 두세요`,
    (_node, label) => `${label} 코스는 하루 일정에 무리가 없는 길이로 선택하는 편이 좋습니다`,
    (_node, label) => `${label} 이용에 쓸 시간을 먼저 정하면 알맞은 코스를 찾기 쉽습니다`,
    (_node, label) => `${label} 이용 시간을 고를 때 다음 약속까지의 간격도 고려하세요`,
    (_node, label) => `${label} 서비스 시작 시각을 정하기 전 코스가 끝날 무렵의 계획도 확인하세요`,
    (_node, label) => `${label} 일정이 촘촘하다면 가능한 코스 길이를 전화로 먼저 물어보세요`,
    (_node, label) => `${label} 이용 시간에는 다른 약속이 겹치지 않도록 일정표를 비워 두세요`,
    (_node, label) => `${label} 코스별 이용 시간은 가격표에서 먼저 살펴보세요`,
  ),
  "tempo-time-window:p1:s0": regionalSentenceBank(
    (_node, label) => `${label} 희망 시각은 오전과 오후를 구분해 상담에 알려 주세요`,
    (_node, label) => `${label} 일정에는 원하는 코스와 희망 시작 시각을 함께 적어 두세요`,
    (_node, label) => `${label} 일정 후보는 가능한 시간대별로 정리해 두세요`,
    (_node, label) => `${label} 일정이 바뀌었다면 새 희망 시각을 먼저 정해 두세요`,
    (_node, label) => `${label} 일정 메모에는 코스 길이와 희망 시작 시점을 함께 적으세요`,
    (_node, label) => `${label} 당일 운영 여부는 문의한 시점의 답변을 기준으로 판단하세요`,
    (_node, label) => `${label} 예약 메모에는 코스 시간과 희망 시각을 함께 남겨 주세요`,
    (_node, label) => `${label}에서 가능한 일정이 여러 개라면 원하는 시작 시간을 먼저 말하세요`,
    (_node, label) => `${label} 서비스 일정 확정 전에는 주소와 희망 시각을 메모해 두세요`,
    (_node, label) => `${label} 이용 시각을 확정하기 전에 코스별 소요 시간을 물어보세요`,
    (_node, label) => `${label} 일정에 변동이 생기면 새 희망 시간을 메모해 두세요`,
  ),
  "score-course-ledger:p0:s0": regionalSentenceBank(
    (_node, label) => `${label} 가격표에서 코스별 관리 방식과 이용 시간을 먼저 살펴보세요`,
    (_node, label) => `${label}에서 원하는 코스를 고를 때 구성 설명과 표시 금액을 함께 확인하세요`,
    (_node, label) => `${label} 이용 목적에 맞춰 타이, 아로마, 힐링, 스페셜 항목을 비교해 보세요`,
    (_node, label) => `${label} 코스 이름이 비슷해 보여도 관리 방식의 차이를 살펴보는 편이 좋습니다`,
    (_node, label) => `${label} 상담 전에 ${COURSE_NAMES} 중 관심 있는 항목을 표시하세요`,
    (_node, label) => `${label} 가격표에서 관리 방식과 시간, 금액을 함께 확인할 수 있습니다`,
    (_node, label) => `${label}에서 이용할 코스는 이름보다 실제 구성을 기준으로 골라 주세요`,
    (_node, label) => `${label} 코스 후보가 여러 개라면 원하는 관리 방식을 먼저 정하세요`,
    (_node, label) => `${label} 코스별 이용 시간과 금액은 가격표에서 차례로 확인하세요`,
    (_node, label) => `${label} 코스 설명을 읽고 원하는 관리 방식이 포함된 항목을 찾아보세요`,
    (_node, label) => `${label} 코스를 결정하기 전 관리 내용과 소요 시간을 함께 비교하세요`,
  ),
  "score-course-ledger:p1:s0": regionalSentenceBank(
    (_node, label) => `${label} 코스 후보는 관리 방식, 이용 시간, 예산 세 가지 기준으로 좁혀 보세요`,
    (_node, label) => `${label}에서 정한 예산 안에 드는 코스를 살펴보세요`,
    (_node, label) => `${label} 상담 메모에는 원하는 관리 방식과 가능한 시간대를 따로 적어 주세요`,
    (_node, label) => `${label} 코스를 고르기 어렵다면 중요하게 보는 조건부터 정하세요`,
    (_node, label) => `${label} 이용 계획에서 시간과 예산 중 우선할 항목을 표시해 보세요`,
    (_node, label) => `${label}에서 원하는 관리 방식이 정해졌다면 코스별 이용 시간을 비교하세요`,
    (_node, label) => `${label} 코스 선택 전에는 가격표에서 예산 범위를 확인하는 편이 좋습니다`,
    (_node, label) => `${label} 상담 전에는 코스 후보별 이용 시간을 메모해 두세요`,
    (_node, label) => `${label}에서 하루 계획과 예산에 맞는 코스 시간을 골라 주세요`,
    (_node, label) => `${label} 코스는 원하는 관리 방식과 예산을 함께 고려해 정하세요`,
    (_node, label) => `${label} 코스 문의에는 원하는 관리 방식과 가능한 시간, 예산을 포함하세요`,
  ),
  "settlement-last-beat:p0:s0": regionalSentenceBank(
    (_node, label) => `${label} 이용 비용은 선입금 없이 서비스를 받은 뒤 현장에서 결제합니다`,
    (_node, label) => `${label} 결제는 예약 전에 송금하지 않는 100% 현장 후불이 원칙입니다`,
    (_node, label) => `${label}에서는 서비스를 마친 다음 현장에서 비용을 정산합니다`,
    (_node, label) => `${label} 예약 과정에서 선결제를 받지 않으므로 미리 송금할 필요가 없습니다`,
    (_node, label) => `${label} 이용을 시작하기 전 현장 후불 기준을 전화로 확인하세요`,
    (_node, label) => `${label} 비용은 상담에서 정한 내용을 기준으로 이용 후 지불합니다`,
    (_node, label) => `${label} 비용은 서비스를 마친 다음 현장에서 결제합니다`,
    (_node, label) => `${label}에서는 예약금이나 선입금 없이 후불로 이용할 수 있습니다`,
    (_node, label) => `${label}에서 안내받은 금액은 방문 서비스를 받은 뒤 정산합니다`,
    (_node, label) => `${label} 이용 전에는 결제 시점이 현장 후불인지 다시 확인하세요`,
    (_node, label) => `${label} 비용을 미리 보내지 말고 이용이 끝난 뒤 결제하세요`,
  ),
  "settlement-last-beat:p1:s0": regionalSentenceBank(
    (_node, label) => `${label}에서 카드 결제를 원하면 상담할 때 미리 알려 주세요`,
    (_node, label) => `${label} 이용 금액은 가격표와 상담 내용을 확인한 뒤 현장에서 결제하세요`,
    (_node, label) => `${label} 카드 결제를 원하면 서비스 전 전화상담에서 미리 알려 주세요`,
    (_node, label) => `${label}에서는 표시 금액을 확인한 뒤 현장에서 카드로 결제할 수 있습니다`,
    (_node, label) => `${label} 카드 사용 계획은 코스와 희망 시각을 정할 때 함께 알려 주세요`,
    (_node, label) => `${label} 이용 후 지불할 금액은 코스와 시간을 정할 때 함께 확인하세요`,
    (_node, label) => `${label} 카드 결제를 계획했다면 상담에서 미리 알려 주세요`,
    (_node, label) => `${label}의 최종 금액은 선택한 코스와 이용 시간을 기준으로 확인하세요`,
    (_node, label) => `${label}에서는 선입금 없이 현장에서 카드로 결제할 수 있습니다`,
    (_node, label) => `${label} 이용 전에 코스와 표시 금액을 확인해 현장 결제를 준비하세요`,
    (_node, label) => `${label} 현장 결제 방식은 코스와 시간을 정한 뒤 함께 확인하세요`,
  ),
  "coda-before-arrival:p0:s0": regionalSentenceBank(
    (_node, label) => `${label} 서비스 전에는 편안히 이용할 공간을 정돈해 두세요`,
    (_node, label) => `${label} 방문 전에는 공동현관 이용 방법을 메모해 두세요`,
    (_node, label) => `${label} 이용 공간과 건물 출입 방법은 방문 전에 정리해 두세요`,
    (_node, label) => `${label} 서비스 당일에는 건물 입구와 공동현관 이용 방법을 확인하세요`,
    (_node, label) => `${label} 시작 시각이 정해지면 방해받지 않을 공간을 마련해 두세요`,
    (_node, label) => `${label} 서비스 전에 이용 공간의 온도와 조명을 편안하게 맞춰 두세요`,
    (_node, label) => `${label} 공동현관 이용 방법이 따로 있다면 상담에서 미리 설명하세요`,
    (_node, label) => `${label} 서비스 전에 건물명과 출입구 정보를 다시 살펴보세요`,
    (_node, label) => `${label} 이용 공간은 움직임을 방해하지 않도록 미리 정돈해 주세요`,
    (_node, label) => `${label} 서비스 전에 엘리베이터나 출입구 제한이 있는지 확인하세요`,
    (_node, label) => `${label} 문의에서는 현재 연락받을 고객 번호를 정확히 알려 주세요`,
  ),
  "coda-before-arrival:p1:s0": regionalSentenceBank(
    (_node, label) => `${label} 서비스 직전에는 확정된 주소와 시작 시각을 다시 확인하세요`,
    (_node, label) => `${label} 서비스 전에는 요청한 주소와 시각으로 이용할 수 있는지 전화로 확인하세요`,
    (_node, label) => `${label} 마지막 메모에는 확정된 코스와 현장 결제 방식을 적어 두세요`,
    (_node, label) => `${label} 서비스 전에는 확인한 주소와 시작 시각이 맞는지 살펴보세요`,
    (_node, label) => `${label}의 서비스 주소와 시각을 확인한 뒤 일정을 확정하세요`,
    (_node, label) => `${label} 이용 당일 변동이 생기면 새 시작 시간을 전화로 조율하세요`,
    (_node, label) => `${label} 서비스 전에는 상담에서 정한 코스와 금액을 살펴보세요`,
    (_node, label) => `${label} 서비스 시작 전에는 확정된 코스와 시간을 다시 확인해 주세요`,
    (_node, label) => `${label} 당일 메모가 통화 내용과 같은지 마지막으로 대조하세요`,
    (_node, label) => `${label} 최종 메모에는 시작 시각과 현장 결제 방식을 남겨 주세요`,
    (_node, label) => `${label} 일정 변경이 없다면 확정된 시작 시각과 코스를 다시 확인하세요`,
  ),
};

function curatedRegionalSentence(
  ordinal: number,
  salt: number,
  family: CuratedRegionalSentenceFamily,
  node: RegionNode,
  label: string,
): string {
  const bank = CURATED_REGIONAL_SENTENCE_BANKS[family];
  const selection = (ordinal + salt * 13) % bank.length;
  return `${bank[selection](node, label)}.`;
}

function curatedSecondSentence(
  ordinal: number,
  salt: number,
  family: CuratedSecondSentenceFamily,
): string {
  const bank = CURATED_SECOND_SENTENCE_BANKS[family].sentences;
  const selection = (ordinal + salt * 13) % bank.length;
  return bank[selection];
}

function curatedSeoCopy(
  ordinal: number,
  salt: number,
  bank: ElevenRegionalSeoTemplates,
  label: string,
): string {
  const selection = (ordinal + salt * 13) % bank.length;
  return bank[selection](label);
}

function makeSection(
  id: string,
  heading: string,
  plans: readonly [ParagraphPlan, ParagraphPlan],
  ordinal: number,
  saltStart: number,
  node: RegionNode,
  label: string,
): ContentSection {
  return {
    id,
    heading,
    paragraphs: plans.map(([firstSentenceFamily, secondSentenceFamily], paragraphIndex) => {
      const firstSentence = curatedRegionalSentence(
        ordinal,
        saltStart + paragraphIndex * 2,
        firstSentenceFamily,
        node,
        label,
      );
      const secondSentence = curatedSecondSentence(
        ordinal,
        saltStart + paragraphIndex * 2 + 1,
        secondSentenceFamily,
      );
      return `${firstSentence} ${secondSentence}`;
    }),
  };
}

function descriptionFor(node: RegionNode, label: string, ordinal: number): string {
  return curatedRegionalSentence(ordinal, 40, "description", node, label);
}

function titleFor(keywordLabel: string): string {
  return `${keywordLabel}출장마사지 ${keywordLabel}출장안마 | 랑테라피`;
}

function h1For(label: string, ordinal: number): string {
  return curatedSeoCopy(ordinal, 39, CURATED_H1_BANK, label);
}

function hooksFor(node: RegionNode, label: string, ordinal: number): string[] {
  return [
    curatedRegionalSentence(ordinal, 41, "hook:0:0", node, label),
    curatedRegionalSentence(ordinal, 42, "hook:1:0", node, label),
  ];
}

function createRegionContentInternal(node: RegionNode): RegionContent {
  const ordinal = ordinalFor(node);
  const keywordLabel = getKeywordRegionLabel(node);
  const label = keywordLabel === node.displayName ? node.displayName : node.qualifiedName;

  const directory = makeSection(
    "frame-directory-first",
    node.kind === "representative"
      ? `${label}, 서비스 주소 확인`
      : `${label}, 먼저 지역 찾기`,
    [
      ["frame-directory-first:p0:s0", "frame-directory-first:p0:s1"],
      ["frame-directory-first:p1:s0", "frame-directory-first:p1:s1"],
    ],
    ordinal,
    0,
    node,
    label,
  );

  const coordinate = makeSection(
    "pulse-coordinate-note",
    `${label} 주소를 한 줄로 맞추기`,
    [
      ["pulse-coordinate-note:p0:s0", "pulse-coordinate-note:p0:s1"],
      ["pulse-coordinate-note:p1:s0", "pulse-coordinate-note:p1:s1"],
    ],
    ordinal,
    4,
    node,
    label,
  );

  const tempo = makeSection(
    "tempo-time-window",
    `${label} 일정에 맞는 시간 고르기`,
    [
      ["tempo-time-window:p0:s0", "tempo-time-window:p0:s1"],
      ["tempo-time-window:p1:s0", "tempo-time-window:p1:s1"],
    ],
    ordinal,
    8,
    node,
    label,
  );

  const score = makeSection(
    "score-course-ledger",
    `${label} 코스와 가격표 읽기`,
    [
      ["score-course-ledger:p0:s0", "score-course-ledger:p0:s1"],
      ["score-course-ledger:p1:s0", "score-course-ledger:p1:s1"],
    ],
    ordinal,
    12,
    node,
    label,
  );

  const settlement = makeSection(
    "settlement-last-beat",
    `${label} 결제 기준 확인하기`,
    [
      ["settlement-last-beat:p0:s0", "settlement-last-beat:p0:s1"],
      ["settlement-last-beat:p1:s0", "settlement-last-beat:p1:s1"],
    ],
    ordinal,
    16,
    node,
    label,
  );

  const arrival = makeSection(
    "coda-before-arrival",
    `${label} 서비스 전 마지막 확인`,
    [
      ["coda-before-arrival:p0:s0", "coda-before-arrival:p0:s1"],
      ["coda-before-arrival:p1:s0", "coda-before-arrival:p1:s1"],
    ],
    ordinal,
    20,
    node,
    label,
  );

  const sectionMap: Record<string, ContentSection> = {
    coordinate,
    tempo,
    score,
    settlement,
    arrival,
  };
  const order = SECTION_ORDERS[
    (ordinal + node.segments.length + ROOT_KEYS.indexOf(node.rootKey)) %
      SECTION_ORDERS.length
  ];

  return {
    title: titleFor(keywordLabel),
    description: descriptionFor(node, label, ordinal),
    keywords: KEYWORD_FAMILIES.map((family) => `${keywordLabel}${family}`),
    h1: h1For(label, ordinal),
    eyebrow: "RANG THERAPY · PRIVATE VISIT",
    hooks: hooksFor(node, label, ordinal),
    sections: [directory, ...order.map((id) => sectionMap[id])],
    ctaLabels: [
      "전화상담",
      "가격표 보기",
      node.kind === "representative" ? "상위 지역 다시 보기" : "다음 지역 찾기",
    ],
  };
}

export function createRegionContent(node: RegionNode): RegionContent {
  return createRegionContentInternal(node);
}
