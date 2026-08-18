import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { NOTICE_ITEMS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/notice/",
  "랑테라피 공지사항 | 전화상담·결제 안내",
  "랑테라피의 24시간 전화상담, 서비스 주소·시간·코스 확인, 선입금 없는 현장 후불과 카드 결제 기준을 안내합니다.",
  ["랑테라피 공지사항", "출장마사지 전화상담", "현장 후불", "현장 카드 결제"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function NoticePage() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">NOTICE</p>
        <h1>이용 전 확인할<br />운영 안내</h1>
        <p>상담과 결제에 관한 기본 기준을 먼저 확인하고, 실제 가능 여부는 서비스 주소와 희망 시각을 기준으로 전화상담에서 확인해 주세요.</p>
      </header>

      <section className="content-section" aria-labelledby="notice-list-title">
        <div className="section-heading"><div><span className="section-label">RANG NOTICE</span><h2 id="notice-list-title">공지사항</h2></div><Link href="/guide/">이용 안내</Link></div>
        <div className="notice-list notice-page-list">
          {NOTICE_ITEMS.map((notice, index) => (
            <article className="notice-card" id={notice.slug} key={notice.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{notice.title}</h3><p>{notice.summary}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section compact-note" aria-label="상담 바로가기">
        <span className="section-label">CONSULTATION</span>
        <h2>확인할 내용을 정리했다면 전화상담으로 이어가세요.</h2>
        <p>서비스 주소, 희망 시각, 코스와 이용 시간, 이용 인원을 알려주시면 필요한 내용을 확인할 수 있습니다.</p>
        <div className="inline-actions"><Link href="/pricing/">가격 안내</Link><a href={PHONE_HREF}>전화상담</a></div>
      </section>
    </main>
  );
}
