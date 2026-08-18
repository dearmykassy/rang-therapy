import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";

export const metadataContract = createRouteMetadataContract(
  "/blog/",
  "랑테라피 블로그 | 출장마사지 이용 전 체크",
  "외출이 부담스러운 날과 집·숙소에서 출장마사지를 알아볼 때 서비스 주소, 희망 시각, 코스, 현장 결제를 정리하는 랑테라피 블로그입니다.",
  ["랑테라피 블로그", "출장마사지 이용 전 체크", "출장마사지 준비", "출장마사지 안내"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function BlogIndexPage() {
  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">RANG BLOG</p>
        <h1>이용 전에 읽는<br />짧은 안내</h1>
        <p>서비스 주소와 시간, 코스와 결제를 정리할 때 도움이 되는 기본 내용을 담았습니다.</p>
      </header>

      <section className="content-section" aria-labelledby="blog-list-title">
        <div className="section-heading"><div><span className="section-label">USEFUL NOTES</span><h2 id="blog-list-title">최신 글</h2></div><Link href="/guide/">이용 안내</Link></div>
        <div className="blog-board">
          {BLOG_POSTS.map((post, index) => (
            <article className="blog-row" key={post.slug}>
              <span>NOTE {String(index + 1).padStart(2, "0")} · {post.category}</span>
              <h2><Link href={getBlogPostPath(post)}>{post.title}</Link></h2>
              <p>{post.description}</p>
              <div className="blog-row-bottom"><time dateTime={post.modifiedAt}>2026.08.15</time><Link href={getBlogPostPath(post)}>글 읽기 →</Link></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
