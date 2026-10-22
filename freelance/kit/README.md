# 랜딩 키트 — 주문 받은 홈페이지를 빠르게 만드는 도구

고객 정보를 `site.json` 하나에 적으면 반응형 홈페이지가 만들어집니다. 사진은 WebP 여러 크기로 바뀌고, 검색·공유 설정(제목, 설명, 공유 이미지, 구조화 데이터, 사이트맵)과 문의 폼이 있을 때의 개인정보처리방침 페이지까지 함께 나옵니다.

```bash
node build.mjs ../samples/cafe            # → ../dist/cafe/
node build.mjs 고객폴더 --out=납품폴더
node build.mjs --all                      # 샘플 4개 전부
npm test                                  # 설정 확인·빌드 테스트
```

필요한 것: Node 18 이상, Python 3 + Pillow (`pip install pillow`).

## 주문 하나를 처리하는 순서

1. **자료 받기**: 크몽 요청사항 양식([../kmong/주문서.md](../kmong/주문서.md))으로 상호, 업종, 연락처, 주소, 영업시간, 사진, 원하는 분위기, 참고 사이트를 받습니다.
2. **폴더 만들기**: `clients/<고객이름>/site.json`과 `clients/<고객이름>/img/`(받은 사진). 비슷한 업종 샘플의 `site.json`을 복사해서 고치는 게 가장 빠릅니다.
3. **문구 쓰기**: Claude Code 세션에서 "받은 자료로 site.json 채워 줘"라고 하면 업종에 맞는 제목·소개·자주 묻는 질문 초안이 나옵니다. 사실(가격, 경력, 수치)은 반드시 고객 자료에서만 가져옵니다.
4. **빌드·확인**: `node build.mjs clients/<고객이름>` → 휴대폰·PC 화면을 캡처해 고객에게 시안으로 보냅니다.
5. **수정**: 요청을 `site.json`에 반영하고 다시 빌드합니다. 대부분 몇 분이면 끝납니다.
6. **배포·납품**: 아래 "올리는 곳" 중 하나에 올리고, 도메인을 연결하고, 납품 체크리스트를 확인합니다.

## site.json 구조

```jsonc
{
  "name": "상호", "mark": "로고 글자(1자)", "tagline": "한 줄 소개",
  "title": "브라우저 제목(검색 결과 제목)", "description": "검색 설명 (160자 이하)",
  "url": "https://도메인/",              // 넣으면 canonical·사이트맵·공유 주소가 생김
  "sample": false,                        // true면 '컨셉 샘플' 표시
  "schemaType": "LocalBusiness",         // CafeOrCoffeeShop, ExerciseGym, HomeAndConstructionBusiness, Restaurant, BeautySalon …
  "openingHours": "Mo-Fr 09:00-18:00",
  "theme": { "bg": "#fff", "surface": "#f4f2ef", "ink": "#151515", "muted": "#6d6a66", "primary": "#151515", "onPrimary": "#fff",
             "accent": "#a8834f", "head": "sans|serif", "headWeight": 650, "radius": 16, "dark": false },
  "headerCta": { "label": "예약", "href": "#book" },
  "contact": { "phone": "", "kakao": "카카오톡 채널 주소", "instagram": "", "email": "", "address": "", "hours": [["평일", "09:00 – 18:00"]] },
  "business": { "company": "상호", "owner": "대표", "regNo": "사업자등록번호", "mailOrderNo": "통신판매업 번호(온라인 판매 시)" },
  "quickbar": [{ "label": "전화", "href": "tel:0212345678", "icon": "phone", "primary": false }],  // 휴대폰 하단 고정 버튼
  "analytics": { "ga": "G-XXXX" }, "verify": { "naver": "", "google": "" },
  "sections": [ … 아래 섹션들을 원하는 순서로 … ]
}
```

모든 섹션에 쓸 수 있는 값: `id`(메뉴 링크 대상), `nav`(머리말 메뉴 이름), `tone`(`alt` 배경색 / `dark` / `primary`), `eyebrow`·`title`·`text`(제목 묶음). 글에서 `\n`은 줄바꿈, `**굵게**`는 굵은 글씨입니다.

| type | 용도 | 주요 값 |
| --- | --- | --- |
| `hero` | 첫 화면 (반드시 첫 섹션) | `variant`: `full`(사진 전체) · `split`(글+사진, `card`) · `app`(휴대폰 목업), `image`, `buttons`, `badges` |
| `about` | 소개·강사·대표 | `image`, `body`(문단 배열), `stats`, `reverse` |
| `features` | 장점 카드 | `items`[{`icon`, `title`, `text`}], `columns` |
| `menu` | 메뉴판 | `groups`[{`name`, `image`, `items`[{`name`, `desc`, `price`, `tag`}]}] |
| `pricing` | 요금제·패키지 | `plans`[{`name`, `price`, `unit`, `features`, `highlight`, `cta`}] |
| `gallery` | 사진 모음 (누르면 크게) | `images`[{`src`, `alt`, `caption`}] |
| `steps` | 진행 순서 | `items`[{`title`, `text`}] |
| `portfolio` | 시공·작업 사례 | `items`[{`image`, `title`, `meta`, `text`}] |
| `testimonials` | 후기 | `items`[{`rating`, `quote`, `name`, `meta`}] — 실제 고객 후기만 |
| `faq` | 자주 묻는 질문 | `items`[{`q`, `a`}], `openFirst` |
| `location` | 오시는 길 | `mapQuery`, `transit`, `map`(`google` 실제 지도 / `card` 그림 지도) |
| `form` | 문의·예약 폼 | `fields`(text·tel·email·select·chips·textarea), `action`, `provider`(`formspree`·`sheet`) |
| `cta` | 행동 유도 띠 | `buttons` |
| `stats` | 큰 숫자 | `items`[{`value`, `label`}] |
| `countdown` | 출시·이벤트 카운트다운 | `date` |
| `app-screens` | 앱 화면 목업 3개 | `items`[{`screen`: home·stats·goal, `title`, `text`}] |

아이콘 이름: `node -e "import('./lib/icons.mjs').then(m=>console.log(m.ICONS.join(' ')))"`

## 문의 폼 받는 곳

- **구글 시트 + 메일 알림 (무료, 추천)**: [tools/form-to-sheet.gs](tools/form-to-sheet.gs) 맨 위 설치 방법대로 고객 구글 계정에 설치 → `"provider": "sheet"`, `"action": "웹 앱 URL"`.
- **Formspree**: formspree.io에서 폼을 만들고 `"action": "https://formspree.io/f/…"`. 무료는 월 50건.
- `action`이 없으면 전송하지 않고 "샘플" 안내만 나옵니다.

## 올리는 곳 (고객 명의 계정으로)

| 방법 | 비용 | 메모 |
| --- | --- | --- |
| **Cloudflare Pages** | 무료 | 대시보드에서 폴더 업로드. 빠르고 트래픽 제한이 넉넉함. 추천 |
| **Netlify Drop** | 무료 | app.netlify.com/drop 에 폴더를 끌어다 놓기 |
| **GitHub Pages** | 무료 | 저장소에 올리고 Pages 켜기 |
| 카페24·가비아 웹호스팅 | 월 몇천 원 | FTP로 폴더 내용 업로드. 고객이 이미 쓰고 있을 때 |

도메인: 가비아·카페24 등에서 산 도메인의 DNS에 호스팅 업체가 알려 주는 레코드(CNAME 등)를 넣습니다. 연결 후 `site.json`의 `url`을 도메인으로 바꿔 다시 빌드·업로드합니다.

## 납품 체크리스트

- [ ] 휴대폰·PC에서 모든 메뉴 링크와 버튼(전화, 카톡, 지도) 동작
- [ ] 문의 폼 실제 전송 → 시트(또는 메일) 도착 확인
- [ ] `url` 설정 후 재빌드 (canonical·사이트맵·공유 이미지 주소)
- [ ] 카카오톡·문자로 주소를 보내 공유 미리보기 확인
- [ ] 네이버 서치어드바이저·구글 서치 콘솔에 사이트 등록, `sitemap.xml` 제출 (`verify` 값)
- [ ] 사업자 정보(상호·대표·사업자번호·주소) 꼬리말 확인, 온라인 판매가 있으면 통신판매업 번호
- [ ] 후기·수치·자격은 고객이 제공한 사실만 사용 (과장 광고 금지)
- [ ] 사진 사용 권리 확인 (고객 사진 또는 상업적 사용이 허락된 사진)
- [ ] 원본 폴더(site.json + img)와 결과 폴더를 zip으로 함께 전달
