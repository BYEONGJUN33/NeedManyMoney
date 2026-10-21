# 머니셈 — 2026 금융 계산기

연봉 실수령액, 연봉표, 퇴직금, 대출 이자, 예적금 이자, 시급·주휴수당을 계산하는 정적 웹사이트입니다.
검색 유입이 꾸준한 "돈 계산" 키워드를 노리고, 광고(Google AdSense · 카카오 애드핏)로 수익을 냅니다.

- **정확도**: 근로소득세는 추정식이 아니라 국세청 간이세액표(소득세법 시행령 별표2, 2026.2.27 개정) 647개 구간 원문을 그대로 사용합니다. 2026년 4대보험 요율, 국민연금 상한(659만원), 2026·2027 최저임금이 반영되어 있습니다.
- **비용 0원**: 서버·DB 없이 HTML/CSS/JS만으로 동작해서 GitHub Pages나 Cloudflare Pages에 무료로 올릴 수 있습니다.
- **검색 최적화**: 페이지마다 검색어를 넣은 제목·설명, 구조화 데이터(FAQ·WebApplication), 사이트맵, 공유 미리보기 이미지, 미리 만들어 둔 연봉표 96행이 들어 있습니다.
- **광고 심사 준비**: 계산기마다 설명 글과 자주 묻는 질문, 소개·계산 기준 페이지, 개인정보처리방침(광고 쿠키 고지 포함)이 있습니다.

| 페이지 | 주요 검색어 |
| --- | --- |
| `salary.html` 연봉 실수령액 계산기 | 연봉 실수령액, 월급 실수령액, 4대보험 계산 |
| `salary-table.html` 연봉 실수령액 표 | 연봉 실수령액 표 2026, 연봉 4000 실수령액 |
| `severance.html` 퇴직금 계산기 | 퇴직금 계산, 퇴직소득세 |
| `loan.html` 대출 이자 계산기 | 대출 이자 계산, 원리금균등 |
| `savings.html` 예금·적금 이자 계산기 | 적금 이자 계산, 예금 이자 |
| `hourly.html` 시급·주휴수당 계산기 | 주휴수당 계산, 최저임금 월급, 시급 계산 |

---

## 수익화 순서

### 1. 사이트 올리기 (10분)

1. GitHub 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
2. **Actions** 탭 → **테스트 및 배포** → 최근 실행을 열고 **Re-run all jobs** 를 누릅니다.
   (Pages를 켜기 전에 돌아간 실행은 배포 단계에서 멈춰 있는 것이 정상입니다.)
3. 몇 분 뒤 `https://byeongjun33.github.io/NeedManyMoney/` 에서 사이트가 열립니다.

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
npm test          # 계산 엔진 테스트 (간이세액표 원문 값, 4대보험, 퇴직소득세, 대출, 예적금, 시급)
npm run build     # dist/ 생성
npm run dev       # 빌드 후 http://localhost:4173 에서 미리보기
```

```
site.config.mjs              사이트 주소, 광고·분석 ID, 문의 메일
build.mjs                    정적 사이트 생성기 (레이아웃, SEO 메타, 사이트맵, 연봉표)
src/pages.mjs                페이지 제목·설명·자주 묻는 질문
src/pages/*.html             페이지 본문
src/assets/js/rates.js       ← 요율·최저임금 등 기준값 (매년 여기만 고치면 됨)
src/assets/js/taxtable-2026.js  간이세액표 원문 데이터
src/assets/js/calc.js        계산 엔진 (브라우저·Node 공용 순수 함수)
src/assets/js/pages/*.js     각 계산기 화면 동작
tests/calc.test.mjs          계산 검증 테스트
scripts/og.mjs               공유 미리보기 이미지 생성 (Playwright)
scripts/taxtable_from_pdf.py 간이세액표 PDF → JS 변환
```

### 기준이 바뀌었을 때

1. 요율·최저임금: `src/assets/js/rates.js` 값을 고치고 `BASIS`의 날짜를 바꿉니다.
2. 간이세액표 개정: `scripts/taxtable_from_pdf.py` 상단 설명대로 새 표를 만듭니다.
3. 본문 글의 숫자(`src/pages/*.html`, `src/pages.mjs`의 자주 묻는 질문)를 함께 고칩니다.
4. `npm test` 통과를 확인하고 push 하면 자동 배포됩니다.

## 면책

계산 결과는 참고용입니다. 회사 급여 규정, 비과세 항목, 보험료 정산, 연말정산에 따라 실제 금액은 달라질 수 있습니다.
