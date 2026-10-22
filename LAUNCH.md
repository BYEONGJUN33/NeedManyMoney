# 출시 체크리스트 — 돈이 들어오게 하는 순서

코드는 다 되어 있습니다. 아래는 **계정·정산이 본인 명의여야 해서 직접 하셔야 하는 일**입니다. 위에서부터 하면 됩니다.

## 1. 사이트 켜기 (5분)

1. GitHub 저장소 → **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. **Actions → 테스트 및 배포 → 가장 최근 실행 → Re-run all jobs**
3. 몇 분 뒤 열리는 주소
   - `https://byeongjun33.github.io/NeedManyMoney/` 게임 모음
   - `/swarm/`, `/blocks/`, `/merge/` 각 게임, `/money/` 계산기

## 2. 포털 제출 파일 받기

Actions 실행 화면 맨 아래 **Artifacts → nova-portal-kit** 를 내려받으면 아래가 다 들어 있습니다.

| 게임 | 포털용 zip | 표지 |
| --- | --- | --- |
| NOVA SWARM | `game/dist/nova-swarm-{crazygames,poki,gd}.zip` | `game/assets/store/*.png` |
| NOVA BLOCKS | `blocks/dist/nova-blocks-{crazygames,poki,gd}.zip` | `blocks/assets/store/*.png` |
| NOVA MERGE | `merge/dist/nova-merge-{crazygames,poki,gd}.zip` | `merge/assets/store/*.png` |

표지 파일: `cover-1920x1080.png`(가로), `cover-800x1200.png`(세로), `cover-800x800.png`(정사각), `thumb-512x384.png`, `screenshot-*.png`

## 3. 포털 등록 (게임마다 반복)

| 순서 | 포털 | 할 일 | 메모 |
| --- | --- | --- | --- |
| 1 | **GameDistribution** (gamedistribution.com/developers) | 가입 → 게임 추가 → 발급된 Game ID로 zip 다시 만들기: `GD_GAME_ID=<ID> node build.mjs` → `…-gd.zip` 업로드 | 심사가 가장 너그럽고, 수백 개 사이트에 자동으로 퍼집니다 |
| 2 | **CrazyGames** (developer.crazygames.com) | 가입 → Submit game → HTML5 → `…-crazygames.zip` 업로드 → 표지 3장 | 업로드 후 미리보기 주소 끝에 `?crazygames_sandbox=1`로 광고 흐름 확인 |
| 3 | **Poki** (developers.poki.com) | 게임 제출 → 플레이 테스트 결과를 기다림 | 독점 조건이 붙을 수 있으니 계약 전 다른 포털과 겹치는지 확인 |
| 4 | **itch.io** | 새 프로젝트 → Kind: HTML → `dist/web` 폴더를 zip으로 → "played in the browser" 체크 | 후원 버튼, 커뮤니티 노출용 |

- 정산 정보(PayPal·은행·세금 서류)는 각 포털 대시보드에서 본인 명의로 입력합니다.
- 한 게임을 여러 포털에 올려도 되지만, **독점 계약을 제안받으면 조건을 먼저 확인**하세요.

## 4. 포털 입력란에 붙여 넣을 소개문

### NOVA SWARM

- **Category**: Action · **Tags**: survivor, roguelite, bullet hell, shooter, upgrade, neon, singleplayer
- **Short description**: Survive 10 minutes against a neon swarm. Auto-firing weapons, level-up choices and evolutions.
- **Description**:
  > Hold out against an endless neon swarm for 10 minutes. Your weapons fire on their own — you choose where to move and which upgrades to take. Level up to pick new weapons and passives, combine them into powerful evolutions, defeat two bosses, and spend gold on permanent upgrades between runs. Three stages, four heroes, 22 achievements and an endless mode after victory.
- **Controls**: Move: WASD / Arrow keys, or drag on touch screens. Pause: Esc / P. Level-up choices: click or 1–3.
- **Languages**: English, Korean, Spanish, Portuguese, French, German, Turkish, Russian

### NOVA BLOCKS

- **Category**: Puzzle · **Tags**: block puzzle, 1010, tetris-like, casual, brain, relaxing, daily
- **Short description**: Drag neon blocks onto the board and clear full rows and columns.
- **Description**:
  > A relaxing neon block puzzle. Drag the three blocks onto the 8×8 board and fill complete rows or columns to clear them. Clear lines in a row to build combos, wipe the whole board for a perfect-clear bonus, and come back every day for the daily challenge where everyone gets the same blocks. Your game is saved automatically.
- **Controls**: Drag and drop with mouse or touch. Pause: Esc / P.
- **Languages**: English, Korean, Spanish, Portuguese, French, German, Italian, Turkish, Russian, Japanese, Indonesian, Polish

### NOVA MERGE

- **Category**: Puzzle · **Tags**: merge, suika, watermelon game, physics, drop, casual, satisfying
- **Short description**: Drop glowing orbs — two equal orbs merge into a bigger one. Reach the NOVA!
- **Description**:
  > Drop glowing orbs into the jar. When two orbs of the same size touch, they merge into a bigger one. Chain merges, climb all 11 tiers and create the legendary NOVA — but don't let the orbs pile up over the line. Cute faces, satisfying physics, a daily challenge with the same orbs for everyone, and automatic saving.
- **Controls**: Aim: mouse, touch drag, or ← → / A D. Drop: release, click, Space or ↓. Pause: Esc / P.
- **Languages**: English, Korean, Spanish, Portuguese, French, German, Italian, Turkish, Russian, Japanese, Indonesian, Polish

## 5. 자체 사이트 광고 (선택)

1. Google AdSense 가입 → 사이트 `byeongjun33.github.io` 추가 (자체 도메인이 있으면 승인이 더 쉽습니다)
2. 저장소 **Settings → Secrets and variables → Actions → Variables** 에 `ADSENSE_CLIENT` = `ca-pub-…` 추가
3. Actions 다시 실행 → 계산기 사이트 광고, 게임 H5 광고, 첫 화면 자동 광고, `ads.txt`가 함께 켜집니다
4. 승인 전에는 카카오 애드핏(계산기 사이트)을 쓸 수 있습니다: `site.config.mjs`의 `adfitUnits`

## 6. 사람 모으기 (무료)

- **NOVA MERGE**는 큰 구슬이 터지는 장면이 짧은 영상(쇼츠·릴스·틱톡)에 잘 맞습니다. 화면 녹화 15초 + 게임 주소
- Reddit r/WebGames, r/incremental_games(해당 시), r/IndieGaming 에 플레이 주소와 한 줄 소개
- 계산기 사이트(`/money/`)는 네이버 서치어드바이저·구글 서치 콘솔에 `sitemap.xml`을 제출하면 검색 유입이 시작됩니다

## 7. 수익 확인

- 포털 대시보드에서 플레이 수·광고 수익을 봅니다. 처음 몇 주는 포털이 노출을 시험하는 기간이라 들쭉날쭉합니다.
- 반응이 좋은 게임이 보이면 그 게임에 콘텐츠(스테이지, 스킨)를 더하는 쪽이 새 게임을 만드는 것보다 효율이 좋습니다.
