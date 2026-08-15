import type { Metadata } from "next";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/metadata";

export type BlogPost = {
  slug: "masaji-shop-gagi-himdeul-ttae" | "jibeseo-masaji-badeul-su-issnayo";
  category: string;
  title: string;
  description: string;
  publishedAt: string;
  modifiedAt: string;
  intro: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
  checklist: readonly string[];
  relatedSlug: BlogPost["slug"];
};

export const BLOG_POSTS = [
  {
    slug: "masaji-shop-gagi-himdeul-ttae",
    category: "이용 전 체크",
    title: "마사지샵까지 가기 버거운 날 확인할 네 가지",
    description:
      "외출이 부담스러운 날 출장마사지를 알아볼 때 서비스 주소, 희망 시각, 코스와 현장 결제를 확인하는 순서를 정리했습니다.",
    publishedAt: "2026-08-15T00:00:00+09:00",
    modifiedAt: "2026-08-15T00:00:00+09:00",
    intro:
      "일정을 마치고 나면 마사지가 필요해도 외출 준비를 다시 하는 일이 부담스러울 수 있습니다. 이럴 때는 무작정 신청하기보다 서비스를 받을 주소에서 이용 가능한지, 어느 시간과 코스가 맞는지부터 차례로 확인하는 편이 좋습니다. 랑테라피는 전화상담에서 전달받은 서비스 주소와 희망 시각을 기준으로 이용 정보를 확인합니다.",
    sections: [
      {
        heading: "외출 대신 주소부터 정리하기",
        paragraphs: [
          "매장을 이용하는 방식은 준비 시간까지 일정에 포함해야 합니다. 출장마사지는 상담에서 확인한 장소를 기준으로 이용하므로, 외출이 어려운 날에는 서비스를 받을 정확한 주소를 먼저 준비해 주세요.",
          "같은 지역이라도 요청 시각과 주소에 따라 가능 여부가 달라질 수 있습니다. 이용 가능성을 미리 단정하지 말고 도로명, 건물명과 희망 시간대를 전화로 확인하는 것이 정확합니다.",
        ],
      },
      {
        heading: "희망 시각에는 조정 범위도 더하기",
        paragraphs: [
          "원하는 시각 하나만 정하기보다 가장 선호하는 시간과 조정 가능한 범위를 나눠 메모해 보세요. 이용 인원도 함께 정리하면 상담 중 빠뜨릴 내용이 줄어듭니다.",
          "24시간 전화상담을 운영하지만 실제 가능한 일정은 통화에서 확인해야 합니다. 다른 일정이 이어진다면 선택한 코스의 이용 시간까지 함께 살펴보세요.",
        ],
      },
      {
        heading: "가격표에서 코스 후보 줄이기",
        paragraphs: [
          "타이마사지, 아로마마사지, 힐링마사지, 스페셜마사지와 남성전용 코스의 시간별 금액을 가격 안내에서 확인할 수 있습니다. 원하는 방식과 이용 시간을 먼저 비교해 두면 상담이 간결해집니다.",
          "코스를 하나로 정하기 어렵다면 이용 가능한 시간과 예산을 기준으로 두 가지 후보를 준비하세요. 세부 방식과 가능한 일정은 전화상담에서 다시 확인합니다.",
        ],
      },
      {
        heading: "결제는 이용 뒤 현장에서",
        paragraphs: [
          "랑테라피는 사전 예약금 없이 이용이 끝난 뒤 현장에서 결제합니다. 현장 카드 결제도 가능하므로 필요한 결제 방식을 상담할 때 함께 확인해 주세요.",
          "주소, 시간, 코스, 결제 순서로 확인하면 외출이 부담스러운 날에도 필요한 정보만 빠르게 정리할 수 있습니다.",
        ],
      },
    ],
    checklist: ["서비스를 받을 정확한 주소", "희망 시각과 조정 범위", "코스·이용 시간", "현장 결제 방식"],
    relatedSlug: "jibeseo-masaji-badeul-su-issnayo",
  },
  {
    slug: "jibeseo-masaji-badeul-su-issnayo",
    category: "집·숙소 안내",
    title: "집이나 숙소에서 출장마사지 받을 때 준비할 내용",
    description:
      "집이나 숙소에서 출장마사지를 알아볼 때 정확한 주소와 이용 공간, 희망 코스·시간 및 현장 결제를 확인하는 방법입니다.",
    publishedAt: "2026-08-15T00:00:00+09:00",
    modifiedAt: "2026-08-15T00:00:00+09:00",
    intro:
      "집이나 숙소에서 마사지를 알아본다면 장소의 종류보다 정확한 서비스 주소를 먼저 확인해야 합니다. 자택, 호텔, 숙소처럼 서비스를 받을 장소가 달라도 이용 가능 여부와 일정은 전화상담에서 확인합니다. 통화 전에 필요한 정보를 짧게 메모하면 주소와 코스를 반복해서 설명할 일을 줄일 수 있습니다.",
    sections: [
      {
        heading: "장소 이름보다 정확한 주소가 먼저",
        paragraphs: [
          "집에서 이용할 때는 도로명과 건물명, 필요한 상세 주소를 준비하세요. 숙소라면 예약한 숙소의 정확한 이름과 주소가 같은지 다시 확인하는 편이 좋습니다.",
          "주변 지명만 전달하면 서비스 장소를 정확히 구분하기 어렵습니다. 서비스를 받을 정확한 주소를 기준으로 해당 지역의 가능 여부를 전화로 확인해 주세요.",
        ],
      },
      {
        heading: "출입에 필요한 내용은 따로 메모하기",
        paragraphs: [
          "공동현관이나 출입구처럼 이용 전에 전달해야 할 내용이 있다면 주소와 분리해 적어 두세요. 필요한 범위만 통화에서 설명하면 됩니다.",
          "이용 시간을 확보할 수 있는지, 주변을 간단히 정리할 수 있는지처럼 이용자가 직접 확인할 수 있는 범위만 살펴보세요. 복잡한 준비를 미리 약속할 필요는 없습니다.",
        ],
      },
      {
        heading: "코스와 이용 시간을 함께 고르기",
        paragraphs: [
          "가격 안내에는 타이, 아로마, 힐링, 스페셜마사지와 남성전용 코스가 시간별로 정리되어 있습니다. 원하는 코스와 60분·90분·120분 중 필요한 시간을 먼저 비교해 보세요.",
          "남성전용 코스는 60분과 90분으로 운영합니다. 선택한 코스의 실제 가능 여부와 시작 시각은 서비스 주소와 함께 전화상담에서 확인합니다.",
        ],
      },
      {
        heading: "후불과 카드 결제 확인하기",
        paragraphs: [
          "비용은 선입금 없이 이용이 끝난 뒤 현장에서 결제합니다. 무선 단말기를 이용한 현장 카드 결제도 가능합니다.",
          "랑테라피는 365일 24시간 전화상담을 운영합니다. 집이나 숙소에서 이용을 생각할 때 지역 안내와 가격표를 먼저 본 뒤 필요한 내용을 문의해 주세요.",
        ],
      },
    ],
    checklist: ["도로명·건물명과 상세 주소", "필요한 출입 정보", "희망 코스와 이용 시간", "고객 전화번호"],
    relatedSlug: "masaji-shop-gagi-himdeul-ttae",
  },
] as const satisfies readonly BlogPost[];

export function findBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((candidate) => candidate.slug === slug);
}

export function getBlogPost(slug: BlogPost["slug"]): BlogPost {
  const post = findBlogPost(slug);
  if (!post) throw new Error(`RANG_BLOG_POST_NOT_FOUND:${slug}`);
  return post;
}

export function getBlogPostPath(post: Pick<BlogPost, "slug">): string {
  return `/blog/${post.slug}/`;
}

export function createBlogMetadata(post: BlogPost): Metadata {
  const path = getBlogPostPath(post);
  const url = new URL(path, SITE_ORIGIN).href;
  return {
    title: { absolute: `${post.title} | ${SITE_NAME}` },
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
    },
    twitter: {
      card: "summary",
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
    },
    robots: { index: true, follow: true },
  };
}
