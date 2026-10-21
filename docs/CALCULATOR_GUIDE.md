# 계산기 추가 가이드

머니셈 계산기 하나는 아래 파일로 이루어진다. `<slug>`는 영문 소문자와 하이픈(예: `gift-tax`).

| 파일 | 역할 |
| --- | --- |
| `src/pages/<slug>.meta.mjs` | 제목·설명·분류·FAQ (빌드가 자동 등록) |
| `src/pages/<slug>.html` | 본문 조각 (header/footer 없이) |
| `src/assets/js/calc/<slug>.js` | **순수 계산 함수** (DOM 없음, Node에서도 import 가능) |
| `src/assets/js/pages/<slug>.js` | 화면 동작 (입력 → 계산 → 결과 렌더링) |
| `tests/<slug>.test.mjs` | `node:test` 테스트 |
| `src/assets/css/pages/<slug>.css` | (선택) 이 페이지만 쓰는 스타일. 있으면 자동으로 링크됨 |

## 공유 파일은 고치지 않는다

여러 사람이 동시에 계산기를 추가하므로 아래 파일은 **수정 금지**다. 꼭 바꿔야 할 일이 있으면 결과 보고에 적는다.

`build.mjs`, `site.config.mjs`, `src/categories.mjs`, `src/assets/css/style.css`, `src/assets/js/ui.js`, `src/assets/js/calc.js`, `src/assets/js/rates.js`, `src/assets/js/taxtable-2026.js`, `src/generators/*`, 다른 계산기의 파일, `package.json`, `.github/*`, `README.md`

- 공유 모듈은 **import 해서 쓰기만** 한다. 예: `import { calcSalary, withholdingTax, basicTax, floor10, parseDate, daysBetween } from '../calc.js'`, `import { MIN_WAGE, INSURANCE, TAX_BRACKETS } from '../rates.js'`.
- 새 상수(요율, 한도, 공제액)는 자기 계산 모듈 위쪽에 모아 두고, 상수마다 **출처와 확인일**을 주석으로 단다.
  ```js
  // 구직급여 1일 상한액 — 고용보험법 시행령 제68조, 2026.1.1 이후 이직자 (고용노동부 보도자료 2025-xx-xx, 확인 2026-10-21)
  const DAILY_CAP = 68_100;
  ```
- 커밋하지 않는다. 커밋은 통합 담당이 한다.

## meta 파일

```js
export default {
  slug: 'gift-tax',
  kind: 'calculator',
  category: 'tax',            // work | tax | home | save | life  (src/categories.mjs)
  order: 30,                  // 같은 분류 안에서의 순서 (작을수록 위)
  nav: '증여세',              // 짧은 이름
  name: '증여세 계산기',
  desc: '관계별 증여재산공제와 10년 합산까지 반영한 증여세',   // 목록에 보이는 한 줄 (35자 안팎)
  title: '증여세 계산기 2026 — 증여재산공제·세율·신고세액공제 | 머니셈',  // 검색 결과 제목. 핵심 검색어를 앞에
  description: '…',          // 검색 결과 설명 120~160자, 구체적인 숫자 포함
  script: 'gift-tax.js',
  priority: '0.8',
  faq: [['질문', '답'], …],   // 4~6개. 답은 2~3문장, 구체적 숫자
};
```
`popular`는 넣지 않는다 (헤더 메뉴는 통합 담당이 정한다).

## 본문 조각 구조

`src/pages/salary.html`, `src/pages/loan.html`을 그대로 따라 한다.

```html
<div class="wrap">
  <header class="page-head">
    <span class="basis-tag">2026년 기준 · 근거 법령/고시</span>
    <h1>…계산기</h1>
    <p class="lede">이 계산기가 무엇을 알려주는지 한두 문장</p>
  </header>

  <div class="calc">
    <form class="panel" id="form" autocomplete="off"> … 입력 … </form>
    <section class="result" aria-label="계산 결과">
      <div class="slip">
        <div class="slip-head">
          <span class="eyebrow">핵심 결과 이름</span>
          <output class="big-num" id="…">0<small>원</small></output>
          <p class="slip-sub" id="…"></p>
        </div>
        <div class="slip-body"><dl class="ledger" id="ledger"></dl></div>
        <div class="slip-actions">
          <button type="button" class="btn primary" data-copy-result>결과 복사</button>
          <button type="button" class="btn" data-copy-link>계산 링크 복사</button>
        </div>
      </div>
    </section>
  </div>

  <!--ad:middle-->

  <div class="content">
    <article class="prose"> … 설명 글 … </article>
    <section aria-labelledby="faq-title" class="prose"><h2 id="faq-title">자주 묻는 질문</h2></section>
    <!--faq-->
    <!--related-->
  </div>
</div>
```

- 입력 기본값은 **현실적인 예시**로 채워 페이지를 열자마자 결과가 보이게 한다.
- 표가 필요하면 `<div class="table-wrap"><table class="data">…</table></div>`. 긴 표는 `table-wrap tall`.
- 설명 글(`article.prose`)은 검색 유입과 광고 심사에 중요하다. **h2 3개 이상, 본문 1,000자 이상**: 계산 공식(`<div class="formula">`), 기준값 표, 자주 틀리는 점, 절약 팁. 숫자는 계산 모듈의 상수와 일치해야 한다.
- 문체: 짧고 직접적인 평서문. "~입니다/~합니다". 과장·이모지·느낌표 금지. 법령·고시 이름을 정확히.
- 확실하지 않은 기준은 쓰지 않는다. 계산에 반영하지 못한 예외는 "이 계산기는 ~를 반영하지 않습니다"라고 밝힌다.

## 쓸 수 있는 스타일 (style.css)

| 용도 | 클래스 |
| --- | --- |
| 입력 묶음 | `.field` (+ `label` 또는 `.label`), `.hint`, 2열 이상 `.row` |
| 금액·숫자 입력 | `<div class="input"><input inputmode="numeric"><span class="unit">원</span></div>`, 큰 입력 `.input.big` |
| 선택지 | `.seg` (radio + label 쌍), `.stepper` (−/+), `.switch` (checkbox), `.chips` > `button.chip` |
| 접기 | `details.more` > `summary` + `.more-body` |
| 결과 | `.slip`, `.slip-head`, `.big-num`, `.slip-sub`, `.slip-body`, `dl.ledger` (행 클래스 `gross`, `minus`, `sum`), `.split` 막대, `.legend` |
| 알림 | `.notice` (주의), `.notice.bad` (불가·미달), `.notice.good` (충족) |
| 요약 숫자 | `dl.stats` (slip 안), `dl.stats.boxed` (패널 안) |
| 표 | `.table-wrap` (`.tall`), `table.data`, 행 강조 `tr.hit`, 강조 숫자 `td.net` |
| 글 | `.prose`, `.formula`, `.faq` |
| 버튼 | `.btn`, `.btn.primary` |

색은 반드시 토큰(`var(--accent)`, `var(--minus)`, `var(--muted)` 등)으로. 라이트·다크 모두에서 보여야 한다.

## 화면 스크립트 (ui.js 도우미)

```js
import { calcGiftTax } from '../calc/gift-tax.js';
import { $, $$, fmt, won, koUnit, moneyInput, unitHint, stepper, radioValue, setRadio,
  readParams, wireShare, ledgerRows, resultDock } from '../ui.js';

const dock = resultDock();                       // 휴대폰 하단 결과 바
const amount = moneyInput($('#amount'), update); // 쉼표 자동, amount.get()/set()
unitHint($('#amount'), $('#amount-hint'));       // "4,000만원" 표시 (10만원 이상)
// stepper($('[data-stepper]'), update); radioValue('name'); setRadio('name', v)

let last;
function update() {
  const o = { /* 입력 읽기 */ };
  const r = calcGiftTax(o);
  last = { o, r };
  $('#tax').innerHTML = `${fmt(r.total)}<small>원</small>`;
  dock('납부할 증여세', won(r.total));
  ledgerRows($('#ledger'), [
    { label: '증여재산가액', value: won(r.amount), cls: 'gross' },
    { label: '증여재산공제', value: fmt(r.deduction), cls: 'minus', note: '직계존속 → 성년 자녀' },
    { label: '납부세액', value: won(r.total), cls: 'sum' },
  ]);
}
wireShare({ textFn: () => '[머니셈] …', paramsFn: () => ({ amount: last.o.amount }) });
const q = readParams();                          // 공유 링크 값 복원
if (q.get('amount')) amount.set(Number(q.get('amount')) || 0);
update();
```

- 입력이 바뀔 때마다 즉시 다시 계산한다 (제출 버튼 없음). `alert/confirm/prompt` 금지.
- 잘못된 입력(빈 값, 음수, 범위 밖)은 계산 모듈에서 안전하게 처리하고, 필요하면 `.notice.bad`로 이유와 고치는 방법을 보여 준다.
- 외부 스크립트·CDN·네트워크 요청 금지.

## 계산 모듈 규칙

- 입력 객체 하나를 받아 결과 객체를 돌려주는 순수 함수. 예외를 던지지 말고 `{ error: '…' }`를 돌려준다.
- 반올림·절사 규칙을 법령대로 구현하고 주석으로 밝힌다 (예: 원 단위 미만 절사, 10원 미만 절사).
- 부동소수점: 요율 곱셈 뒤 절사할 때는 `calc.js`의 `floor10`처럼 오차를 보정한다 (`Math.floor(Math.round(x * 1000) / 1000)`).

## 확인 방법

```bash
node --test tests/<slug>.test.mjs                              # 내 테스트만
node scripts/check.mjs --only=<slug> --shots=/tmp/<slug>-shots # 빌드 + 휴대폰/PC·라이트/다크 점검 + 스크린샷
```
스크린샷은 Read 도구로 직접 열어 확인한다. 테스트에는 **공식 자료의 예시 값**(고시·보도자료·법령 해설의 계산 예)을 최소 3개 넣고, 경계값(한도, 구간 경계, 0, 최대치)을 포함한다. 다른 사람의 파일 때문에 생긴 경고는 무시해도 된다.
