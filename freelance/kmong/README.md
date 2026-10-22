# 크몽 등록 키트

크몽에 서비스 2개(홈페이지 제작, 엑셀 업무 자동화)를 올리는 데 필요한 글과 이미지가 모두 들어 있습니다.

## 등록 순서 (서비스마다 20분 정도)

1. 크몽 가입 → 전문가 등록 (본인 인증, 정산 계좌, 개인/사업자 선택)
2. 서비스 등록 → 아래 표대로 칸을 채우기
3. 포트폴리오 등록 (크몽 프로필 → 포트폴리오) → `images/portfolio-*.jpg`
4. 첫 리뷰를 모으는 동안은 가격을 그대로 두고, 리뷰 5~10개가 쌓이면 올리기

| 크몽 입력 칸 | 홈페이지 제작 | 엑셀 업무 자동화 |
| --- | --- | --- |
| 제목·카테고리·키워드·설명·패키지·옵션·FAQ | [1_홈페이지_서비스.md](1_홈페이지_서비스.md) | [2_업무자동화_서비스.md](2_업무자동화_서비스.md) |
| 메인 이미지 (652×488) | `images/thumb-web.png` (고해상도 `@2x`) | `images/thumb-auto.png` (`@2x`) |
| 상세 이미지 | `images/detail-web-1~4.jpg` (한 장짜리 `detail-web.jpg`) | `images/detail-auto-1~2.jpg` (`detail-auto.jpg`) |
| 포트폴리오 (1:1) | `portfolio-cafe / pilates / interior / app.jpg` | `portfolio-merge-tool / order-tool.jpg` |
| 의뢰인 요청사항 | [주문서.md](주문서.md) 위쪽 | [주문서.md](주문서.md) 아래쪽 |

주문이 오면: [메시지_템플릿.md](메시지_템플릿.md) → 홈페이지는 [../kit/README.md](../kit/README.md), 자동화는 [../automation/README.md](../automation/README.md) 순서대로 작업합니다.

## 지켜야 할 것

- 모든 상담·결제는 크몽 안에서 (외부 연락처·직접 입금 유도 금지)
- 포트폴리오는 "컨셉 샘플"로 표시되어 있습니다. 실제 고객 작업처럼 소개하지 마세요.
- 고객 후기·경력·수치는 고객이 준 사실만 사이트에 씁니다.
- 수수료와 등록 규격(이미지 크기 등)은 바뀔 수 있으니 등록 화면 안내를 한 번 더 확인하세요.

## 이미지 다시 만들기

문구나 가격을 바꾸면 `render/` 의 HTML을 고치고:

```bash
cd ../kit && node build.mjs --all          # 샘플 사이트 빌드
cd ../kmong/render && node capture.cjs     # 화면 캡처 (Playwright)
node make-images.cjs                       # ../images/ 전부 다시 만들기
```
