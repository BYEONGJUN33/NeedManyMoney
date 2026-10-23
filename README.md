# NeedManyMoney

광고 수익을 목표로 만든 웹 게임 세 개와 계산기 사이트가 들어 있습니다. GitHub Pages 한 곳에 함께 배포되고, 첫 화면(게임 모음)이 서로에게 방문자를 보냅니다.

| 경로 | 프로젝트 | 설명 |
| --- | --- | --- |
| `/` | **NOVA ARCADE** ([hub/](hub/)) | 게임 모음 첫 화면. 각 게임 타이틀의 "다른 무료 게임" 링크가 여기로 돌아옴 |
| `/swarm/` | **NOVA SWARM** ([game/](game/README.md)) | 네온 서바이벌 + 탄막 보스 액션 게임. 보상형 광고·게임 포털(CrazyGames·Poki·GameDistribution) 수익화 |
| `/blocks/` | **NOVA BLOCKS** ([blocks/](blocks/README.md)) | 네온 블록 퍼즐. 짧은 판 + 보상형 광고, 일일 도전 |
| `/merge/` | **NOVA MERGE** ([merge/](merge/README.md)) | 구슬 합치기 물리 퍼즐(수박 게임 계열). 보상형 광고, 일일 도전 |
| `/money/` | **머니셈** (아래) | 2026 연봉 실수령액·퇴직금·대출 등 돈 계산기와 금액별 페이지. 검색 유입 + 광고 |

> **처음이라면 [LAUNCH.md](LAUNCH.md)** — 사이트 켜기부터 포털 등록(붙여 넣을 소개문 포함), 광고, 홍보까지 순서대로 정리했습니다.

## 배포 (처음 한 번)

1. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿉니다.
2. **Actions → 테스트 및 배포 → Re-run all jobs**를 누르면 몇 분 뒤 `https://byeongjun33.github.io/NeedManyMoney/`에 게임 모음이 열립니다.
3. 게임을 포털에 올릴 zip과 표지 이미지는 Actions 실행 화면 아래 **Artifacts → nova-portal-kit**에서 한 번에 받을 수 있습니다. 올리는 방법은 [game/README.md](game/README.md)를 보세요.

---

# 머니셈 — 2026 돈 계산기 포털 (`/money/`)

연봉 실수령액, 연말정산, 실업급여, 퇴직금, 대출 이자, 취득세, 적금 이자, 복리까지 **돈 계산기 수십 개와 금액별 실수령액 페이지 262개, 돈 가이드**를 담은 정적 웹사이트입니다.
검색 유입이 꾸준한 "돈 계산" 키워드를 넓게 노리고, 광고(Google AdSense · 카카오 애드핏)로 수익을 냅니다.

- **정확도**: 근로소득세는 국세청 간이세액표(소득세법 시행령 별표2, 2026.2.27 개정) 647개 구간 원문을 그대로 씁니다. 다른 계산기는 법령·고시를 조사하고, 다른 출처로 반박 검증한 뒤 구현했습니다. 상수마다 출처와 확인일을 주석으로 달고 공식 예시를 테스트로 고정했습니다.
- **비용 0원**: 서버·DB 없이 HTML/CSS/JS만으로 동작해 GitHub Pages나 Cloudflare Pages에 무료로 올릴 수 있습니다.
- **검색 최적화**: 페이지마다 검색어를 넣은 제목·설명, 구조화 데이터(FAQ·WebApplication·Article·Breadcrumb), 사이트맵, 페이지별 공유 이미지가 있습니다. "연봉 4,000만원 실수령액", "월급 300만원 실수령액" 같은 금액별 페이지가 자동으로 만들어집니다.
- **광고 심사 준비**: 계산기마다 설명 글과 자주 묻는 질문, 돈 가이드, 소개·계산 기준 페이지, 개인정보처리방침(광고 쿠키 고지 포함)이 있습니다.

계산기 목록은 사이트의 **전체 계산기** 페이지(`all.html`)에서 분류별로 볼 수 있습니다.

---

## 수익화 순서

### 1. 사이트 올리기 (10분)

1. GitHub 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
2. **Actions** 탭 → **테스트 및 배포** → 최근 실행을 열고 **Re-run all jobs** 를 누릅니다.
   (Pages를 켜기 전에 돌아간 실행은 배포 단계에서 멈춰 있는 것이 정상입니다.)
3. 몇 분 뒤 `https://byeongjun33.github.io/NeedManyMoney/money/` 에서 계산기 사이트가 열립니다.

배포는 저장소의 기본 브랜치에 push할 때마다 자동으로 일어납니다. 테스트가 실패하면 배포하지 않습니다.

### 2. 도메인 연결 (권장, 연 1~2만원)

광고 심사와 검색 노출 모두 자기 도메인이 유리합니다. 예: `moneysem.kr`, `머니셈.com`

1. 도메인 업체(가비아, 후이즈, Cloudflare 등)에서 구매하고 DNS에 GitHub Pages 레코드를 추가합니다.
2. **Settings → Pages → Custom domain** 에 도메인을 입력하고 **Enforce HTTPS** 를 켭니다.
3. **Settings → Secrets and variables → Actions → Variables** 에 `SITE_URL` = `https://도메인` 을 추가합니다.
   (canonical 주소, 사이트맵, 공유 이미지 주소가 이 값으로 만들어집니다.)

### 3. 검색엔진 등록 (필수)

한국 검색 트래픽은 네이버 비중이 크므로 두 곳 모두 등록합니다.

- **Google Search Console**: 사이트 추가 → HTML 태그 인증값을 `site.config.mjs`의 `googleSiteVerification`에 넣고 push → `sitemap.xml` 제출
- **네이버 서치어드바이저**: 사이트 등록 → HTML 태그 인증값을 `naverSiteVerification`에 넣고 push → 요청 → 사이트맵 제출

### 4. 광고 붙이기

| | 카카오 애드핏 | Google AdSense |
| --- | --- | --- |
| 승인 | 빠르고 쉬움 | 콘텐츠·트래픽 심사 (수 일~수 주) |
| 단가 | 낮음 | 높음 (금융 키워드는 특히 높은 편) |
| 설정 | `adfitUnits`에 `DAN-…` 단위 ID | `adsenseClient`, `adsenseSlots` |

- 시작은 **애드핏**으로 바로 광고를 걸고, **AdSense** 승인이 나면 같은 자리를 AdSense로 바꾸는 순서를 권합니다. 같은 자리에 둘 다 설정하면 AdSense가 우선합니다.
- `adsenseClient`(예: `ca-pub-1234…`)를 넣으면 자동 광고 스크립트, 사이트 소유 확인 메타 태그, `ads.txt`가 함께 만들어집니다. 게시자 ID는 저장소 변수 `ADSENSE_CLIENT`로 넣어도 됩니다.
- 광고 위치는 계산 결과 바로 아래(`middle`)와 페이지 끝(`bottom`) 두 곳입니다.
- AdSense 심사 전 `site.config.mjs`의 `contactEmail`에 문의 메일을 넣어 두세요 (소개·개인정보처리방침 페이지에 노출).

### 5. 방문자 늘리기

- **시즌을 노립니다**: 1~2월 연봉 협상·연말정산, 3월 간이세액표 개정, 7월 국민연금 상한 조정, 8월 다음 해 최저임금 확정 시기에 검색량이 몰립니다. 그 전에 요율을 갱신하고 글을 다듬어 두세요.
- **공유 링크**: 모든 계산기에 "계산 링크 복사"가 있어 입력값 그대로 공유됩니다. 카카오톡·커뮤니티에 올리면 미리보기 이미지가 붙습니다.
- **블로그 글**: "연봉 4,000만원 실수령액", "2027 최저임금 월급" 같은 글을 쓰고 계산기 링크를 겁니다.
- **방문 통계**: `gaMeasurementId`(또는 저장소 변수 `GA_ID`)에 GA4 측정 ID를 넣으면 어떤 계산기가 인기 있는지 볼 수 있습니다.

---

## 개발

Node 20 이상만 있으면 됩니다. 설치할 패키지는 없습니다.

```bash
npm test                                   # 계산 엔진·페이지 메타 테스트
npm run build                              # dist/ 생성 (CI는 --strict)
npm run dev                                # 빌드 후 http://localhost:4173 미리보기
node scripts/check.mjs --only=salary,loan  # 휴대폰·PC, 라이트·다크 브라우저 점검
node scripts/og.mjs                        # 공유 이미지 다시 만들기 (Playwright)
```

```
site.config.mjs                  사이트 주소, 광고·분석 ID, 문의 메일
build.mjs                        정적 사이트 생성기 (레이아웃, SEO 메타, 사이트맵)
src/categories.mjs               계산기 분류
src/pages/<slug>.meta.mjs        페이지 제목·설명·분류·FAQ  ─┐ 짝으로 두면
src/pages/<slug>.html            페이지 본문               ─┘ 자동 등록
src/generators/salary-pages.mjs  금액별 실수령액 페이지 262개
src/assets/js/rates.js           요율·최저임금 등 공통 기준값
src/assets/js/calc.js            공통 계산 엔진 (실수령액, 간이세액, 퇴직금, 대출, 예적금, 시급)
src/assets/js/calc/<slug>.js     계산기별 계산 모듈
src/assets/js/pages/<slug>.js    계산기별 화면 동작
tests/*.test.mjs                 테스트
docs/CALCULATOR_GUIDE.md         계산기 추가 규칙
docs/GUIDE_WRITING.md            돈 가이드 작성 규칙
```

### 기준이 바뀌었을 때

1. 공통 요율·최저임금: `src/assets/js/rates.js`를 고치고 `BASIS` 날짜를 바꿉니다.
2. 계산기별 기준: `src/assets/js/calc/<slug>.js` 위쪽 상수(출처 주석 포함)를 고칩니다.
3. 간이세액표 개정: `scripts/taxtable_from_pdf.py` 상단 설명대로 새 표를 만듭니다.
4. 본문 글과 FAQ의 숫자를 함께 고치고 `npm test` 통과를 확인한 뒤 push 하면 자동 배포됩니다.

## 면책

계산 결과는 참고용입니다. 회사 급여 규정, 비과세 항목, 보험료 정산, 연말정산에 따라 실제 금액은 달라질 수 있습니다.
