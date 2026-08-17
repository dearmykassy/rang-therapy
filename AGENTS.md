# 랑테라피 작업 규칙

- 새 활동을 시작하기 전 이 파일과 `DIARY.md`를 끝까지 읽고, 작업 결과와 검증값을 `DIARY.md` 맨 위에 최신순으로 기록한다.
- 시각·레이아웃 정본은 `/Users/ssm/Documents/Services/Templetes/Template2`다. 기존 랑테라피에서는 1,291개 지역 그래프와 경로별 상세 본문만 보존하고, 과거 갤러리·악보 UI와 `/cadence`, `/score`, `/atelier`, `/journal` IA는 재사용하지 않는다.
- 마사지봄에서는 사장님이 확정한 전화·가격·현장 후불·카드 결제·24시간 상담·이용 절차·Q&A 운영 사실을 공유할 수 있다. 다른 플랫폼의 브랜드명·이미지·지역별 메타 문장·지역별 소개 문장을 그대로 복사하지 않는다.
- 브랜드는 `랑테라피`, 플랫폼 ID는 `rang-therapy`로 고정한다.
- 2026-08-16 오너 승인으로 실제 도메인은 `https://langtheraphy.kr`이다. canonical·Open Graph·JSON-LD·sitemap은 이 origin만 사용하고 `index,follow` 및 robots 허용 상태를 유지한다.
- 홈과 지역 이미지는 승인된 전용 원본·파생·배정 영수증에 결속되어 runtime에 활성화되어 있다. 향후 교체 원본도 전용 refiner와 사람 QA, source/refine/public 영수증을 거쳐야 한다.
- 이미지가 준비되기 전 placeholder를 실제 이미지처럼 주장하거나 `public/`에 원본을 직접 넣지 않는다.
- 지역 페이지와 sitemap은 같은 `ACTIVE_REGION_NODES`를 사용한다. 1,291개가 아니면 테스트와 빌드를 실패시킨다.
- 현재 플랫폼과 이후 새 플랫폼은 sitemap과 함께 `/rss.xml` RSS 2.0 feed를 제공한다. RSS에는 실제 발행·수정일이 있는 indexable canonical 문서만 넣고, same-origin 절대 URL·영구 GUID·`ko-KR`·XML escaping을 유지하며 빌드 시각을 새 콘텐츠 시각처럼 만들지 않는다.
- 일상 개발 검증은 지역 수·메타 중복·핵심 운영 사실·대표 렌더를 빠르게 확인하는 경량 절차로 유지한다. 과거 대규모 감사 영수증은 역사 기록이며 새 Template2 빌드 권한으로 재사용하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
