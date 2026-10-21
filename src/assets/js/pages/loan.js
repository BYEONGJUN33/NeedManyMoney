import { calcLoan } from '../calc.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, radioValue, setRadio, readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const METHODS = { annuity: '원리금균등', principal: '원금균등', bullet: '만기일시' };

const pEl = $('#principal');
const principal = moneyInput(pEl, update);
const refreshHint = unitHint(pEl, $('#principal-hint'));
['#rate', '#years', '#grace'].forEach((s) => $(s).addEventListener('input', update));
$('#term-unit').addEventListener('change', update);
$$('input[name="method"]').forEach((el) => el.addEventListener('change', update));

$('#presets').replaceChildren(...[3e7, 1e8, 2e8, 3e8, 5e8].map((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = koUnit(v).replace('원', '');
  b.addEventListener('click', () => { principal.set(v); refreshHint(); update(); });
  return b;
}));

const rateVal = () => Math.min(100, Math.max(0, parseFloat($('#rate').value.replace(/[^\d.]/g, '')) || 0));
const monthsVal = () => Math.min(600, Math.max(1, Math.round((parseFloat($('#years').value) || 0) * Number($('#term-unit').value)) || 1));

let last;
function update() {
  const o = {
    principal: principal.get(),
    annualRate: rateVal(),
    months: monthsVal(),
    method: radioValue('method'),
    graceMonths: Math.max(0, parseInt($('#grace').value, 10) || 0),
  };
  $('#grace-box').hidden = o.method === 'bullet';
  const r = calcLoan(o);
  last = { o, r };

  const label = o.method === 'principal' ? '첫 달 상환액' : o.method === 'bullet' ? '월 이자' : r.graceMonths ? '거치 후 월 상환액' : '월 상환액';
  $('#pay-label').textContent = label;
  const headline = o.method === 'bullet' ? r.firstPayment : o.method === 'principal' ? r.schedule[r.graceMonths]?.payment ?? r.firstPayment : r.regularPayment;
  $('#pay').innerHTML = `${fmt(headline)}<small>원</small>`;
  dock(label, won(headline));
  $('#pay-sub').innerHTML = `총 이자 <b>${koUnit(r.totalInterest, { short: true })}</b> · 원금 대비 <b>${r.principal ? ((r.totalInterest / r.principal) * 100).toFixed(1) : 0}%</b>`;

  const rows = [
    { label: '대출 원금', value: won(r.principal), cls: 'gross' },
    { label: '상환 방식', value: METHODS[o.method], note: `${r.months}개월${r.graceMonths ? ` (거치 ${r.graceMonths}개월)` : ''} · 연 ${o.annualRate}%` },
  ];
  if (r.graceMonths) rows.push({ label: '거치기간 월 이자', value: won(r.firstPayment) });
  if (o.method === 'principal') rows.push({ label: '마지막 달 상환액', value: won(r.lastPayment) });
  if (o.method === 'bullet') rows.push({ label: '만기 상환액', value: won(r.lastPayment), note: '원금 + 마지막 달 이자' });
  rows.push(
    { label: '총 이자', value: won(r.totalInterest), cls: 'minus' },
    { label: '총 상환액', value: won(r.totalPayment), cls: 'sum' },
  );
  ledgerRows($('#ledger'), rows);

  // 방식 비교
  $('#compare tbody').replaceChildren(...Object.keys(METHODS).map((m) => {
    const c = calcLoan({ ...o, method: m });
    const tr = document.createElement('tr');
    if (m === o.method) tr.className = 'hit';
    tr.innerHTML = `<td>${METHODS[m]}</td><td>${fmt(c.firstPayment)}</td><td>${fmt(c.lastPayment)}</td><td>${fmt(c.totalInterest)}</td><td>${fmt(c.totalPayment)}</td>`;
    return tr;
  }));

  // 상환 스케줄
  const frag = document.createDocumentFragment();
  for (const x of r.schedule) {
    const tr = document.createElement('tr');
    if (x.month % 12 === 0 && x.month !== r.months) tr.className = 'year-end';
    tr.innerHTML = `<td>${x.month}회${x.month % 12 === 0 ? ` <span class="hint">${x.month / 12}년</span>` : ''}</td><td>${fmt(x.payment)}</td><td>${fmt(x.principal)}</td><td>${fmt(x.interest)}</td><td>${fmt(x.balance)}</td>`;
    frag.append(tr);
  }
  $('#schedule tbody').replaceChildren(frag);
}

wireShare({
  textFn: () => {
    const { o, r } = last;
    return [
      `[머니셈] 대출 ${koUnit(r.principal)} · 연 ${o.annualRate}% · ${r.months}개월 · ${METHODS[o.method]}`,
      `${$('#pay-label').textContent}: ${$('#pay').textContent}`,
      `총 이자: ${won(r.totalInterest)}`,
      `총 상환액: ${won(r.totalPayment)}`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { principal: o.principal, rate: o.annualRate, months: o.months, method: o.method };
    if (o.graceMonths) p.grace = o.graceMonths;
    return p;
  },
});

const q = readParams();
if (q.get('principal')) principal.set(Number(q.get('principal')) || 0);
if (q.get('rate')) $('#rate').value = q.get('rate');
if (q.get('months')) {
  const m = Number(q.get('months')) || 12;
  if (m % 12 === 0) { $('#years').value = m / 12; $('#term-unit').value = '12'; } else { $('#years').value = m; $('#term-unit').value = '1'; }
}
if (METHODS[q.get('method')]) setRadio('method', q.get('method'));
if (q.get('grace')) { $('#grace').value = q.get('grace'); $('#grace-box').open = true; }
refreshHint();
update();
