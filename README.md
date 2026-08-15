# 랑테라피

`rang-therapy`는 검증된 1,291개 운영 지역과 전화·가격·결제 사실을 Template2 화면에 담은 독립 정적 플랫폼입니다. 지역, 가격, 이용 안내, 공지사항과 블로그를 한 흐름으로 연결합니다.

## 현재 공개 상태

- 콘텐츠 코퍼스: `COMPLETE`, 지역 문서 1,291개.
- 이미지: 홈 지역 카드 사진은 출처 영수증에 결속되어 있습니다. 지역 배너 release receipt와 assignment manifest도 exact SHA로 결속되어 130개 asset·1,291개 route·390개 public WebP가 runtime에 활성화되어 있습니다.
- 검색 공개: 승인된 실제 도메인 `https://langtheraphy.kr`의 canonical·Open Graph·JSON-LD·sitemap을 사용하며 `index,follow`와 robots 전체 허용을 활성화했습니다.
- 정적 URL: 지역 1,291개 + 고정 6개 + 블로그 글 2개 = sitemap 1,299개.

## 검증

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## GA4 환경 변수

Netlify의 `Site configuration → Environment variables`에 사이트 전용 GA4 웹 스트림 값을 빌드 환경 변수로 등록합니다.

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

값이 없거나 잘못된 형식이면 계측 코드는 출력되지 않습니다. 이벤트와 개인정보 제외 규칙은 `docs/ANALYTICS.md`를 따릅니다.

`artifacts/content-corpus.json`은 고객 화면에 영향을 주는 앱·컴포넌트·지역·콘텐츠 소스 manifest SHA와 함께 결정적으로 재생성됩니다. `artifacts:generate`는 `RANG_IMAGE_RELEASE_RECEIPT`를 승인된 canonical receipt에 고정하고 receipt schema/status, assignment manifest SHA, route/asset/reuse/public WebP 수와 실제 파일 존재를 exact 검증합니다. 승인된 실제 도메인과 이미지 통합이 모두 결속된 현재 release는 `deploymentAllowed: true`, `deploymentBlockers: []`입니다. 브라우저 QA 결과와 320/390/1440 증거는 `qa/browser/report.json`에 고정했습니다.

공유 배포 전에는 `/Users/ssm/Documents/Codex/platform-governance/bin/audit-platforms --scope content`가 모든 등록 플랫폼을 대상으로 0건 위반을 반환해야 합니다. 검색 공개 상태를 변경할 때는 다음 계약을 함께 검증합니다.

- 실제 도메인 및 법적/브랜드 문구 승인 유지
- 승인된 실제 도메인의 canonical·robots·sitemap·index/follow exact 일치
- 공유 거버넌스 `--scope full` 통과
