# NOVA SWARM — 토스 미니앱(앱인토스) 버전

토스 앱 안에서 돌아가는 NOVA SWARM입니다. 게임 코드는 `game/src`를 그대로 쓰고, 이 폴더는 토스 SDK 연결과 `.ait` 번들 만들기만 합니다.

```bash
cd game/toss
npm install
npm run build                      # 테스트 광고 ID로 nova-swarm.ait 생성 (콘솔 업로드·토스앱 테스트용)
TOSS_AD_REWARDED=<광고 그룹 ID> npm run build   # 출시용 (콘솔에서 받은 보상형 광고 그룹 ID)
AIT_APP_NAME=<appName> npm run build           # 콘솔에서 appName을 nova-swarm이 아닌 이름으로 만들었을 때
npx ait deploy --api-key <콘솔 API 키>          # 콘솔 업로드 (사장님이 키를 주면 Claude가 실행)
```

- 개발·테스트 중에는 반드시 테스트 광고 ID(`ait-ad-test-rewarded-id`)를 씁니다. 운영 ID로 테스트하면 제재 대상입니다.
- 번들 크기 약 140KB (한도 100MB).

## 들어간 토스 기능

| 토스 기능 | 게임에서 |
| --- | --- |
| 보상형 광고 (`loadFullScreenAd`/`showFullScreenAd`) | 부활, 다시 뽑기, 골드 2배, 출석 2배. 미리 불러 둔 광고만 보여 주고, 끝까지 봤을 때(`userEarnedReward`)만 보상 |
| 사용자 식별키 (`getUserKeyForGame`) | 기기 저장소 키를 사용자별로 나눔 |
| 기기 저장소 (`Storage`) | 진행 상황 저장 (0.8초 모아서 한 번, 백그라운드로 갈 때 즉시) |
| 게임 리더보드 | 판이 끝나면 처치 수 제출, 첫 화면·결과 화면의 "랭킹" 버튼 |
| Safe Area | HUD·메뉴를 오른쪽 위 더보기·닫기(X) 버튼 아래로 내림 |
| 시스템 뒤로가기 (`graniteEvent` backEvent) | 플레이 중 = 일시정지/재개, 메뉴 = 첫 화면, 첫 화면 = 종료 확인 → `closeView` |

판 사이 전면 광고는 넣지 않았습니다 (토스 검수: "사용자가 예상할 수 없는 순간에 전면 광고 금지").

## 게임 출시 체크리스트 대응

| 체크 항목 | 상태 |
| --- | --- |
| 10초 안에 첫 화면 | ✅ 약 140KB, 외부 요청 없음 |
| 사운드 On/Off, 백그라운드에서 소리 끄기·돌아오면 다시 켜기 | ✅ 설정의 효과음·음악 볼륨, 브라우저 점검 통과 |
| 닫기 버튼·Safe Area·다이내믹 아일랜드 침범 없음 | ✅ HUD를 안전 영역 + 50px 아래로 |
| 진입하자마자 바텀시트 없음, 자사 앱·외부 사이트 이동 없음 | ✅ 공유·"다른 게임" 링크는 토스 빌드에서 숨김 |
| 사용자 식별자 저장, 재접속 시 기록 유지 | ✅ |
| 브릿지 과호출 없음, 실패 시 재시도 횟수·간격 제한 | ✅ 저장 0.8초 묶음, 광고 로드 재시도 최대 3번(5·10·20초) |
| eval 없음, SSR 없음, 외부 도메인 렌더링 없음 | ✅ 정적 파일만 |
| 안드로이드 뒤로가기, 종료 시 확인 모달 | ✅ |
| 인게임 풀스크린, 2초 이상 지연 없음 | ✅ |
| 광고 중 음악 정지·끝나면 재개, 미리 로딩, 보상 지급 | ✅ |
| 배너 광고 위치 | 배너 없음 |

출시 전 토스앱 QR 테스트에서 직접 확인할 것: 아이폰 다이내믹 아일랜드 가림, 리더보드 열고 돌아왔을 때 소리, 실제 광고 노출.

## 콘솔 등록 정보 (붙여 넣기용)

| 칸 | 값 |
| --- | --- |
| 앱 이름 | 노바 스웜 |
| 영문 이름 | NOVA SWARM |
| appName | `nova-swarm` (한 번 정하면 못 바꿉니다) |
| 앱 유형 | 게임 |
| 부제 | 몰려오는 적을 버티고 탄막을 피하는 슈팅 |
| 카테고리 | 액션(또는 슈팅) |
| 검색 키워드 | 슈팅, 탄막, 서바이벌, 로그라이크, 뱀서라이크, 액션, 네온 |
| 앱 로고 | `game/assets/store/toss/logo-600.png` (600×600, 모서리 없음) |
| 썸네일 | `game/assets/store/toss/thumb-1932x828.png` |
| 세로 스크린샷 3장 | `game/assets/store/toss/screenshot-1.png` ~ `-3.png` (636×1048) |
| 고객문의 이메일 | 사장님 이메일 |
| 리더보드 | 점수 이름 "처치 수", 단위 "마리", 높은 점수가 위 |
| 게임 등급 | Microsoft Store 출시 페이지 링크 + 자체등급분류 정보 (아래 순서) |

**상세 설명**

```
화면 아무 곳이나 누르고 끌어서 우주선을 움직여요. 무기는 저절로 발사돼요.
몰려오는 네온 적을 쓰러뜨리면 초록 보석이 떨어지고, 보석을 모아 레벨이 오르면 새 무기나 능력 3개 중 하나를 골라요.
무기 8종을 최대 레벨까지 키우고 짝이 되는 능력을 모으면 더 강한 무기로 진화해요.
5분과 10분에는 탄막 보스가 나와요. 체력이 줄 때마다 링, 나선, 휘어지는 꽃잎 탄으로 공격이 바뀌어요.
탄을 아슬아슬하게 스치면 노바 버스트 게이지가 차요. 가득 차면 오른쪽 아래 버튼으로 화면의 탄을 한 번에 지울 수 있어요.
10분을 버티고 최종 보스를 쓰러뜨리면 승리해요. 판이 끝나면 모은 골드로 영구 강화를 사고, 새 영웅과 스테이지를 열어요.
매일 출석 보상을 받고, 랭킹에서 친구와 처치 수를 겨뤄요.
```

## 게임 등급 (콘솔 5-3)

토스는 게임 등급분류 증빙을 꼭 받습니다. 돈이 들지 않는 길은 **Microsoft Store**에 같은 게임을 올려 자체등급분류(IARC 설문)를 받는 것입니다 (개발자 등록 무료). 받은 뒤 게임물관리위원회 "자체등급분류 게임물 조회"에서 찾은 등록자명·등급분류일자·번호·이용등급·내용정보를 콘솔에 그대로 넣고, 서명 이미지와 플레이 화면(스토어판 2장 + 토스판 2장)을 첨부합니다.

## 출처

[웹 프로젝트에 SDK 연동](https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview.md) · [게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-game.md) · [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace.md) · [전면형/보상형 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad.md) · [게임 리더보드](https://developers-apps-in-toss.toss.im/documentation/common/growth/game-center.md) · [Safe Area](https://developers-apps-in-toss.toss.im/documentation/common/screen/safe-area.md) · [사용자 식별키](https://developers-apps-in-toss.toss.im/documentation/common/authentication/hash-key.md) · [게임 등급분류 방법](https://toss.im/apps-in-toss/blog/game_rating_classification) · [사업자 등록 유예](https://toss.im/apps-in-toss/blog/business-registration-deferral-guide)
