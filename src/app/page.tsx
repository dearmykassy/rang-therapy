import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { PHONE_HREF, OPERATING_NOTES } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_ROOT_KEYS, getRootNode, ROOT_LABELS } from "@/lib/regions";
import { COURSE_GROUPS, NOTICE_ITEMS, SERVICE_FAQS, SERVICE_STEPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/",
  "랑테라피 | 전국 출장 마사지 지역·가격 안내",
  "전국 출장 마사지 운영 지역, 코스별 시간과 가격, 24시간 전화상담과 현장 후불 기준을 확인하는 랑테라피입니다.",
  ["랑테라피", "전국 출장 마사지", "\uCD9C\uC7A5\uC548\uB9C8", "출장타이마사지", "출장스웨디시", "출장홈타이"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

const categories = [
  ["/areas/", "⌖", "지역 안내"],
  ["/pricing/", "₩", "가격 안내"],
  ["/guide/", "◫", "이용 안내"],
  ["/notice/", "▤", "공지사항"],
  ["/blog/", "✎", "블로그"],
  [PHONE_HREF, "☎", "전화상담"],
  ["#faq", "?", "자주 묻는 질문"],
  ["#process", "✓", "이용 절차"],
] as const;

export default function Home() {
  const roots = ACTIVE_ROOT_KEYS.map((key) => {
    const node = getRootNode(key);
    return { key, name: ROOT_LABELS[key].short, path: node.path + "/", count: node.records.length };
  });

  return (
    <main data-home-hero="rang-home-hero-dongtan-knit-openai-v1" data-image-state="home-region-cards-v1">
      <section className="home-intro">
        <Image
          alt=""
          aria-hidden="true"
          className="home-intro-image"
          fill
          priority
          sizes="100vw"
          src="/images/rang-home-hero/v1/rang-home-hero-dongtan-knit-openai-v1.webp"
        />
        <p className="eyebrow">RANG THERAPY · 24H CONSULTATION</p>
        <h1>전국 출장 마사지,<br />지역부터 가격까지 한눈에</h1>
        <p>서비스 주소와 희망 시각을 준비하고, 원하는 코스와 현장 결제 기준을 차례로 확인하세요.</p>
        <div className="hero-actions">
          <Link href="/areas/">우리 지역 찾기</Link>
          <a href={PHONE_HREF}>전화상담</a>
        </div>
      </section>

      <section className="category-section" aria-label="주요 메뉴">
        <div className="category-grid">
          {categories.map(([href, icon, label]) => (
            <Link href={href} key={label}>
              <span className="category-icon" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <nav className="quick-actions" aria-label="운영 기준">
        {OPERATING_NOTES.map((note, index) => <span key={note}><b aria-hidden="true">{["○", "◇", "□"][index]}</b>{note}</span>)}
      </nav>

      <section className="content-section price-preview">
        <div className="section-heading">
          <div><span className="section-label">COURSE &amp; PRICE</span><h2>코스별 시간과 금액</h2></div>
          <Link href="/pricing/">가격표 보기</Link>
        </div>
        <div className="course-track">
          {COURSE_GROUPS.map((group, index) => (
            <article className="course-card" key={group.course}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{group.course}</h3>
              <ul>{group.options.map((option) => <li key={option.minutes}><b>{option.minutes}분</b><strong>{option.price}</strong></li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section notice-section">
        <div className="section-heading">
          <div><span className="section-label">NOTICE</span><h2>공지사항</h2></div>
          <Link href="/notice/">전체 보기</Link>
        </div>
        <div className="notice-list">
          {NOTICE_ITEMS.map((notice, index) => (
            <Link href={"/notice/#" + notice.slug} key={notice.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{notice.title}</h3><p>{notice.summary}</p></div>
              <b aria-hidden="true">›</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-section editorial-section">
        <div className="section-heading">
          <div><span className="section-label">RANG BLOG</span><h2>이용 전 읽어보기</h2></div>
          <Link href="/blog/">전체 보기</Link>
        </div>
        <div className="editorial-grid">
          {BLOG_POSTS.map((post, index) => (
            <article className="editorial-card" key={post.slug}>
              <div className={"editorial-visual tone-" + (index + 2)} aria-hidden="true">RANG NOTE {String(index + 1).padStart(2, "0")}</div>
              <div className="editorial-copy"><span>{post.category}</span><h3><Link href={getBlogPostPath(post)}>{post.title}</Link></h3><p>{post.description}</p><Link href={getBlogPostPath(post)}>읽기 →</Link></div>
            </article>
          ))}
        </div>
      </section>

      <section className="partner-section" id="process">
        <div className="partner-banner">
          <span>RANG THERAPY</span>
          <h2>주소와 시간을 준비했다면<br />전화로 가능 여부를 확인하세요.</h2>
          <p>24시간 전화상담 · 선입금 없는 현장 후불 · 현장 카드 결제</p>
          <a href={PHONE_HREF}>전화상담</a>
        </div>
        <div className="process-card">
          <h2>이용 절차</h2>
          <ol>{SERVICE_STEPS.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="content-section faq-section" id="faq">
        <div className="section-heading"><div><span className="section-label">FAQ</span><h2>자주 묻는 질문</h2></div></div>
        <div className="faq-list">
          {SERVICE_FAQS.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>{question}</span><b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="content-section area-section">
        <div className="section-heading">
          <div><span className="section-label">SERVICE AREA</span><h2>전국 출장 마사지 지역 안내</h2></div>
          <Link href="/areas/">전체 보기</Link>
        </div>
        <div className="area-card-grid">
          {roots.map((root, index) => (
            <Link className="area-card" href={root.path} key={root.path}>
              <span className="area-visual" aria-hidden="true">
                <Image
                  alt=""
                  className="area-visual-image"
                  fill
                  sizes="(max-width: 767px) 50vw, 33vw"
                  src={`/images/rang-home-regions/v1/${root.key}.webp`}
                />
                <span className="area-visual-index">{String(index + 1).padStart(2, "0")}</span>
              </span>
              <div><h3>{root.name} 출장 마사지</h3><p>{root.count}개 연결 지역</p><strong>지역 안내 →</strong></div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
