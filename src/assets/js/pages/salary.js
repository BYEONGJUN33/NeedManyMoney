import { calcSalary } from '../calc.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, stepper, radioValue, setRadio,
  readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const amountEl = $('#amount');
const amount = moneyInput(amountEl, update);
const nontax = moneyInput($('#nontax'), update);
const refreshHint = unitHint(amountEl, $('#amount-hint'));
$$('[data-stepper]').forEach((el) => stepper(el, update));
$$('input[type="radio"], #severance').forEach((el) => el.addEventListener('change', onPeriod));

const PRESETS = {
  annual: [30, 35, 40, 50, 60, 80, 100].map((v) => v * 1e6),
  monthly: [250, 300, 350, 400, 500].map((v) => v * 1e4),
};

function renderPresets(period) {
  const box = $('#presets');
  box.replaceChildren(...PRESETS[period].map((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = koUnit(v).replace('원', '');
    b.addEventListener('click', () => { amount.set(v); refreshHint(); update(); });
    return b;
  }));
}

let lastPeriod = 'annual';
function onPeriod() {
  const period = radioValue('period');
  if (period !== lastPeriod) {
    // 기준을 바꾸면 같은 급여를 다른 단위로 보여준다
    const v = amount.get();
    if (v) amount.set(period === 'monthly' ? Math.round(v / 12 / 1e4) * 1e4 : v * 12);
    lastPeriod = period;
    renderPresets(period);
    refreshHint();
  }
  $('#amount-label').textContent = period === 'annual' ? '연봉 (세전)' : '월급 (세전)';
  $('#severance').closest('.switch').hidden = period !== 'annual';
  update();
}

function inputs() {
  const period = radioValue('period');
  return {
    amount: amount.get(),
    period,
    includesSeverance: period === 'annual' && $('#severance').checked,
    nonTaxable: nontax.get(),
    family: Number($('#family').value) || 1,
    children: Math.min(Number($('#children').value) || 0, Math.max(0, (Number($('#family').value) || 1) - 1)),
    ratio: Number(radioValue('ratio')) || 1,
  };
}

let last;
function update() {
  const o = inputs();
  const r = calcSalary(o);
  last = { o, r };
  $('#net').innerHTML = `${fmt(r.monthlyNet)}<small>원</small>`;
  dock('월 예상 실수령액', won(r.monthlyNet));
  $('#net-sub').innerHTML = `연 환산 <b>${koUnit(r.annualNet, { short: true })}</b> · 공제율 <b>${(r.deductionRate * 100).toFixed(1)}%</b>`;

  const ins = r.deductions.slice(0, 4).reduce((s, d) => s + d.value, 0);
  const tax = r.deductions.slice(4).reduce((s, d) => s + d.value, 0);
  const total = r.monthlyGross || 1;
  const [sNet, sIns, sTax] = $$('#split span');
  sNet.style.width = `${(r.monthlyNet / total) * 100}%`;
  sIns.style.width = `${(ins / total) * 100}%`;
  sTax.style.width = `${(tax / total) * 100}%`;

  const notes = {
    pension: '4.75%',
    health: '3.595%',
    care: '건강보험료의 13.14%',
    employment: '0.9%',
    incomeTax: `간이세액표 · 가족 ${o.family}명${o.children ? ` · 자녀 ${o.children}명` : ''}${o.ratio !== 1 ? ` · ${o.ratio * 100}%` : ''}`,
    localTax: '소득세의 10%',
  };
  ledgerRows($('#ledger'), [
    { label: '월 급여 (세전)', value: won(r.monthlyGross), cls: 'gross', note: r.nonTaxable ? `비과세 ${won(r.nonTaxable)} 포함` : '' },
    ...r.deductions.map((d) => ({ label: d.label, value: fmt(d.value), cls: 'minus', note: notes[d.key] })),
    { label: '공제 합계', value: fmt(r.totalDeduction), cls: 'minus' },
    { label: '실수령액', value: won(r.monthlyNet), cls: 'sum' },
  ]);
}

wireShare({
  textFn: () => {
    const { o, r } = last;
    const head = o.period === 'annual' ? `연봉 ${koUnit(o.amount)}` : `월급 ${koUnit(o.amount)}`;
    return [
      `[머니셈] ${head} 실수령액`,
      `월 실수령액: ${won(r.monthlyNet)} (연 ${koUnit(r.annualNet, { short: true })})`,
      ...r.deductions.map((d) => `· ${d.label} ${won(d.value)}`),
      `공제 합계 ${won(r.totalDeduction)} (${(r.deductionRate * 100).toFixed(1)}%)`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { amount: o.amount, period: o.period, family: o.family, children: o.children, nontax: o.nonTaxable };
    if (o.includesSeverance) p.sev = 1;
    if (o.ratio !== 1) p.ratio = o.ratio;
    return p;
  },
});

// 공유 링크로 들어온 값 복원
const q = readParams();
if (q.get('period') === 'monthly') { setRadio('period', 'monthly'); lastPeriod = 'monthly'; }
if (q.get('amount')) amount.set(Number(q.get('amount')) || 0);
if (q.get('family')) $('#family').value = q.get('family');
if (q.get('children')) $('#children').value = q.get('children');
if (q.has('nontax')) nontax.set(Number(q.get('nontax')) || 0);
if (q.get('sev') === '1') $('#severance').checked = true;
if (q.get('ratio')) setRadio('ratio', q.get('ratio'));
renderPresets(lastPeriod);
refreshHint();
onPeriod();
