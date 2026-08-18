# 랑테라피

[랑테라피 공식 사이트](https://langtheraphy.kr/)

랑테라피는 운영 지역, 코스별 가격, 이용 절차와 공지·블로그 문서를 제공하는 정적 웹사이트입니다. 확인된 전화 상담·가격·현장 결제 정보만 고객 화면에 사용하며, 지역별 안내는 1,291개 활성 지역 그래프를 기준으로 제공합니다.

## 공식 문서 바로가기

- [운영 지역](https://langtheraphy.kr/areas/)
- [코스 및 가격](https://langtheraphy.kr/pricing/)
- [이용 안내](https://langtheraphy.kr/guide/)
- [공지사항](https://langtheraphy.kr/notice/)
- [블로그](https://langtheraphy.kr/blog/)
- [XML Sitemap](https://langtheraphy.kr/sitemap.xml)
- [RSS 2.0](https://langtheraphy.kr/rss.xml)

## 공개 사이트 구조

- 홈과 지역·가격·이용 안내·공지·블로그를 같은 HTTPS 운영 origin의 canonical URL로 연결합니다.
- sitemap은 지역 페이지 1,291개, 고정 페이지 6개, 블로그 글 2개를 합친 1,299개 URL과 경로별 실제 변경 시점의 `lastmod`를 제공합니다. 블로그는 글 데이터의 `modifiedAt`, 고정·지역 페이지는 확인된 변경 영수증 시각을 사용하며 빌드 시각으로 날짜를 갱신하지 않습니다.
- 지역 페이지와 sitemap은 같은 활성 지역 그래프를 사용합니다. 상위 지역에서 실제 직계 하위 지역으로 이동할 수 있고, 각 페이지에는 가격·이용 안내 등 관련 내부 링크가 있습니다.
- 지역별 title, description과 H1은 각 경로의 지역명과 안내 내용을 구분해 작성합니다. 다른 플랫폼의 소개 문장이나 지역 메타 문장을 복제하지 않습니다.
- `robots.txt`는 공개 수집을 허용하고 운영 sitemap 위치를 안내합니다. RSS에는 실제 발행·수정일이 있는 공개 블로그 글 2개의 본문과 영구 GUID만 수록합니다.

## 이미지와 콘텐츠 무결성

- 홈 지역 카드 이미지는 출처 기록에, 지역 배너는 승인된 release receipt와 경로별 assignment manifest에 결속됩니다.
- 지역 배너는 원본 asset 130개에서 만든 반응형 WebP 390개를 1,291개 지역 경로에 배정하며, 파일과 배정 수를 빌드 감사에서 확인합니다.
- 운영 사실, 고객 역할, 전화 CTA, 메타데이터와 고객 노출 문구는 콘텐츠 코퍼스와 정적 출력 사이의 불일치를 검사합니다.

## 개발 및 검증

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`artifacts/content-corpus.json`은 고객 화면에 영향을 주는 앱·컴포넌트·지역·콘텐츠 소스 manifest와 함께 결정적으로 재생성됩니다. 이미지 release receipt의 schema와 상태, assignment manifest, route·asset·파생 파일 수 및 실제 파일 존재도 함께 검증합니다. 현재 운영 release는 승인된 origin과 이미지 결속을 만족해 `deploymentAllowed: true`, `deploymentBlockers: []` 상태입니다.

배포 전에는 canonical·Open Graph·JSON-LD·robots·sitemap의 origin 일치, 지역 1,291개와 sitemap 1,299개, 플랫폼 간 고객 문구 중복 감사, 320/390/1440px 대표 화면 검증을 다시 확인합니다.

## GA4 환경 변수

Netlify의 사이트 환경 변수에 해당 사이트 전용 GA4 웹 스트림 측정 ID를 등록합니다.

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

값이 없거나 `G-` 형식이 아니면 계측 코드는 출력되지 않습니다. 페이지 조회와 전화 CTA 클릭 이벤트, 개인정보 제외 규칙은 `docs/ANALYTICS.md`를 따릅니다. 전화 CTA 클릭은 통화 연결 완료가 아니라 클릭 의도만 뜻합니다.
