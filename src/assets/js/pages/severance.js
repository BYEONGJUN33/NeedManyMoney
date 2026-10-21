import { calcSeverance } from '../calc.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, radioValue, setRadio, readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const wageEl = $('#wage');
const wage = moneyInput(wageEl, update);
const bonus = moneyInput($('#bonus'), update);
const leave = moneyInput($('#leave'), update);
const refreshHint = unitHint(wageEl, $('#wage-hint'));
['#start', '#end'].forEach((s) => $(s).addEventListener('change', update));
$('#end').addEventListener('input', update);
$('#start').addEventListener('input', update);
$$('input[name="wmode"]').forEach((el) => el.addEventListener('change', onMode));

let mode = 'avg';
function onMode() {
  const next = radioValue('wmode');
  if (next !== mode) {
    const v = wage.get();
    if (v) wage.set(next === 'sum' ? v * 3 : Math.round(v / 3));
    mode = next;
    refreshHint();
  }
  $('#wage-label').textContent = mode === 'avg' ? '월 평균 급여 (세전, 수당 포함)' : '최근 3개월 급여 합계 (세전)';
  update();
}

const fmtDate = (s) => s.replace(/-/g, '.');
let last;
function update() {
  const o = {
    start: $('#start').value,
    end: $('#end').value,
    wages3m: mode === 'avg' ? wage.get() * 3 : wage.get(),
    annualBonus: bonus.get(),
    annualLeavePay: leave.get(),
  };
  const r = calcSeverance(o);
  last = { o, r };
  const warn = $('#warn');
  if (r.error) {
    warn.hidden = false;
    warn.className = 'notice bad';
    warn.textContent = r.error;
    $('#net').innerHTML = '0<small>원</small>';
    $('#net-sub').textContent = '';
    $('#ledger').replaceChildren();
    return;
  }
  warn.hidden = r.eligible;
  if (!r.eligible) {
    warn.className = 'notice bad';
    warn.textContent = `재직기간이 ${fmt(r.workDays)}일로 1년(365일) 미만이라 법정 퇴직금 대상이 아닙니다. 같은 급여로 1년을 채우면 약 ${won(r.avgDaily * 30)}을 받을 수 있습니다.`;
  }
  $('#net').innerHTML = `${fmt(r.net)}<small>원</small>`;
  dock('세후 예상 퇴직금', won(r.net));
  $('#net-sub').innerHTML = r.eligible
    ? `세전 퇴직금 <b>${koUnit(r.pay, { short: true })}</b> · 근속 <b>${r.years}년</b>(${fmt(r.workDays)}일)`
    : '1년 이상 근무해야 받을 수 있습니다';
  const tax = r.tax;
  ledgerRows($('#ledger'), [
    { label: '재직일수', value: `${fmt(r.workDays)}일`, note: `${fmtDate(o.start)} ~ ${fmtDate(o.end)}` },
    { label: '3개월 임금 총액', value: won(r.wageSum), note: `산정 기간 ${r.periodDays}일 (상여·연차 3/12 포함)` },
    { label: '1일 평균임금', value: won(r.avgDaily) },
    { label: '퇴직금 (세전)', value: won(r.pay), cls: 'gross', note: '평균임금 × 30일 × 재직일수 ÷ 365' },
    { label: '근속연수공제', value: won(tax.serviceDeduction), note: `근속연수 ${r.years}년` },
    { label: '환산급여', value: won(tax.converted), note: '(퇴직금 − 근속연수공제) × 12 ÷ 근속연수' },
    { label: '과세표준', value: won(tax.taxBase), note: `환산급여공제 ${won(tax.convertedDeduction)}` },
    { label: '퇴직소득세', value: fmt(tax.incomeTax), cls: 'minus' },
    { label: '지방소득세', value: fmt(tax.localTax), cls: 'minus', note: '퇴직소득세의 10%' },
    { label: '세후 퇴직금', value: won(r.net), cls: 'sum' },
  ]);
}

wireShare({
  textFn: () => {
    const { o, r } = last;
    if (r.error) return r.error;
    return [
      `[머니셈] 퇴직금 계산 (${fmtDate(o.start)} ~ ${fmtDate(o.end)}, ${fmt(r.workDays)}일)`,
      `세전 퇴직금: ${won(r.pay)}`,
      `퇴직소득세 ${won(r.tax.incomeTax)} · 지방소득세 ${won(r.tax.localTax)}`,
      `세후 퇴직금: ${won(r.net)}`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { start: o.start, end: o.end, wage3m: o.wages3m };
    if (o.annualBonus) p.bonus = o.annualBonus;
    if (o.annualLeavePay) p.leave = o.annualLeavePay;
    return p;
  },
});

const q = readParams();
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
if (isDate(q.get('start'))) $('#start').value = q.get('start');
if (isDate(q.get('end'))) $('#end').value = q.get('end');
if (q.get('wage3m')) { setRadio('wmode', 'sum'); mode = 'sum'; wage.set(Number(q.get('wage3m')) || 0); }
if (q.get('bonus')) bonus.set(Number(q.get('bonus')) || 0);
if (q.get('leave')) leave.set(Number(q.get('leave')) || 0);
refreshHint();
onMode();
