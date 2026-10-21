// 연봉·월급 금액별 실수령액 페이지 (예: salary-4000.html = 연봉 4,000만원, wage-300.html = 월급 300만원)
// 금액마다 공제 내역, 부양가족별·조건별 비교, 주변 금액 비교가 달라 각 페이지가 고유한 수치를 담는다.
import { calcSalary } from '../assets/js/calc.js';
import { MIN_WAGE } from '../assets/js/rates.js';

const nf = new Intl.NumberFormat('ko-KR');
const fmt = (n) => nf.format(Math.round(n));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** 만원 단위 정수 → "1억 2,000만원" */
export function manLabel(man) {
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  return `${eok ? `${eok}억` : ''}${eok && rest ? ' ' : ''}${rest ? `${fmt(rest)}만` : ''}원`;
}
const signed = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '0');

export const ANNUAL_RANGE = { from: 2000, to: 20000, step: 100 };
export const MONTHLY_RANGE = { from: 200, to: 1000, step: 10 };

export const salarySlug = (man) => `salary-${man}`;
export const wageSlug = (man) => `wage-${man}`;

function range({ from, to, step }) {
  const out = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
}

function ledgerHtml(r) {
  const rows = r.deductions.map((d) => `<div class="minus"><dt>${d.label}</dt><dd>${fmt(d.value)}</dd></div>`).join('');
  return `<dl class="ledger">
          <div class="gross"><dt>월 급여 (세전)<small>비과세 ${fmt(r.nonTaxable)}원 포함</small></dt><dd>${fmt(r.monthlyGross)}원</dd></div>
          ${rows}
          <div class="minus"><dt>공제 합계</dt><dd>${fmt(r.totalDeduction)}</dd></div>
          <div class="sum"><dt>실수령액</dt><dd>${fmt(r.monthlyNet)}원</dd></div>
        </dl>`;
}

function familyTable(base) {
  const cases = [
    { label: '1명 (본인)', family: 1, children: 0 },
    { label: '2명 (배우자)', family: 2, children: 0 },
    { label: '3명 (자녀 1)', family: 3, children: 1 },
    { label: '4명 (자녀 2)', family: 4, children: 2 },
    { label: '5명 (자녀 3)', family: 5, children: 3 },
  ];
  const rows = cases.map((c) => {
    const r = calcSalary({ ...base, family: c.family, children: c.children });
    const d = Object.fromEntries(r.deductions.map((x) => [x.key, x.value]));
    return `<tr><td>${c.label}</td><td>${fmt(d.incomeTax)}</td><td>${fmt(d.localTax)}</td><td class="net">${fmt(r.monthlyNet)}</td></tr>`;
  }).join('');
  return `<table class="data"><thead><tr><th scope="col">부양가족 (8~20세 자녀)</th><th scope="col">소득세</th><th scope="col">지방소득세</th><th scope="col">월 실수령액</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function conditionTable(base, isAnnual) {
  const cases = [
    { label: '비과세 0원', o: { nonTaxable: 0 } },
    { label: '비과세 식대 20만원', o: { nonTaxable: 200_000 } },
    { label: '비과세 40만원 (식대+차량)', o: { nonTaxable: 400_000 } },
  ];
  if (isAnnual) cases.push({ label: '퇴직금 포함 연봉 (÷13)', o: { nonTaxable: 200_000, includesSeverance: true } });
  const rows = cases.map((c) => {
    const r = calcSalary({ ...base, ...c.o });
    return `<tr><td>${c.label}</td><td>${fmt(r.monthlyGross)}</td><td>${fmt(r.totalDeduction)}</td><td class="net">${fmt(r.monthlyNet)}</td></tr>`;
  }).join('');
  return `<table class="data"><thead><tr><th scope="col">조건</th><th scope="col">월 급여</th><th scope="col">공제 합계</th><th scope="col">월 실수령액</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function neighborTable(man, isAnnual, net) {
  const R = isAnnual ? ANNUAL_RANGE : MONTHLY_RANGE;
  const deltas = isAnnual ? [-1000, -500, -300, -100, 0, 100, 300, 500, 1000] : [-100, -50, -30, -10, 0, 10, 30, 50, 100];
  const rows = deltas.map((dlt) => man + dlt).filter((v) => v >= R.from && v <= R.to).map((v) => {
    const r = calcSalary({ amount: v * 10_000, period: isAnnual ? 'annual' : 'monthly' });
    const slug = isAnnual ? salarySlug(v) : wageSlug(v);
    const name = `${isAnnual ? '연봉' : '월급'} ${manLabel(v)}`;
    const cell = v === man ? `<strong>${name}</strong>` : `<a href="${slug}.html">${name}</a>`;
    return `<tr${v === man ? ' class="hit"' : ''}><td>${cell}</td><td class="net">${fmt(r.monthlyNet)}</td><td>${v === man ? '—' : signed(r.monthlyNet - net)}</td><td>${(r.deductionRate * 100).toFixed(1)}%</td></tr>`;
  }).join('');
  return `<table class="data"><thead><tr><th scope="col">${isAnnual ? '연봉' : '월급'}</th><th scope="col">월 실수령액</th><th scope="col">차이</th><th scope="col">공제율</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildPage(man, isAnnual) {
  const amount = man * 10_000;
  const base = { amount, period: isAnnual ? 'annual' : 'monthly' };
  const r = calcSalary(base);
  const d = Object.fromEntries(r.deductions.map((x) => [x.key, x.value]));
  const what = `${isAnnual ? '연봉' : '월급'} ${manLabel(man)}`;
  const slug = isAnnual ? salarySlug(man) : wageSlug(man);
  const ins = d.pension + d.health + d.care + d.employment;
  const tax = d.incomeTax + d.localTax;
  const hourly = r.monthlyGross / 209;
  const minWage = MIN_WAGE[2026];
  const step = isAnnual ? 100 : 10;
  const up = calcSalary({ ...base, amount: amount + step * 10_000 });
  const upGain = up.monthlyNet - r.monthlyNet;
  const upGross = isAnnual ? (step * 10_000) / 12 : step * 10_000;
  const annualNote = isAnnual ? '' : ` 연봉으로는 ${manLabel(man * 12)}(세전)입니다.`;
  const peer = isAnnual ? `<a href="${wageSlug(Math.round(man / 12 / 10) * 10)}.html">월급 ${manLabel(Math.round(man / 12 / 10) * 10)}</a>` : `<a href="${salarySlug(Math.round((man * 12) / 100) * 100)}.html">연봉 ${manLabel(Math.round((man * 12) / 100) * 100)}</a>`;
  const showPeer = isAnnual ? man / 12 >= MONTHLY_RANGE.from && man / 12 <= MONTHLY_RANGE.to : man * 12 >= ANNUAL_RANGE.from && man * 12 <= ANNUAL_RANGE.to;
  const calcLink = `salary.html?${isAnnual ? '' : 'period=monthly&'}amount=${amount}`;

  const faq = [
    [`${what} 실수령액은 얼마인가요?`, `2026년 기준 ${what}의 월 실수령액은 ${fmt(r.monthlyNet)}원입니다. 비과세 식대 20만원, 부양가족 1명(본인) 기준이며 1년이면 약 ${manLabel(Math.round(r.annualNet / 10_000))}입니다.`],
    [`${what}이면 4대보험은 얼마나 떼나요?`, `국민연금 ${fmt(d.pension)}원, 건강보험 ${fmt(d.health)}원, 장기요양 ${fmt(d.care)}원, 고용보험 ${fmt(d.employment)}원으로 매달 합계 ${fmt(ins)}원입니다.`],
    [`${what} 소득세는 얼마인가요?`, `간이세액표 기준 근로소득세 ${fmt(d.incomeTax)}원과 지방소득세 ${fmt(d.localTax)}원, 합계 ${fmt(tax)}원입니다. 부양가족이 많을수록 줄어듭니다.`],
  ];

  const body = `<div class="wrap">
  <header class="page-head">
    <span class="basis-tag">{{BASIS}} 기준 · 간이세액표 2026.3 개정 반영</span>
    <h1>${what} 실수령액</h1>
    <p class="lede">2026년 ${what}의 월 실수령액은 <strong>${fmt(r.monthlyNet)}원</strong>입니다. 세전 월 ${fmt(r.monthlyGross)}원에서 4대보험 ${fmt(ins)}원과 세금 ${fmt(tax)}원을 뺀 금액입니다.${annualNote}</p>
  </header>

  <div class="calc">
    <section class="slip" aria-label="${esc(what)} 공제 내역">
      <div class="slip-head">
        <span class="eyebrow">월 실수령액</span>
        <p class="big-num">${fmt(r.monthlyNet)}<small>원</small></p>
        <p class="slip-sub">연 <b>${manLabel(Math.round(r.annualNet / 10_000))}</b> · 공제율 <b>${(r.deductionRate * 100).toFixed(1)}%</b></p>
      </div>
      <div class="slip-body">
        ${ledgerHtml(r)}
      </div>
      <div class="slip-actions">
        <a class="btn primary" href="${calcLink}">조건 바꿔 계산하기</a>
        <a class="btn" href="salary-table.html">연봉표 전체</a>
      </div>
    </section>

    <div class="panel">
      <h2 class="panel-title">한눈에 보기</h2>
      <dl class="stats boxed">
        <div><dt>세전 월급</dt><dd>${fmt(r.monthlyGross)}</dd></div>
        <div><dt>세후 월급</dt><dd>${fmt(r.monthlyNet)}</dd></div>
        <div><dt>4대보험</dt><dd>${fmt(ins)}</dd></div>
        <div><dt>세금</dt><dd>${fmt(tax)}</dd></div>
        <div><dt>시급 환산 (209시간)</dt><dd>${fmt(hourly)}</dd></div>
        <div><dt>최저임금 대비</dt><dd>${(hourly / minWage).toFixed(2)}배</dd></div>
      </dl>
      <p class="hint">${isAnnual ? '연봉' : '월급'}이 ${manLabel(step)} 오르면 세전 월급은 ${fmt(upGross)}원, 실수령액은 <strong>${fmt(upGain)}원</strong> 늘어납니다 (인상분의 ${((upGain / upGross) * 100).toFixed(0)}%).${showPeer ? ` 비슷한 금액: ${peer}` : ''}</p>
    </div>
  </div>

  <!--ad:middle-->

  <div class="content">
    <section class="prose" aria-labelledby="family-title">
      <h2 id="family-title">부양가족 수별 실수령액</h2>
      <p>4대보험은 부양가족과 관계없이 같고, 소득세만 달라집니다. 8~20세 자녀가 있으면 간이세액표 금액에서 자녀 공제를 추가로 뺍니다.</p>
      <div class="table-wrap">${familyTable(base)}</div>
    </section>

    <section class="prose" aria-labelledby="cond-title">
      <h2 id="cond-title">비과세·계약 조건별 실수령액</h2>
      <p>식대, 자가운전보조금 같은 비과세 수당은 4대보험과 소득세가 붙지 않아 같은 ${isAnnual ? '연봉' : '월급'}이라도 실수령액이 늘어납니다.${isAnnual ? ' 퇴직금이 연봉에 포함된 계약이면 13으로 나눈 금액이 매달 받는 월급입니다.' : ''}</p>
      <div class="table-wrap">${conditionTable(base, isAnnual)}</div>
    </section>

    <section class="prose" aria-labelledby="near-title">
      <h2 id="near-title">비슷한 ${isAnnual ? '연봉' : '월급'}과 비교</h2>
      <div class="table-wrap">${neighborTable(man, isAnnual, r.monthlyNet)}</div>
    </section>

    <section aria-labelledby="faq-title" class="prose">
      <h2 id="faq-title">자주 묻는 질문</h2>
    </section>
    <!--faq-->
    <!--related-->
  </div>
</div>
`;

  return {
    meta: {
      slug,
      kind: 'generated',
      category: 'work',
      parent: isAnnual ? 'salary-table' : 'salary',
      name: `${what} 실수령액`,
      title: `${what} 실수령액 2026 — 월 ${fmt(r.monthlyNet)}원 | 머니셈`,
      description: `2026년 ${what} 월 실수령액은 ${fmt(r.monthlyNet)}원입니다. 국민연금 ${fmt(d.pension)}원, 건강보험 ${fmt(d.health)}원, 장기요양 ${fmt(d.care)}원, 고용보험 ${fmt(d.employment)}원, 소득세 ${fmt(d.incomeTax)}원 공제 내역과 부양가족별 금액을 확인하세요.`,
      priority: man % 500 === 0 || (!isAnnual && man % 50 === 0) ? '0.7' : '0.5',
      faq,
    },
    body,
  };
}

export function generateSalaryPages() {
  return [
    ...range(ANNUAL_RANGE).map((man) => buildPage(man, true)),
    ...range(MONTHLY_RANGE).map((man) => buildPage(man, false)),
  ];
}

