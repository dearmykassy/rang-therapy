# GA4 계측 계약

## 활성화

배포 빌드 환경에 사이트 전용 GA4 웹 스트림의 측정 ID를 설정합니다.

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

값이 없거나 `G-` 형식이 아니면 GA 스크립트와 이벤트를 모두 렌더하지 않습니다. 정적 사이트이므로 이 값은 런타임이 아니라 **빌드 시점**에 필요합니다. 사이트마다 별도 GA4 속성 또는 웹 스트림을 사용합니다.

## 이벤트

| 이벤트 | 발생 조건 | 전송 속성 |
| --- | --- | --- |
| `page_view` | 최초 화면 및 App Router 경로 변경 | `platform_id`, query 없는 `page_path`, `page_type`, 개인정보 형태를 제거하고 100자로 제한한 `page_title`, query 없는 `page_location` |
| `phone_cta_clicked` | 문서 안의 모든 `tel:` 링크 클릭 | `platform_id`, `page_path`, `page_type`, `cta_location`, `transport_type=beacon` |

`cta_location`은 링크의 `data-analytics-location` 또는 `data-cta-location`을 우선하고, 없으면 보이는 문구나 접근성 라벨을 사용합니다. 전화번호와 이메일 형태의 값은 제거하며 `tel:` 주소 자체는 전송하지 않습니다. 더 안정적인 위치 구분이 필요하면 링크에 `data-analytics-location="home_hero"`처럼 고정 값을 지정합니다.

GA4 관리 화면에는 이벤트 범위 맞춤 측정기준 `platform_id`, `page_type`, `cta_location`을 등록해야 보고서와 Data API에서 바로 사용할 수 있습니다. Google·Naver 유입, 국가/지역, 기기 분류는 GA4의 기본 획득·기술 차원을 사용합니다. 수동 `page_view`와 중복되지 않도록 향상된 측정의 브라우저 기록 기반 페이지 변경 수집은 끕니다.

## 전화 전환의 한계

`phone_cta_clicked`는 전화 앱을 열려는 클릭만 뜻하며 통화 연결이나 유효 상담을 뜻하지 않습니다. 브라우저와 GA4는 네이티브 전화 앱의 발신·연결·통화 시간을 확인할 수 없으므로 이 이벤트를 `phone_call_completed`로 바꾸거나 화면 숨김 상태로 통화를 추정하지 않습니다.

실제 유효 콜은 플랫폼별 추적 번호를 제공하는 콜트래킹/통신사 서비스에서 연결 또는 최소 통화시간을 확인한 뒤, 전화번호 없이 내부 call ID와 플랫폼 ID만 서버 측 webhook 또는 GA4 Measurement Protocol로 보내는 별도 `phone_call_connected` 이벤트가 필요합니다.

## 확인 순서

1. 테스트 측정 ID로 빌드한 뒤 GA4 DebugView에서 최초 화면의 `page_view`를 확인합니다.
2. 내부 링크로 이동해 경로당 `page_view`가 한 번만 추가되는지 확인합니다.
3. 서로 다른 위치의 전화 링크를 눌러 `phone_cta_clicked`와 `cta_location`을 확인합니다.
4. DebugView 속성에 전화번호, 이메일, URL query가 없는지 확인합니다.
