import type { Metadata } from "next";
import Link from "next/link";
import { PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { SERVICE_FAQS, SERVICE_STEPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/guide/",
  "랑테라피 이용 안내 | 주소·시간·코스 확인",
  "랑테라피 이용 전 서비스 주소와 희망 시각, 코스·이용 시간, 현장 후불과 카드 결제를 확인하는 순서를 안내합니다.",
  ["랑테라피 이용 안내", "출장마사지 이용 방법", "출장마사지 현장 후불", "24시간 전화상담"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function GuidePage() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">HOW TO USE</p>
        <h1>주소부터 결제까지<br />이용 순서 안내</h1>
        <p>통화 전에 필요한 정보만 차례대로 준비하면, 서비스 가능 여부와 코스 선택을 더 빠르게 확인할 수 있습니다.</p>
      </header>

      <section className="content-section" aria-labelledby="guide-process-title">
        <div className="section-heading"><div><span className="section-label">STEP BY STEP</span><h2 id="guide-process-title">이용 절차</h2></div><Link href="/pricing/">가격 안내</Link></div>
        <div className="process-card guide-process-card">
          <ol>{SERVICE_STEPS.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="content-section faq-section" aria-labelledby="guide-faq-title">
        <div className="section-heading"><div><span className="section-label">FAQ</span><h2 id="guide-faq-title">자주 묻는 질문</h2></div></div>
        <div className="faq-list">
          {SERVICE_FAQS.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>{question}</span><b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="partner-section">
        <div className="partner-banner">
          <span>24H CONSULTATION</span>
          <h2>서비스 주소와 시간을<br />준비했다면 상담으로 확인하세요.</h2>
          <p>지역 안내, 코스와 이용 시간, 현장 결제 기준을 통화에서 차례로 확인합니다.</p>
          <a href={PHONE_HREF}>전화상담</a>
        </div>
      </section>
    </main>
  );
}
