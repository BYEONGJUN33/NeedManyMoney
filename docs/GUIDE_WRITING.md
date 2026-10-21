# 돈 가이드 작성 규칙

가이드는 검색으로 들어온 사람이 **제도를 이해하고 바로 계산기로 넘어가게** 하는 글이다. 광고 심사(AdSense)는 "가치 있는 고유 콘텐츠"를 보므로 베껴 쓰거나 부풀린 글은 사이트 전체에 해가 된다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `src/pages/guide-<topic>.meta.mjs` | 제목·설명·연결 계산기·날짜·FAQ |
| `src/pages/guide-<topic>.html` | 본문 |

공유 파일과 계산기 파일은 고치지 않는다 (`docs/CALCULATOR_GUIDE.md`의 목록과 같음). 커밋하지 않는다.

## meta

```js
export default {
  slug: 'guide-unemployment',
  kind: 'guide',
  category: 'work',                 // work | tax | home | save | life
  order: 10,
  name: '실업급여 조건과 신청 방법 총정리 (2026)',   // 글 제목 = h1
  desc: '수급 요건, 받는 금액, 신청 순서를 한 번에',   // 목록용 한 줄
  title: '실업급여 조건·신청 방법 2026 — 수급액·기간 총정리 | 머니셈',
  description: '…120~160자, 구체적 숫자…',
  calcs: ['unemployment'],          // 연결할 계산기 slug (존재하는 것만)
  published: '2026-10-21',
  updated: '2026-10-21',
  priority: '0.7',
  faq: [['질문', '답'], …],          // 3~5개
};
```

## 본문 구조

```html
<div class="wrap">
  <article class="prose guide">
    <header class="page-head">
      <span class="basis-tag">2026년 10월 기준</span>
      <h1>(meta.name과 같은 제목)</h1>
      <p class="lede">이 글에서 알 수 있는 것 한두 문장</p>
      <p class="guide-meta">머니셈 · 2026-10-21 업데이트</p>
    </header>
    <!--guide-calcs-->
    <h2>…</h2>
    <p>…</p>
    <div class="table-wrap"><table class="data">…</table></div>
    <!--ad:middle-->
    <h2>…</h2>
    …
    <h2>참고한 자료</h2>
    <ul><li>기관명 — 자료 이름 (게시일)</li></ul>
  </article>
  <section aria-labelledby="faq-title" class="prose"><h2 id="faq-title">자주 묻는 질문</h2></section>
  <!--faq-->
  <!--related-->
</div>
```

- 분량: 본문 2,500자 이상, h2 4~6개. 표 1개 이상. 예시 계산 1개 이상(실제 숫자로).
- 계산기 링크: 본문 중간에 `<a href="unemployment.html">실업급여 계산기</a>`처럼 자연스럽게 1~3번.
- 숫자는 해당 계산기의 계산 모듈(`src/assets/js/calc/<slug>.js`, `src/assets/js/calc.js`, `rates.js`) 상수와 **반드시 일치**해야 한다. 예시 계산은 계산 모듈을 Node로 실행해 얻은 값을 쓴다.
- 출처는 공식 기관 자료로 하고 "참고한 자료"에 기관명과 자료 이름을 적는다. 외부 링크는 `rel="noopener"`와 `target="_blank"`.

## 문체

- "~입니다/~합니다"의 짧은 평서문. 한 문단 3~4문장.
- 과장, 감탄, 이모지, 낚시성 표현("꼭 알아야 할 충격적인") 금지.
- 모르는 것은 쓰지 않는다. 바뀔 수 있는 제도는 "2026년 10월 기준"을 밝힌다.
- 개인 상황에 따라 달라지는 부분은 "정확한 금액은 ○○에서 확인"으로 공식 창구를 안내한다.
- 다른 사이트 문장을 옮기지 않는다. 구조와 예시를 직접 만든다.

## 확인

```bash
node scripts/check.mjs --only=guide-<topic> --shots=<폴더>
```
스크린샷을 직접 열어 확인한다.
