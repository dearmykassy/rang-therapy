import { COURSE_SCORES, formatWon } from "@/lib/business";

export const SERVICE_STEPS = [
  ["01", "전화상담", "서비스를 받을 지역과 희망 날짜·시각, 이용 인원을 알려주세요."],
  ["02", "코스·시간 선택", "가격표에서 원하는 코스와 이용 시간을 선택합니다."],
  ["03", "내용 확인", "가능 여부와 선택 코스, 이용 시간을 전화로 확인합니다."],
  ["04", "현장 결제", "이용이 끝난 뒤 현장에서 현금 또는 카드로 결제합니다."],
] as const;

export const SERVICE_FAQS = [
  ["선입금이 있나요?", "사전 예약금 없이 이용이 끝난 뒤 현장에서 결제합니다."],
  ["서비스 가능 지역은 어떻게 확인하나요?", "서비스를 받을 정확한 주소와 희망 시각을 전화상담으로 알려주시면 확인할 수 있습니다."],
  ["전화상담에서는 무엇을 알려야 하나요?", "서비스 주소, 희망 시각, 코스와 이용 시간, 이용 인원을 알려주세요."],
  ["현장에서 카드로 결제할 수 있나요?", "현장에서 무선 카드 단말기로 결제하실 수 있습니다."],
  ["커플이나 부부도 함께 이용할 수 있나요?", "네, 2인 동시 관리 프로그램을 운영합니다."],
  ["새벽 시간에도 상담할 수 있나요?", "네, 365일 24시간 전화상담을 운영합니다."],
  ["위생 관리는 어떻게 하나요?", "사용 품목은 일회용을 우선하며, 관리 전후 정해진 기준에 따라 소독합니다."],
] as const;

export const NOTICE_ITEMS = [
  {
    slug: "phone-consultation",
    title: "24시간 전화상담 이용 안내",
    summary: "랑테라피는 0508-202-3906으로 365일 24시간 전화상담을 운영합니다.",
  },
  {
    slug: "consultation-details",
    title: "주소·시간·코스 확인 안내",
    summary: "정확한 서비스 주소와 희망 날짜·시각, 코스와 이용 시간, 인원을 전화로 알려주세요.",
  },
  {
    slug: "onsite-payment",
    title: "선입금 없는 현장 후불 안내",
    summary: "사전 예약금 없이 이용이 끝난 뒤 현장에서 결제합니다.",
  },
  {
    slug: "card-payment",
    title: "현장 카드 결제 안내",
    summary: "무선 단말기를 이용한 현장 카드 결제가 가능합니다.",
  },
] as const;

export const COURSE_GROUPS = [...new Set(COURSE_SCORES.map((item) => item.course))].map(
  (course) => ({
    course,
    options: COURSE_SCORES.filter((item) => item.course === course).map((item) => ({
      minutes: item.minutes,
      price: formatWon(item.price),
    })),
  }),
);
