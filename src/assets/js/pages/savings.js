import { calcSavings } from '../calc.js';
import { INTEREST_TAX } from '../rates.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, radioValue, setRadio, readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const amountEl = $('#amount');
const amount = moneyInput(amountEl, update);
const refreshHint = unitHint(amountEl, $('#amount-hint'));
['#rate', '#months'].forEach((s) => $(s).addEventListener('input', update));
$$('input[type="radio"]').forEach((el) => el.addEventListener('change', onProduct));

let product = 'installment';
function onProduct() {
  const next = radioValue('product');
  if (next !== product) {
    const v = amount.get();
    const n = Number($('#months').value) || 12;
    if (v) amount.set(next === 'deposit' ? v * n : Math.round(v / n / 1e3) * 1e3);
    product = next;
    refreshHint();
  }
  $('#amount-label').textContent = product === 'deposit' ? '예치 금액' : '월 납입액';
  update();
}

const rateVal = () => Math.min(100, Math.max(0, parseFloat($('#rate').value.replace(/[^\d.]/g, '')) || 0));
const monthsVal = () => Math.min(600, Math.max(1, parseInt($('#months').value, 10) || 1));

let last;
function update() {
  const o = {
    product,
    amount: amount.get(),
    annualRate: rateVal(),
    months: monthsVal(),
    compounding: radioValue('comp'),
    taxType: radioValue('tax'),
  };
  const r = calcSavings(o);
  last = { o, r };
  $('#maturity').innerHTML = `${fmt(r.maturity)}<small>원</small>`;
  dock('세후 만기 수령액', won(r.maturity));
  $('#maturity-sub').innerHTML = `세후 이자 <b>${won(r.netInterest)}</b> · ${o.months}개월 · 연 ${o.annualRate}% ${o.compounding === 'monthly' ? '월복리' : '단리'}`;
  ledgerRows($('#ledger'), [
    { label: product === 'deposit' ? '예치 원금' : '납입 원금 합계', value: won(r.principal), cls: 'gross', note: product === 'deposit' ? '' : `${won(o.amount)} × ${o.months}개월` },
    { label: '세전 이자', value: won(r.interest) },
    { label: '이자 과세', value: fmt(r.tax), cls: 'minus', note: INTEREST_TAX[o.taxType].label },
    { label: '세후 이자', value: won(r.netInterest) },
    { label: '만기 수령액', value: won(r.maturity), cls: 'sum' },
  ]);
  // 적금은 같은 이자를 주는 예금 금리로 환산해 비교를 돕는다
  const eq = $('#equiv');
  if (product === 'installment' && r.principal) {
    const eqRate = (r.interest / r.principal) * (12 / o.months) * 100;
    eq.textContent = `납입 원금 ${koUnit(r.principal, { short: true })}을 처음부터 예금에 넣었다면 연 ${eqRate.toFixed(2)}%에서 같은 이자가 나옵니다.`;
  } else {
    eq.textContent = `세후 연 수익률 ${(r.effectiveRate * 100).toFixed(2)}%`;
  }
}

wireShare({
  textFn: () => {
    const { o, r } = last;
    const what = o.product === 'deposit' ? `예금 ${koUnit(o.amount)}` : `적금 월 ${koUnit(o.amount)}`;
    return [
      `[머니셈] ${what} · 연 ${o.annualRate}% · ${o.months}개월 (${o.compounding === 'monthly' ? '월복리' : '단리'})`,
      `세전 이자 ${won(r.interest)} − 세금 ${won(r.tax)} = 세후 이자 ${won(r.netInterest)}`,
      `만기 수령액: ${won(r.maturity)}`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    return { product: o.product, amount: o.amount, rate: o.annualRate, months: o.months, comp: o.compounding, tax: o.taxType };
  },
});

const q = readParams();
if (q.get('product') === 'deposit') { setRadio('product', 'deposit'); product = 'deposit'; }
if (q.get('amount')) amount.set(Number(q.get('amount')) || 0);
if (q.get('rate')) $('#rate').value = q.get('rate');
if (q.get('months')) $('#months').value = q.get('months');
if (q.get('comp')) setRadio('comp', q.get('comp'));
if (q.get('tax')) setRadio('tax', q.get('tax'));
refreshHint();
onProduct();
