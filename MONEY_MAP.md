# 돈벌이 지도

역할 나누기: **사장님 = 계정·결제·업로드 같은 "사람이 해야 하는 일"**, **Claude = 만들기·글·이미지·점검·조사**.
(2026-10-23 조사 기준. 매주 월요일 아침 Claude가 다시 조사해서 이 문서와 오더를 갱신합니다.)

## 오더 보드 (사장님이 할 일, 위에서부터)

| # | 오더 | 어디서 | 걸리는 시간 | 상태 |
| --- | --- | --- | --- | --- |
| 1 | 크몽 전문가 가입 → 서비스 2개 등록 (글·가격·이미지는 [등록 키트](https://claude.ai/artifact/ELdwUs9NBjm6avgxU8icCD)에서 복사) | kmong.com | 1~2시간 | ⬜ |
| 2 | GitHub Pages 켜기: 저장소 Settings → Pages → Source를 **GitHub Actions**로 → Actions 탭에서 실패한 배포 "Re-run" | github.com | 5분 | ⬜ |
| 3 | 앱인토스 콘솔 가입 (만 19세 이상, 본인 토스 로그인) → 워크스페이스 만들기 (제작자 이름 10자 이내, 예: 노바게임즈) → 앱 등록: 이름 **노바 스웜**, appName **nova-swarm**, 유형 **게임** | [apps-in-toss.toss.im](https://apps-in-toss.toss.im/) | 30분 + 승인 1일 안팎 | ⬜ |
| 4 | Microsoft Store 개발자(개인) 가입 — 게임 등급을 무료로 받는 길 (2번이 끝나야 진행) | Partner Center | 30분 | ⬜ (2번 뒤 안내) |
| 5 | 사업자 등록 (개인, 홈택스, 무료) — **지금 말고** 토스 광고 수익이 5,000원 가까이 쌓이면. 직장인이면 회사 겸업 규정 먼저 확인 | 홈택스 | 하루 | ⏸ 나중 |

다 하신 오더는 대화창에 "1번 했어요"처럼 알려 주세요. 막히면 화면을 캡처해서 보내 주세요.

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
2. Microsoft Store 등록 꾸러미 (설치형 웹앱 점검, 스토어 글·이미지, 등급 설문 답) — 오더 2번이 끝나면 바로
3. 2027 가계부·플래너 (11월 초까지) → 판매처 오더
4. 퍼즐 게임 2개(BLOCKS·MERGE) 개선 → 토스 빌드
5. 쇼피파이 샘플 몰 → 크몽 세 번째 서비스

## 출처

- 앱인토스: [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace.md) · [게임 출시 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-game.md) · [게임 등급분류 방법](https://toss.im/apps-in-toss/blog/game_rating_classification) · [1인 출시 후기(브런치)](https://brunch.co.kr/@yohanux/11) · [시작하기](https://toss.im/apps-in-toss/blog/apps-in-toss-getting-started) · [사업자 등록 유예 안내](https://toss.im/apps-in-toss/blog/business-registration-deferral-guide) · [게임 SDK 가이드](https://toss.im/apps-in-toss/blog/apps-in-toss-game-sdk-guide) · [2026-09-23 업데이트](https://toss.im/apps-in-toss/blog/update-26-09-23)
- 크몽: [전문가 센터 안내](https://kmong.com/support/expert-center/posts/777)
- 게임 포털 SDK: [CrazyGames](https://docs.crazygames.com/sdk/html5-v3/) · [Poki](https://developers.poki.com/guide/sdk-html5)
- 쇼피파이: [파트너 수익 구조](https://help.shopify.com/en/partners/how-to-earn) · [앱 수익 배분](https://shopify.dev/changelog/update-to-shopifys-app-developer-revenue-share) · [파트너 디렉터리 조건](https://help.shopify.com/en/partners/directory/join) · [Acquire 쇼피파이 앱 매물](https://acquire.com/shopify-apps-for-sale/)
- Etsy 정산: [Etsy Payments](https://www.etsy.com/legal/etsy-payments/)
- 유튜브 AI 영상 수익 정책: [TechCrunch 2026-07-20](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/)
- Adobe Stock AI 콘텐츠: [제출 가이드](https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html)
- 구글 대량 생산 콘텐츠: [PPC Land 정리](https://ppc.land/scaled-content-abuse/)
- 카카오 이모티콘 AI 제한: [디지털데일리 2023-09](https://m.ddaily.co.kr/page/view/2023091115530442026)
