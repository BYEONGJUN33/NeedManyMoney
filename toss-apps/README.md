# 토스 미니앱 공장 (앱인토스 비게임)

작은 생활 앱을 빠르게 만들어 토스 앱 안에 올리고, 광고(하단 배너·보상형)로 수익을 내는 폴더입니다.
비게임 앱은 게임 등급분류가 필요 없어서 콘솔 등록 → 검토(영업일 3~7일) → 출시로 바로 갑니다.

```bash
cd toss-apps
npm install
npm test                    # 앱 로직 테스트
node build.mjs all          # 모든 앱 → out/<appName>.ait (테스트 광고 ID)
node build.mjs salary       # 한 앱만
AD_BANNER_SALARY=<ID> AD_REWARDED_SALARY=<ID> node build.mjs salary   # 출시용 광고 ID
NODE_PATH=$(npm root -g) node tools/logos.mjs    # 앱 로고 PNG (store/<id>/logo-600.png)
```

- 개발·테스트 중에는 반드시 테스트 광고 ID를 씁니다 (운영 ID로 테스트하면 제재).
- 콘솔 업로드는 `out/*.ait` 파일을 앱 출시 메뉴에 올리면 됩니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `kit/bridge.js` | 앱인토스 SDK를 감싼 `window.AIT` (토스 밖에서는 안전하게 실패) |
| `kit/kit.js` | 저장(사용자 식별키별·0.5초 묶음), 하단 배너, 보상형 광고(미리 로딩·재시도 3번), 토스 공유 링크, 토스트 |
| `kit/kit.css` | 라이트 모드 공용 스타일. 앱 색은 `app.json`의 `color` 하나로 바꿈 |
| `apps/<id>/` | `index.html`(본문), `app.js`, `app.css`, `app.json`(appName·제목·색), `apps-in-toss.config.mjs`, `logo.svg` |
| `build.mjs` | 앱 하나를 `dist/`로 묶고 `ait build`로 `.ait` 생성 |

새 앱 만들기: `apps/salary`를 복사 → `app.json`·`apps-in-toss.config.mjs`의 appName 바꾸기 → `index.html`·`app.js` 작성.

## 비게임 출시 체크리스트 대응 (공용 키트)

| 항목 | 처리 |
| --- | --- |
| 사용자 식별키 발급·저장, 다시 열어도 기록 유지 | `User.getAnonymousKey` → 저장 키에 사용 |
| 브릿지 과호출 금지, 실패 시 재시도 제한 | 저장 0.5초 묶음, 광고 로드 재시도 3번(5·10·20초) |
| 라이트 모드, 핀치 줌 막기 | `color-scheme: light`, viewport `user-scalable=no` |
| 배너는 위·아래에만, 너비 100%·높이 96px | 하단 고정 슬롯, 광고 없으면 자리 접기 |
| 전면 광고를 예고 없이 띄우지 않기 | 전면 광고 없음. 보상형은 버튼에 "광고 보고"를 적고 사용자가 누를 때만 |
| 미리 로딩된 광고만 재생, 보상 지급 | `loaded` 뒤에만 버튼 활성, `userEarnedReward`일 때만 보상 |
| 외부 이동·자사 앱 유도 없음, 공유는 `intoss://` | 공유는 `Share.createLink('intoss://<appName>')` |
| 뒤로가기 | 한 화면 앱이라 토스 기본 동작(첫 화면에서 뒤로가기 = 종료) 그대로 |

## 앱 목록

### 1. 연봉 실수령액 계산기 (`apps/salary`, appName `salary-calc`)

머니셈의 검증된 2026년 계산(간이세액표·4대보험, 테스트 64개 통과)을 그대로 씁니다. 대출·보험 같은 금융상품 기능은 없습니다 (토스 출시 불가 항목).

| 콘솔 칸 | 값 |
| --- | --- |
| 앱 이름 | 연봉 실수령액 계산기 |
| 영문 이름 | Take Home Pay |
| appName | `salary-calc` |
| 앱 유형 | 비게임 |
| 부제 | 2026년 기준 월급 실수령액과 공제 내역 |
| 카테고리 | 생활 > 계산기 (없으면 가장 가까운 생활·유틸리티) |
| 검색 키워드 | 연봉, 실수령액, 월급, 세후, 4대보험, 연봉계산기, 월급계산기 |
| 앱 로고 | `store/salary/logo-600.png` |

상세 설명:

```
연봉이나 월급을 입력하면 국민연금·건강보험·장기요양·고용보험과 근로소득세·지방소득세를 빼고 한 달에 실제로 받는 돈을 바로 보여줘요.
3,000만·4,000만·5,000만 원처럼 자주 찾는 금액은 한 번 눌러서 계산할 수 있어요.
식대 같은 비과세 금액, 부양가족 수, 8~20세 자녀 수, 퇴직금 포함 여부를 바꾸면 결과가 바로 바뀌어요.
연봉이 100만·300만·500만·1,000만 원 오르면 한 달 실수령액이 얼마나 늘어나는지도 함께 보여줘요.
계산 결과는 공유하기 버튼으로 친구에게 보낼 수 있고, 다음에 열면 마지막으로 입력한 값이 그대로 남아 있어요.
```

### 2. 오늘의 띠별 운세 (`apps/fortune`, appName `daily-fortune`)

날짜와 띠로 문장 묶음에서 그날의 운세를 고릅니다 (서버·유료 API 없음). 매일 바뀌어서 다시 찾아올 이유가 있습니다. 투자·도박·의료 조언은 넣지 않았고 테스트가 금지어를 검사합니다.

| 콘솔 칸 | 값 |
| --- | --- |
| 앱 이름 | 오늘의 띠별 운세 |
| 영문 이름 | Daily Zodiac |
| appName | `daily-fortune` |
| 앱 유형 | 비게임 |
| 부제 | 매일 바뀌는 띠별 운세와 행운의 색 |
| 카테고리 | 라이프스타일 > 운세 (없으면 엔터테인먼트) |
| 검색 키워드 | 운세, 오늘의운세, 띠별운세, 무료운세, 행운의색, 띠 |
| 앱 로고 | `store/fortune/logo-600.png` |

상세 설명:

```
처음 열면 내 띠를 고르거나 태어난 해를 입력해요. 다음부터는 내 띠의 오늘 운세가 바로 보여요.
오늘의 운세 지수(점수)와 한 줄 운세, 오늘의 키워드를 알려줘요.
행운의 색·숫자·방향·아이템과 오늘의 한마디도 함께 보여줘요.
광고를 보면 금전운, 연애·관계운, 일·공부운, 건강 습관까지 자세한 운세를 볼 수 있어요.
운세는 매일 0시에 바뀌고, 다른 띠를 골라 가족이나 친구의 운세도 볼 수 있어요.
내 운세는 공유하기 버튼으로 친구에게 보낼 수 있어요.
```

## 다음 앱 후보 (매일 다시 열 이유가 있는 것 위주)

- 물 마시기·걷기 같은 습관 체크 (매일 기록 → 재방문)
- 오늘의 영어 한 문장 / 상식 한 줄 (매일 바뀌는 콘텐츠)
- 만 나이·D-day·기념일 계산기
- 시급·주휴수당·알바 월급 계산기 (머니셈 계산 재사용)
- 성향 테스트 (소비 성향·여행 스타일 등, 점수·순위가 없는 테스트. 게임처럼 보이면 게임 카테고리로 분류될 수 있음)

## 출처

[비게임 출시 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-nongame.md) · [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide.md) · [배너 광고(WebView)](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/web-banner.md) · [전면형/보상형 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad.md) · [사용자 식별키](https://developers-apps-in-toss.toss.im/documentation/common/authentication/hash-key.md) · [핀치 줌 막기](https://developers-apps-in-toss.toss.im/documentation/integration/props.md) · [비개발자 21개 앱 출시 후기](https://toss.im/apps-in-toss/blog/robin-26-3-13) · [노출 기준 변경(10/22)](https://toss.im/apps-in-toss/blog/update-26-09-23)
