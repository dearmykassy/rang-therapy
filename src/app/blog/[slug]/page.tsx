import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, createBlogMetadata, findBlogPost, getBlogPostPath } from "@/data/blog-posts";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";
import { PHONE_HREF } from "@/lib/business";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = findBlogPost(slug);
  return post ? createBlogMetadata(post) : {};
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) notFound();

  const related = findBlogPost(post.relatedSlug);
  const schema = JSON.stringify(createBlogPostingJsonLd(post)).replace(/</gu, "\\u003c");

  return (
    <main>
      <header className="page-intro article-intro">
        <nav className="article-breadcrumb" aria-label="현재 위치"><Link href="/">홈</Link><i aria-hidden="true">›</i><Link href="/blog/">블로그</Link></nav>
        <p className="eyebrow">{post.category.toUpperCase()}</p>
        <h1>{post.title}</h1>
        <p>{post.description}</p>
      </header>

      <article className="article-body">
        <p>{post.intro}</p>
        {post.sections.map((section) => (
          <section className="article-section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <aside className="article-checklist" aria-labelledby="blog-checklist-title">
          <h2 id="blog-checklist-title">통화 전 체크</h2>
          <ul>{post.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
        </aside>

        <nav className="article-links" aria-label="관련 안내">
          {related && <Link href={getBlogPostPath(related)}>관련 글: {related.title}</Link>}
          <Link href="/pricing/">코스별 시간과 가격 보기</Link>
          <Link href="/guide/">출장마사지 이용 순서 보기</Link>
          <Link href="/areas/">서비스 지역 안내 보기</Link>
          <a href={PHONE_HREF}>전화상담</a>
        </nav>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
    </main>
  );
}
