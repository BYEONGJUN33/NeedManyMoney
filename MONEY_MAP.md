# 돈벌이 지도

역할 나누기: **사장님 = 계정·결제·업로드 같은 "사람이 해야 하는 일"**, **Claude = 만들기·글·이미지·점검·조사**.
(2026-10-24 조사 기준. 매주 월요일 아침 Claude가 다시 조사해서 이 문서와 오더를 갱신합니다.)

## 오더 보드 (사장님이 할 일, 순서대로)

### 1단계: 계정 만들기 (오늘·내일)

| # | 오더 | 하는 법 | 시간 | 끝나면 |
| --- | --- | --- | --- | --- |
| 1 | **크몽 등록** | kmong.com → 전문가 등록(본인 인증, 정산 계좌) → 서비스 등록 2개. 글·가격·이미지는 [등록 키트](https://claude.ai/artifact/ELdwUs9NBjm6avgxU8icCD)에서 복사 | 1~2시간 | "1번 했어요" |
| 2 | **GitHub Pages 켜기** | 저장소 Settings → Pages → Source를 **GitHub Actions** → Actions 탭 → 실패한 배포 → **Re-run all jobs** | 5분 | "2번 했어요" (사이트 주소 확인해 드림) |
| 3 | **앱인토스 콘솔 가입** | [apps-in-toss.toss.im](https://apps-in-toss.toss.im/) → 토스 비즈니스 회원 가입(만 19세 이상, 본인 명의 토스 로그인) → 워크스페이스 만들기 (제작자 이름 10자 이내, 예: 노바랩) | 30분 | "3번 했어요" |
| 4 | **토스 앱에서 경쟁 앱 확인** | 휴대폰 토스 앱 검색창에 **운세 / 실수령 / 계산기** 검색 → 화면 캡처 3장 보내기 | 5분 | 캡처 전송 |

### 2단계: 토스 앱 3개 올리기

| # | 오더 | 하는 법 | 시간 | 끝나면 |
| --- | --- | --- | --- | --- |
| 5 | **앱 3개 등록** | 콘솔 '앱' → **+등록하기** 3번: ① 연봉 실수령액 계산기 / `salary-calc` / 비게임 ② 오늘의 띠별 운세 / `daily-fortune` / 비게임 ③ 노바 스웜 / `nova-swarm` / 게임. appName은 바꿀 수 없으니 그대로 입력 | 15분 | "5번 했어요" |
| 6 | **앱 정보 채우기** | 앱마다 부제·상세 설명·카테고리·키워드·로고·고객문의 이메일 입력 ([toss-apps/README.md](toss-apps/README.md), [game/toss/README.md](game/toss/README.md)에서 복사). 로고 파일은 대화창으로 받은 것 | 앱당 15분 | "6번 했어요" |
| 7 | **광고 그룹 4개 만들기** | 콘솔 '인앱 광고' → 정산 정보(본인 통장, 예금주명 통장과 똑같이) → 광고 그룹 생성: `실수령_하단배너`(배너), `운세_하단배너`(배너), `운세_상세보기_리워드`(보상형), `스웜_부활_리워드`(보상형). 사업자 정보를 요구하면 **사업자 등록 유예**를 고르기 | 20분 | **광고 그룹 ID 4개를 대화창에 보내기** |
| 8 | **번들 올리고 QR 테스트** | Claude가 실제 광고 ID로 다시 만든 `.ait`를 앱 출시 → 앱 번들에 업로드 → **토스앱 테스트** QR을 휴대폰으로 찍어 직접 써 보기 | 앱당 10분 | 이상한 점 캡처해서 보내기 |
| 9 | **검토 요청 (비게임 2개)** | QR 테스트가 괜찮으면 '검토 요청하기'. 검토는 영업일 3~7일. 반려되면 사유를 그대로 보내 주기 | 5분 | 결과 알려 주기 |
| 10 | **출시 버튼** | 승인 메일이 오면 버전 내역의 **출시하기** | 1분 | "출시했어요" |

### 3단계: 게임 등급과 해외 포털 (2번이 끝난 뒤)

| # | 오더 | 하는 법 | 시간 |
| --- | --- | --- | --- |
| 11 | **Microsoft Store 개인 개발자 가입** | Partner Center 가입 → Claude가 만든 등록 꾸러미대로 업로드 → 등급 설문 → 받은 등급 정보를 토스 콘솔 게임 등급(5-3)에 입력 → 노바 스웜 검토 요청 | 1시간 |
| 12 | **게임 포털 등록** | CrazyGames → Poki → GameDistribution 순서. 소개문은 [LAUNCH.md](LAUNCH.md), zip 파일은 그때 대화창으로 보내 드림 | 포털당 30분 |

### 나중에 (Claude가 알려 드릴 때)

| # | 오더 | 언제 |
| --- | --- | --- |
| 13 | 사업자 등록 (개인, 홈택스, 무료, 하루) | 토스 광고 예상수익이 5,000원 가까이 되면, 또는 푸시 알림·토스 포인트 프로모션을 쓰고 싶을 때. 직장인이면 회사 겸업 규정 먼저 확인 |
| 14 | 애드센스 신청 | 사이트 방문자가 생기면 |
| 15 | Payoneer·Etsy 가입 | 2027 플래너가 완성되면 |

### 선택: 콘솔을 Claude에게 맡기기 (앱이 많아지면 추천)

토스가 공식 **콘솔 MCP**(AI 연결)를 제공합니다. 연결하면 앱 등록·번들 업로드·광고 그룹·검토 요청을 Claude가 직접 할 수 있어 2단계 오더가 대부분 사라집니다.
- [claude.ai/customize/connectors](https://claude.ai/customize/connectors) → 커스텀 커넥터 추가 → 주소 `https://mcp.toss.im/adapters/apps-in-toss-console/mcp` (OAuth 클라이언트 ID를 묻으면 `mcp-gateway`) → 토스로 로그인
- 커넥터는 **새 세션을 시작할 때** 붙습니다. 연결한 뒤 새 세션에서 "MONEY_MAP.md 보고 이어서 해 줘"라고 하면 됩니다.
- 이 방법이 claude.ai에서 그대로 되는지는 아직 확인 못 했습니다. 안 되면 2단계를 직접 하시면 됩니다.

### 지켜야 할 것
- 광고를 일부러 누르거나 지인에게 눌러 달라고 하지 않기 (부정 클릭 → 수익 회수·영구 정지)
- 지인에게 앱을 **써 보라고** 공유하는 건 좋지만, 별점·후기를 부탁해서 쓰게 하지 않기
- 개발·테스트 중에는 테스트 광고 ID만 쓰기 (Claude가 관리)

다 하신 오더는 "5번 했어요"처럼 번호로 알려 주세요. 막히면 화면을 캡처해서 보내 주세요.

## 새 꿀통: 토스 미니앱 공장 (2026-10-24)

AI로 작은 생활 앱을 빠르게 찍어 내서 토스 앱 안에 여러 개 올리는 방법입니다. **제가 가장 적극적으로 만들 수 있는 돈벌이**라 1순위로 올립니다.

- 토스 공식 블로그 사례: 비개발자 한 명이 AI 도구로 **7주 동안 앱 21개**를 출시했습니다. 출시하자마자 사람이 들어왔고(예전 웹서비스는 100명 모으기도 힘들었다고 함), 날씨 앱은 푸시 알림 클릭률이 20%를 넘었습니다. 첫 수익은 700원으로 시작해 이후 크게 늘었다고 했지만 금액은 공개하지 않았습니다.
- 토스 집계: 파트너 1만 곳 중 67%가 1인 메이커이고 63%가 실제 매출을 냈습니다 (보도 기준).
- **비게임 앱은 게임 등급분류가 필요 없습니다.** 하단 배너 광고(토스앱 5.241 이상)와 보상형 광고를 붙일 수 있습니다.
- 10월 22일부터 노출 등급이 생겼습니다. 출시된 앱은 검색·공유로, '추천 미니앱'은 더 자주, '부스팅 미니앱'(재방문율 상위)은 토스 홈에 노출되며 베타 기간 노출이 약 20배였습니다. 그래서 **매일 다시 열 이유가 있는 앱**(운세, 습관 체크, 날씨형)이 유리합니다.
- 출시 불가: 대출·보험·카드·증권 같은 금융상품, 투자 조언, 의료, 정치, 사행성, 부동산·자동차 서비스(한시적). 그래서 머니셈의 대출 계산기는 넣지 않았습니다.
- 성장 도구인 푸시(스마트 발송)와 토스 포인트 프로모션은 **사업자 등록 뒤에** 쓸 수 있습니다. 앱이 여러 개가 되면 광고 수익 5,000원도 금방 넘으니 사업자 등록 시점이 앞당겨질 수 있습니다.
- 지금 만든 것: [toss-apps/](toss-apps/README.md) 공용 키트 + ① 연봉 실수령액 계산기 ② 오늘의 띠별 운세 (둘 다 `.ait` 빌드·브라우저 점검 완료). 다음 앱은 일주일에 2~3개씩 추가합니다.

## 그 밖에 이번에 찾은 것

| 무엇 | AI가 만드는 부분 | 자본 | 판단 |
| --- | --- | --- | --- |
| **크몽 세 번째 서비스: 스마트스토어 상세페이지 제작** | 문구·구성·디자인 (크몽 상세 이미지를 만든 렌더링 도구 재사용) | 0원 | 수요 많음. 샘플 2~3개 만들어 등록 — 크몽 첫 리뷰 나온 뒤 추가 |
| **LINE 스티커** | 캐릭터·표정 이미지 | 0원 | AI 제작 허용(구매 화면에 AI 표시), 판매가의 약 35%. 경쟁이 매우 많아 기대치 낮음 |
| **Etsy 디지털 파일** (플래너·가계부) | 파일 디자인 | 등록비 개당 0.2달러 | 한국은 Payoneer 계정으로 판매 가능. 수수료 약 6.5% + 결제 수수료 |
| **마플샵** (굿즈 POD·디지털 상품) | 디자인 | 0원 | 제작·배송·재고를 마플샵이 맡음, 심사 2~5영업일. AI 이미지 정책은 확인 안 됨 — 신청 전에 문의 |
| Gumroad | 디지털 파일 | 0원 | 판매 수수료 10%+0.5달러. 한국 정산 방식은 공식 확인 필요 |

## A. 지금 바로 (준비 끝났거나 곧 끝남)

| # | 무엇 | 돈 받는 방식 | 자본 | 사장님 할 일 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 1 | **크몽** 홈페이지·엑셀 자동화 수주 | 건당 5만~49만 원 | 0원 | 전문가 가입·서비스 2개 등록 ([freelance/kmong](freelance/kmong/README.md)) | ✅ 등록 자료 완성 |
| 2 | **앱인토스(토스 미니앱) 게임** | 게임 안 보상형 광고 | 0원 | 콘솔 가입·앱 등록, 등급(Microsoft Store), 수익 5,000원 전에 사업자 등록 | ✅ 토스 빌드(`nova-swarm.ait`) 완료 ([game/toss](game/toss/README.md)). 등급·콘솔 등록 남음 |
| 3 | **해외 게임 포털** (CrazyGames·Poki·GameDistribution) | 광고 수익 배분 | 0원 | 포털 가입·zip 업로드 ([LAUNCH.md](LAUNCH.md)) | ✅ 게임 3개 준비 |
| 4 | **자체 사이트** (게임 모음 + 머니셈 계산기) + 애드센스 | 광고 | 0원 | GitHub Pages 켜기, 애드센스 신청 | ✅ 준비 (Pages 켜기만 남음) |

**앱인토스를 A로 둔 이유**: 토스 사용자에게 노출되고, 사업자 등록 없이 광고를 붙여 시작할 수 있으며(누적 예상수익 5,000원까지 유예, 그 뒤 5영업일 안에 등록), 리더보드·공유 같은 퍼뜨리기 기능을 토스가 제공합니다.

**알고 시작할 것 (2026-10-23 조사)**
- 게임은 **등급분류 증빙이 필수**입니다. 오픈마켓(구글·애플·원스토어·Microsoft Store) 출시 링크나 게임물관리위원회 증명서가 필요합니다. 구글은 25달러, 애플은 연 99달러지만 원스토어·Microsoft Store는 개발자 등록비가 없어서 Microsoft Store(웹게임을 앱으로 포장해 올릴 수 있음)로 갑니다.
- 콘솔 검토는 영업일 3~7일, 게임 출시 체크리스트(사운드 백그라운드 처리, 닫기 버튼 가림 등)를 어기면 반려됩니다. 토스 빌드는 체크리스트 항목을 모두 맞춰 두었습니다.
- 혼자 토스에 게임을 낸 디자이너 후기: 승인은 빨랐지만 **광고 수익은 "아주 작다"**고 했습니다. 노출을 키우려면 리더보드·공유·업데이트로 사람을 모아야 합니다. 토스 포인트 프로모션은 사업자 등록 후에 쓸 수 있습니다.

## B. 다음 차례

| # | 무엇 | 돈 받는 방식 | 자본 | 사장님 할 일 | 메모 |
| --- | --- | --- | --- | --- | --- |
| 5 | **2027 가계부·플래너** 디지털 파일 | 파일 판매 (해외 Etsy, 국내 마켓) | 0원 | 판매처 가입 (Etsy는 Payoneer 계좌 필요) | 12~1월이 성수기. 11월 초까지 올려야 의미 있음 |
| 6 | **쇼피파이 몰 구축** (크몽 세 번째 서비스) | 건당 제작비 + 쇼피파이가 매달 요금의 20% | 0원 | 쇼피파이 파트너 가입, 연습용 개발 스토어 생성 | 샘플 몰부터 필요 |
| 7 | **쇼피파이 앱** (키워서 매각) | 월 구독 → 매출이 생기면 Acquire·Flippa 매각 | 거의 0원 | 파트너 가입, 앱 등록 | 수개월 걸림. 매각은 매출이 있어야 가능 |

## C. 가능은 하지만 기대치 낮음

| 무엇 | 왜 낮게 보나 |
| --- | --- |
| 유튜브 쇼츠 수익 | 2026년 7월부터 AI로 찍어 낸 반복·템플릿형 영상은 수익 창출에서 빠짐. 게임 홍보용으로만 쓰기 |
| 쿠팡 파트너스 블로그 | 수수료 약 3%, 방문자가 많아야 하고 "대가성 문구" 필수. AI 글 대량 발행은 구글 저품질 처리 위험 |
| 스톡 이미지(Adobe Stock) | AI 이미지 등록은 되지만(체크 표시 필수) 장당 수익이 작아 수천 장이 필요 |

## 하지 않기

- **카카오 이모티콘을 AI로**: 카카오는 2023년부터 AI 생성 이모티콘 입점을 제한해 왔음 (현재 기준은 스튜디오 공지 확인 필요)
- **AI 글 대량 블로그 + 애드센스**: 구글 "대량 생산 콘텐츠" 정책 위반 시 검색·광고 둘 다 막힘
- **드롭쉬핑·구매대행**: 광고비·재고 자금이 먼저 나감
- **리딩방·코인·해외선물·"부업 강의"**: 대부분 파는 사람이 버는 구조

## Claude가 할 일 (순서)

1. ✅ NOVA SWARM 탄막 강화 → ✅ 토스 빌드
2. ✅ 토스 미니앱 공장 키트 + 앱 2개 (연봉 실수령액, 띠별 운세)
3. 토스 미니앱 계속 추가 (습관 체크, 오늘의 영어 한 문장, 알바 월급 계산기, D-day…) — 주 2~3개
4. Microsoft Store 등록 꾸러미 (게임 등급용) — 오더 2번이 끝나면 바로
5. 2027 가계부·플래너 (11월 초까지) → 판매처 오더
6. 퍼즐 게임 2개(BLOCKS·MERGE) 개선 → 토스 빌드
7. 크몽 세 번째 서비스(상세페이지) 샘플 → 쇼피파이 샘플 몰

## 출처

- 앱인토스: [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace.md) · [게임 출시 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-game.md) · [게임 등급분류 방법](https://toss.im/apps-in-toss/blog/game_rating_classification) · [1인 출시 후기(브런치)](https://brunch.co.kr/@yohanux/11) · [시작하기](https://toss.im/apps-in-toss/blog/apps-in-toss-getting-started) · [사업자 등록 유예 안내](https://toss.im/apps-in-toss/blog/business-registration-deferral-guide) · [게임 SDK 가이드](https://toss.im/apps-in-toss/blog/apps-in-toss-game-sdk-guide) · [2026-09-23 업데이트](https://toss.im/apps-in-toss/blog/update-26-09-23)
- 토스 미니앱 공장: [비개발자 21개 앱 출시 후기](https://toss.im/apps-in-toss/blog/robin-26-3-13) · [노출 기준 변경(10/22)](https://toss.im/apps-in-toss/blog/update-26-09-23) · [비게임 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-nongame.md) · [서비스 오픈 정책(출시 불가 항목)](https://developers-apps-in-toss.toss.im/intro/guide.md) · [배너 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/web-banner.md) · [앱인토스 입점 현황 기사](https://view.asiae.co.kr/article/2026070909515242129)
- 기타: [LINE AI 스티커 정리(Shareuhack)](https://www.shareuhack.com/en/posts/ai-line-sticker-passive-income) · [Etsy 판매 가능 국가](https://help.etsy.com/hc/articles/115015710408) · [Etsy Payoneer 안내](https://help.etsy.com/hc/articles/16999319005207) · [마플샵 크리에이터 신청](https://docs.channel.io/marppleshop_help/ko/articles/%EB%A7%88%ED%94%8C%EC%83%B5-%ED%81%AC%EB%A6%AC%EC%97%90%EC%9D%B4%ED%84%B0-%EC%8B%A0%EC%B2%AD-%EA%B0%80%EC%9D%B4%EB%93%9C-eef73d00) · [Gumroad 정산](https://gumroad.com/help/article/13-getting-paid) · [크몽 상세페이지 카테고리](https://kmong.com/category/113)
- 크몽: [전문가 센터 안내](https://kmong.com/support/expert-center/posts/777)
- 게임 포털 SDK: [CrazyGames](https://docs.crazygames.com/sdk/html5-v3/) · [Poki](https://developers.poki.com/guide/sdk-html5)
- 쇼피파이: [파트너 수익 구조](https://help.shopify.com/en/partners/how-to-earn) · [앱 수익 배분](https://shopify.dev/changelog/update-to-shopifys-app-developer-revenue-share) · [파트너 디렉터리 조건](https://help.shopify.com/en/partners/directory/join) · [Acquire 쇼피파이 앱 매물](https://acquire.com/shopify-apps-for-sale/)
- Etsy 정산: [Etsy Payments](https://www.etsy.com/legal/etsy-payments/)
- 유튜브 AI 영상 수익 정책: [TechCrunch 2026-07-20](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/)
- Adobe Stock AI 콘텐츠: [제출 가이드](https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html)
- 구글 대량 생산 콘텐츠: [PPC Land 정리](https://ppc.land/scaled-content-abuse/)
- 카카오 이모티콘 AI 제한: [디지털데일리 2023-09](https://m.ddaily.co.kr/page/view/2023091115530442026)
