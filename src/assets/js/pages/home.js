import { calcSalary } from '../calc.js';
import { $, fmt, koUnit, moneyInput, unitHint } from '../ui.js';

const el = $('#q-amount');
const amount = moneyInput(el, update);
unitHint(el, $('#q-hint'));

function update() {
  const v = amount.get();
  const r = calcSalary({ amount: v });
  $('#q-net').innerHTML = `${fmt(r.monthlyNet)}<small>원 / 월</small>`;
  $('#q-sub').innerHTML = `공제 <b>${fmt(r.totalDeduction)}원</b> (${(r.deductionRate * 100).toFixed(1)}%) · 연 <b>${koUnit(r.annualNet, { short: true })}</b>`;
  $('#q-more').href = `salary.html?amount=${v}`;
}

$('#quick').addEventListener('submit', (e) => {
  e.preventDefault();
  window.location.href = $('#q-more').href;
});
update();
