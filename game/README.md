# NOVA SWARM

브라우저에서 바로 하는 네온 서바이벌 + 탄막 액션 게임입니다. 몰려오는 적을 자동 공격 무기로 10분 동안 버티고, 레벨업마다 능력을 고르며, 5분·10분에 나오는 탄막 보스를 피해 쓰러뜨립니다. 판이 끝나면 골드로 영구 강화를 삽니다. PC(키보드)와 모바일(드래그 조이스틱) 모두 지원하고 8개 언어가 자동으로 바뀝니다.

- 무기 8종 + 진화 5종, 패시브 10종, 적 7종 + 엘리트 + 보스 2종
- 탄막: 보스는 체력 단계마다 패턴이 바뀝니다 (워든 3단계, 오버마인드 4단계 — 링·나선·부채꼴·휘는 꽃잎·가속 링·탄 벽). 단계가 바뀌면 화면의 탄이 경험치로 바뀝니다
- 스침과 노바 버스트: 탄이 판정(흰 점) 바로 바깥을 지나가면 게이지가 차고, 가득 차면 Space·✦ 버튼으로 화면의 탄을 지우고 주변 적을 쓸어 냅니다
- 영구 강화 11종, 영웅 4명 (각자 시작 무기와 능력치가 다름)
- 이미지·음원 파일 없이 코드로 그리고 합성해서 전체 용량이 약 170KB
- 서버 없음. 진행 상황은 브라우저에 저장

## 돈을 버는 구조

| 수익원 | 위치 | 설명 |
| --- | --- | --- |
| 보상형 광고 | 사망 시 "광고 보고 부활", 레벨업 "다시 뽑기", 결과 "골드 2배" | 플레이어가 원해서 보는 광고라 단가가 가장 높습니다 |
| 판 사이 광고 | 두 번째 판부터 시작 직전 | 포털이 빈도를 조절합니다 |
| 포털 수익 배분 | CrazyGames, Poki, GameDistribution | 포털 트래픽에 붙는 광고 수익을 나눠 받습니다 |
| 자체 사이트 | GitHub Pages(또는 도메인) | Google H5 게임 광고(AdSense 계정 필요) |

영구 강화를 전부 사려면 수십 판이 필요해서, 다시 찾아와 "골드 2배" 광고를 볼 이유가 생깁니다.

## 포털에 올리기

```bash
cd game
npm test          # 로직·밸런스·번역 테스트
node build.mjs    # dist/nova-swarm-crazygames.zip, -poki.zip, -gd.zip 생성
node tools/art.mjs  # 표지·스크린샷·아이콘 다시 만들기 (assets/store/)
```

| 포털 | 하는 일 | 올릴 파일 |
| --- | --- | --- |
| **CrazyGames** | developer.crazygames.com 가입 → 새 게임 제출 → HTML5 업로드 | `dist/nova-swarm-crazygames.zip`, `assets/store/cover-1920x1080.png`, `cover-800x1200.png`, `cover-800x800.png` |
| **Poki** | developers.poki.com 에서 게임 제출 (심사 후 계약) | `dist/nova-swarm-poki.zip`, 표지 이미지 |
| **GameDistribution** | gamedistribution.com/developers 가입 → 게임 등록 → 게임 ID 발급 | `GD_GAME_ID=<발급 ID> node build.mjs` 후 `dist/nova-swarm-gd.zip` |
| **itch.io** | 새 프로젝트 → Kind: HTML → zip 업로드 → "This file will be played in the browser" | `dist/web` 폴더를 zip으로 (후원·유료 판매 가능) |

- zip은 포털 SDK가 켜진 상태로 만들어집니다. 포털 테스트 도구(CrazyGames는 주소에 `?crazygames_sandbox=1`)로 광고 흐름을 확인하세요.
- 한 포털과 독점 계약(예: Poki)을 맺으면 다른 포털에는 올리지 않습니다. 계약 조건을 먼저 확인하세요.

## 자체 사이트 광고

저장소 **Settings → Secrets and variables → Actions → Variables**에 `ADSENSE_CLIENT`(예: `ca-pub-…`)를 넣으면 배포 빌드가 Google H5 게임 광고(Ad Placement API)를 켭니다. AdSense 계정에서 H5 게임 광고 사용 승인이 필요하고, 자체 도메인이 있어야 승인받기 쉽습니다.

## 개발

```bash
npx serve .            # 또는 아무 정적 서버. http://localhost:3000/?portal=fake 로 열면 가짜 광고(2초)로 광고 흐름 확인
node sim/run.mjs 8 none   # 영구 강화 없이 8판 자동 플레이 → 평균 생존 시간·레벨·처치 수
node sim/run.mjs 8 max    # 영구 강화 최대
```

| 파일 | 역할 |
| --- | --- |
| `src/data.js` | **모든 밸런스 수치** (무기·적·출현·경험치·상점 가격) |
| `src/game.js` | 게임 규칙 (DOM 없음, Node에서 시뮬레이션 가능) |
| `src/patterns.js` | 적 탄막 패턴 (링·나선·부채꼴·꽃잎·가속 링·탄 벽)과 탄 이동. 보스 단계별 공격 목록은 `data.js`의 `BOSS_PHASES` |
| `src/upgrades.js`, `src/profile.js` | 레벨업 선택지·진화·능력치, 저장·구매 |
| `src/render.js` | 캔버스 렌더러 (빛번짐 스프라이트 캐시, 파티클) |
| `src/ui.js`, `src/main.js` | 화면과 앱 흐름 |
| `src/ads.js` | 포털·광고 어댑터 (`?portal=` 또는 빌드가 넣는 `window.NOVA_PORTAL`) |
| `src/bot.js`, `sim/` | 자동 플레이 봇과 밸런스 시뮬레이터 (타이틀 화면 배경 데모에도 사용) |

폰트: Chakra Petch (SIL Open Font License 1.1).
