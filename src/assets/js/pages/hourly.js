import { calcHourly, calcSalary } from '../calc.js';
import { MIN_WAGE } from '../rates.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, radioValue, setRadio, readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const LABEL = { hourly: '시급', monthly: '월급 (세전)', annual: '연봉 (세전)' };
const amountEl = $('#amount');
const amount = moneyInput(amountEl, update);
const refreshHint = unitHint(amountEl, $('#amount-hint'));
['#weekly', '#overtime'].forEach((s) => $(s).addEventListener('input', update));
$$('input[type="radio"]').forEach((el) => el.addEventListener('change', onMode));
$$('[data-wage]').forEach((b) => b.addEventListener('click', () => {
  setRadio('mode', 'hourly');
  setRadio('year', b.dataset.wage);
  mode = 'hourly';
  amount.set(MIN_WAGE[b.dataset.wage]);
  refreshHint();
  onMode();
}));

let mode = 'hourly';
function onMode() {
  const next = radioValue('mode');
  if (next !== mode && last) {
    // 단위를 바꾸면 현재 결과를 새 단위로 옮긴다
    const r = last.r;
    amount.set(next === 'hourly' ? Math.round(r.hourly) : next === 'monthly' ? r.monthly : r.annual);
    mode = next;
    refreshHint();
  }
  mode = next;
  $('#amount-label').textContent = LABEL[mode];
  update();
}

const hoursVal = (s, max) => Math.min(max, Math.max(0, parseFloat($(s).value) || 0));

let last;
function update() {
  const o = {
    mode,
    amount: amount.get(),
    weeklyHours: hoursVal('#weekly', 40),
    overtimeHours: hoursVal('#overtime', 52),
    year: Number(radioValue('year')),
  };
  const r = calcHourly(o);
  last = { o, r };

  const headIsMonthly = mode !== 'monthly';
  $('#head-label').textContent = headIsMonthly ? '월급 환산 (세전)' : '시급 환산';
  $('#head').innerHTML = `${fmt(headIsMonthly ? r.monthly : r.hourly)}<small>원</small>`;
  dock($('#head-label').textContent, won(headIsMonthly ? r.monthly : r.hourly));
  $('#head-sub').innerHTML = `연봉 <b>${koUnit(r.annual, { short: true })}</b> · 월 ${r.monthlyHours}시간${r.overtimeMonthlyHours ? ` + 연장 ${r.overtimeMonthlyHours.toFixed(1)}시간` : ''}`;

  const mw = $('#minwage');
  const gap = r.hourly - r.minWage;
  mw.className = `notice ${r.meetsMinWage ? 'good' : 'bad'}`;
  mw.textContent = r.meetsMinWage
    ? (gap < 0.5 ? `${o.year}년 최저임금 ${won(r.minWage)}과 같습니다.` : `${o.year}년 최저임금 ${won(r.minWage)}보다 시간당 ${won(gap)} 많습니다.`)
    : `${o.year}년 최저임금 ${won(r.minWage)}보다 시간당 ${won(-gap)} 적습니다. 같은 근무시간의 최저 월급은 ${won(r.minMonthly)}입니다.`;

  const net = calcSalary({ amount: r.monthly, period: 'monthly', nonTaxable: 0 });
  ledgerRows($('#ledger'), [
    { label: '시급', value: won(r.hourly), cls: 'gross' },
    { label: '주 근무시간', value: `${r.weeklyHours}시간`, note: o.overtimeHours ? `연장 ${o.overtimeHours}시간 별도` : '' },
    { label: '주휴시간', value: `${+r.holidayHours.toFixed(2)}시간`, note: r.holidayHours ? '주 15시간 이상 개근 시' : '주 15시간 미만은 주휴수당 없음' },
    { label: '주휴수당 (주)', value: won(r.weeklyHolidayPay) },
    { label: '주급', value: won(r.weeklyPay), note: '근무 + 주휴 + 연장' },
    { label: '월급', value: won(r.monthly), note: `${r.monthlyHours}시간 기준` },
    { label: '연봉', value: won(r.annual) },
    { label: '월 예상 실수령액', value: won(net.monthlyNet), cls: 'sum', note: '4대보험·소득세 공제, 비과세 0원·부양가족 1명' },
  ]);
  $('#to-salary').href = `salary.html?period=monthly&amount=${r.monthly}&nontax=0`;
}

wireShare({
  textFn: () => {
    const { o, r } = last;
    return [
      `[머니셈] 시급 ${won(r.hourly)} · 주 ${r.weeklyHours}시간`,
      `주휴수당 ${won(r.weeklyHolidayPay)}/주 · 월급 ${won(r.monthly)} (${r.monthlyHours}시간)`,
      `연봉 ${won(r.annual)}`,
      `${o.year}년 최저임금 ${r.meetsMinWage ? '충족' : '미달'}`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { mode: o.mode, amount: o.amount, weekly: o.weeklyHours, year: o.year };
    if (o.overtimeHours) p.ot = o.overtimeHours;
    return p;
  },
});

const q = readParams();
if (LABEL[q.get('mode')]) { setRadio('mode', q.get('mode')); mode = q.get('mode'); }
if (q.get('amount')) amount.set(Number(q.get('amount')) || 0);
if (q.get('weekly')) $('#weekly').value = q.get('weekly');
if (q.get('ot')) $('#overtime').value = q.get('ot');
if (MIN_WAGE[q.get('year')]) setRadio('year', q.get('year'));
refreshHint();
onMode();
