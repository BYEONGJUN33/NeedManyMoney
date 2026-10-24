// 연봉 실수령액 계산기: 머니셈(src/assets/js/calc.js)의 검증된 계산을 그대로 쓴다.
import { calcSalary } from '../../../src/assets/js/calc.js';
import { store, mountBanner, share, nf, won } from '../../kit/kit.js';

const $ = (s) => document.querySelector(s);
const MAN = 10_000;
const QUICK = { annual: [3000, 4000, 5000, 6000, 8000], monthly: [250, 300, 350, 400, 500] };
const state = { period: 'annual', amount: 4500, nonTax: 20, family: 1, children: 0, sev: false };

const digits = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
/** 만 원 단위 숫자를 "1억 2,300만 원"처럼 읽기 쉽게 */
function manText(man) {
  if (!man) return '';
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  return `${eok ? `${nf.format(eok)}억 ` : ''}${rest ? `${nf.format(rest)}만 ` : ''}원`.replace(/\s+원$/, ' 원');
}

function calc(amountMan = state.amount) {
  return calcSalary({
    amount: amountMan * MAN, period: state.period, includesSeverance: state.period === 'annual' && state.sev,
    nonTaxable: state.nonTax * MAN, family: state.family, children: Math.min(state.children, state.family - 1),
  });
}

function render() {
  const r = calc();
  $('#amount-label').textContent = state.period === 'annual' ? '연봉' : '월급 (세전)';
  $('#amount-hint').textContent = manText(state.amount);
  $('#net').innerHTML = `${nf.format(r.monthlyNet)}<small>원</small>`;
  $('#net-sub').textContent = r.monthlyGross
    ? `세전 월 ${won(r.monthlyGross)} 중 ${won(r.totalDeduction)}(${(r.deductionRate * 100).toFixed(1)}%)을 떼요 · 1년이면 ${won(r.annualNet)}`
    : '금액을 입력해 주세요';
  $('#bar-net').style.width = `${r.monthlyGross ? (r.monthlyNet / r.monthlyGross) * 100 : 0}%`;
  $('#rows').innerHTML = [
    ...r.deductions.map((d) => `<div><dt>${d.label}</dt><dd class="minus">−${nf.format(d.value)}원</dd></div>`),
    `<div class="total"><dt>공제 합계</dt><dd>−${nf.format(r.totalDeduction)}원</dd></div>`,
  ].join('');
  const steps = state.period === 'annual' ? [100, 300, 500, 1000] : [10, 30, 50, 100];
  $('#raise').innerHTML = steps.map((s) => {
    const up = calc(state.amount + s).monthlyNet - r.monthlyNet;
    return `<div><dt>${state.period === 'annual' ? '연봉' : '월급'} +${nf.format(s)}만 원</dt><dd class="plus">월 +${nf.format(up)}원</dd></div>`;
  }).join('');
  $('#quick').innerHTML = QUICK[state.period].map((v) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === state.amount}">${nf.format(v)}만</button>`).join('');
  $('#family').textContent = state.family;
  $('#children').textContent = state.children;
  $('#sev').hidden = state.period !== 'annual';
  $('#sev').setAttribute('aria-pressed', String(state.sev));
  document.querySelectorAll('[data-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.period === state.period)));
  store.set('input', state);
}

function bindMoney(input, key, max) {
  input.addEventListener('input', () => {
    const v = Math.min(max, digits(input.value));
    state[key] = v;
    input.value = v ? nf.format(v) : '';
    render();
  });
}

async function main() {
  Object.assign(state, await store.get('input', {}));
  const amount = $('#amount');
  const nontax = $('#nontax');
  amount.value = nf.format(state.amount);
  nontax.value = nf.format(state.nonTax);
  bindMoney(amount, 'amount', 999_999);
  bindMoney(nontax, 'nonTax', 9_999);
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.period && t.dataset.period !== state.period) {
      // 연봉 ↔ 월급을 바꾸면 금액도 대략 환산해 둔다
      state.amount = t.dataset.period === 'monthly' ? Math.round(state.amount / 12) : state.amount * 12;
      state.period = t.dataset.period;
      amount.value = nf.format(state.amount);
    } else if (t.dataset.v) {
      state.amount = Number(t.dataset.v);
      amount.value = nf.format(state.amount);
    } else if (t.dataset.step) {
      const k = t.dataset.step;
      const lo = k === 'family' ? 1 : 0;
      state[k] = Math.max(lo, Math.min(11, state[k] + Number(t.dataset.d)));
      if (state.children > state.family - 1) state.children = Math.max(0, state.family - 1);
    } else if (t.id === 'sev') {
      state.sev = !state.sev;
    } else if (t.id === 'share') {
      const r = calc();
      share(`${state.period === 'annual' ? '연봉' : '월급'} ${manText(state.amount)}이면 한 달 실수령액은 ${won(r.monthlyNet)}이에요 (2026년 기준)`);
      return;
    } else return;
    render();
  });
  render();
  mountBanner($('#ad-slot'));
}

main();
