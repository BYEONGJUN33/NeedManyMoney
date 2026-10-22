import {
  calcVat, vatOfSupply, splitTotal, INDUSTRIES, ROUNDING_LABELS, SIMPLE_THRESHOLD, EXEMPT_THRESHOLD, CARD_CREDIT_CAP, CARD_CREDIT_SALES_LIMIT,
} from '../calc/vat.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, stepper, radioValue, setRadio,
  readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();

/* ───── 입력 연결 ───── */
const amountEl = $('#amount');
const amount = moneyInput(amountEl, update);
const refreshAmountHint = unitHint(amountEl, $('#amount-hint'));

const gSalesEl = $('#g-sales');
const gSales = moneyInput(gSalesEl, update);
const refreshGSalesHint = unitHint(gSalesEl, $('#g-sales-hint'));
const gBuy = moneyInput($('#g-buy'), update);
const gCard = moneyInput($('#g-card'), update);

const sSalesEl = $('#s-sales');
const sSales = moneyInput(sSalesEl, update);
const refreshSSalesHint = unitHint(sSalesEl, $('#s-sales-hint'));
const sBuy = moneyInput($('#s-buy'), update);
const sCard = moneyInput($('#s-card'), update);

$$('[data-stepper]').forEach((el) => stepper(el, update));
$$('input[name="kind"], input[name="basis"]').forEach((el) => el.addEventListener('change', onMode));
$$('input[name="round"]').forEach((el) => el.addEventListener('change', update));
$('#g-incl').addEventListener('change', onInclusive);

/** 부가세 포함 입력을 켜고 끄면 같은 거래가 되도록 금액을 바꿔 준다 (공급가액 ↔ 합계) */
function onInclusive() {
  const incl = $('#g-incl').checked;
  // 신용카드 발행금액은 원래 부가세 포함 금액이라 그대로 둔다
  for (const ctl of [gSales, gBuy]) {
    const v = ctl.get();
    if (v) ctl.set(incl ? v + vatOfSupply(v) : splitTotal(v).supply);
  }
  refreshGSalesHint();
  update();
}

function syncGeneralLabels() {
  const incl = $('#g-incl').checked;
  $('#g-sales-label').textContent = incl ? '매출 합계 (부가세 포함, 과세기간 합계)' : '매출 공급가액 (과세기간 합계)';
  $('#g-buy-label').textContent = incl ? '공제받는 매입 합계 (부가세 포함)' : '공제받는 매입 공급가액';
}
$('#s-ind').addEventListener('change', update);

const BASIS_LABEL = { supply: '공급가액 (부가세 별도)', total: '합계금액 (부가세 포함)', vat: '부가세' };
const PERCENT = (n) => `${Math.round(n * 100) / 100}%`;
/** 좁은 칸에서 "2억 2,000만원"이 중간에 끊기지 않게 */
const keep = (s) => s.replace(/ /g, '\u00a0');

function chips(box, values, onPick) {
  box.replaceChildren(...values.map((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = koUnit(v).replace('원', '');
    b.addEventListener('click', () => onPick(v));
    return b;
  }));
}
chips($('#presets'), [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000], (v) => {
  amount.set(v); refreshAmountHint(); update();
});
chips($('#s-presets'), [30_000_000, 48_000_000, 60_000_000, 80_000_000, 100_000_000], (v) => {
  sSales.set(v); refreshSSalesHint(); update();
});

/* ───── 모드 ───── */
const currentMode = () => {
  const kind = radioValue('kind');
  return kind === 'convert' ? radioValue('basis') || 'supply' : kind;
};

function onMode() {
  const kind = radioValue('kind');
  $('#g-convert').hidden = kind !== 'convert';
  $('#g-general').hidden = kind !== 'general';
  $('#g-simple').hidden = kind !== 'simple';
  $('#amount-label').textContent = BASIS_LABEL[radioValue('basis')] || BASIS_LABEL.supply;
  update();
}

/** 필수 입력칸이 비어 있으면 ''을 넘겨 계산 모듈이 안내 문구를 돌려주게 한다 */
const required = (el, ctl) => (el.value.trim() === '' ? '' : ctl.get());

function inputs() {
  const mode = currentMode();
  if (mode === 'general') {
    return {
      mode,
      sales: required(gSalesEl, gSales),
      purchases: gBuy.get(),
      inclusive: $('#g-incl').checked,
      card: gCard.get(),
    };
  }
  if (mode === 'simple') {
    const months = Math.round(Number($('#s-months').value));
    return {
      mode,
      industry: $('#s-ind').value,
      sales: required(sSalesEl, sSales),
      purchases: sBuy.get(),
      card: sCard.get(),
      months: Number.isFinite(months) ? Math.min(12, Math.max(1, months)) : 12,
    };
  }
  return { mode, amount: required(amountEl, amount), rounding: radioValue('round') || 'floor' };
}

/* ───── 출력 도우미 ───── */
function setHead(label, value, sub) {
  $('#head-label').textContent = label;
  $('#head').innerHTML = `${fmt(value)}<small>원</small>`;
  $('#head-sub').innerHTML = sub;
  dock(label, won(value));
}
function setNote(id, text, tone = '') {
  const el = $(id);
  el.hidden = !text;
  el.className = `notice vat-note${tone ? ` ${tone}` : ''}`;
  el.textContent = text || '';
}
/** 원 미만이 있는 정확한 값 표기 (소수 둘째 자리까지) */
const exact = (n) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(n);

function showError(msg) {
  const mode = currentMode();
  const label = { supply: '부가세', total: '공급가액', vat: '공급가액', general: '납부할 부가세', simple: '납부할 부가세' }[mode];
  $('#head-label').textContent = label;
  $('#head').innerHTML = '0<small>원</small>';
  $('#head-sub').textContent = '입력값을 확인해 주세요';
  dock(label, '입력 확인');
  setNote('#note', msg, 'bad');
  setNote('#note2', '');
  $('#ledger').replaceChildren();
}

/* ───── 계산·렌더링 ───── */
let last;
function update() {
  syncGeneralLabels();
  const o = inputs();
  const r = calcVat(o);
  last = { o, r };
  if (r.error) { showError(r.error); return; }
  if (r.mode === 'general') renderGeneral(o, r);
  else if (r.mode === 'simple') renderSimple(o, r);
  else renderConvert(o, r);
}

function renderConvert(o, r) {
  const rl = ROUNDING_LABELS[r.rounding];
  setNote('#note2', '');
  if (r.mode === 'supply') {
    setHead('부가세', r.vat, `합계 <b>${won(r.total)}</b> · 공급가액 ${won(r.supply)}`);
    const frac = !Number.isInteger(r.exactVat);
    ledgerRows($('#ledger'), [
      { label: '공급가액', value: won(r.supply), cls: 'gross', note: '부가세 별도 금액' },
      { label: '부가세', value: fmt(r.vat), cls: 'plus', note: frac ? `공급가액 × 10% = ${exact(r.exactVat)}원 → ${rl}` : '공급가액 × 10%' },
      { label: '합계금액', value: won(r.total), cls: 'sum', note: '공급가액 + 부가세' },
    ]);
    setNote('#note', '');
    return;
  }
  if (r.mode === 'total') {
    setHead('공급가액', r.supply, `부가세 <b>${won(r.vat)}</b> · 합계 ${won(r.total)}`);
    const frac = !Number.isInteger(r.exactVat);
    ledgerRows($('#ledger'), [
      { label: '합계금액', value: won(r.total), cls: 'gross', note: '부가세 포함 금액 (공급대가)' },
      { label: '부가세', value: fmt(r.vat), cls: 'minus', note: frac ? `합계 × 10/110 = ${exact(r.exactVat)}원 → ${rl}` : '합계 × 10/110' },
      { label: '공급가액', value: won(r.supply), cls: 'sum', note: '합계금액 − 부가세' },
    ]);
    setNote('#note', r.consistent ? '' : `합계 ${won(r.total)}은 ${rl} 기준으로 딱 나눠지지 않습니다. 공급가액 ${won(r.supply)}에 10%를 곱하면 부가세가 ${won(r.recheckVat)}(합계 ${won(r.supply + r.recheckVat)})이 되어 1원 차이가 납니다.`);
    return;
  }
  // 부가세 → 공급가액
  setHead('공급가액', r.supply, `합계 <b>${won(r.total)}</b> · 부가세 ${won(r.vat)}`);
  ledgerRows($('#ledger'), [
    { label: '부가세', value: won(r.vat), cls: 'gross' },
    { label: '공급가액', value: won(r.supply), note: '부가세 × 10' },
    { label: '합계금액', value: won(r.total), cls: 'sum', note: '부가세 × 11' },
  ]);
  setNote('#note', r.supplyMin === r.supplyMax ? '' : `부가세를 ${rl}해서 적은 금액이라면 실제 공급가액은 ${fmt(r.supplyMin)}~${fmt(r.supplyMax)}원 중 하나일 수 있습니다.`);
}

function cardNote(r) {
  const parts = [`${won(r.card)} × 1.3%`];
  if (r.cardCapped) parts.push(`연 ${koUnit(CARD_CREDIT_CAP)} 한도`);
  return parts.join(' · ');
}

function renderGeneral(o, r) {
  const label = r.refund ? '환급받을 세액' : '납부할 부가세';
  const value = r.refund ? r.refundAmount : r.pay;
  setHead(label, value, `매출세액 <b>${won(r.salesTax)}</b> − 매입세액 <b>${won(r.purchaseTax)}</b>`);
  const rows = [
    { label: '매출세액', value: won(r.salesTax), cls: 'gross', note: r.inclusive ? `부가세 포함 매출 ${won(o.sales)} × 10/110` : `매출 공급가액 ${won(r.salesSupply)} × 10%` },
    { label: '매입세액', value: fmt(r.purchaseTax), cls: 'minus', note: r.inclusive ? `부가세 포함 매입 ${won(o.purchases)} × 10/110` : `매입 공급가액 ${won(r.purchaseSupply)} × 10%` },
  ];
  if (r.card > 0) {
    rows.push({ label: r.refund ? '환급세액' : '납부세액', value: r.netTax < 0 ? `−${fmt(-r.netTax)}원` : won(r.netTax), note: '매출세액 − 매입세액' });
    rows.push({ label: '신용카드 발행세액공제', value: fmt(r.cardCredit), cls: 'minus', note: cardNote(r) });
  }
  rows.push({ label, value: won(value), cls: 'sum', note: value !== Math.abs(r.due) ? `${won(Math.abs(r.due))}에서 10원 미만 버림` : '' });
  ledgerRows($('#ledger'), rows);

  if (r.refund) setNote('#note', `매입세액이 매출세액보다 ${won(-r.due)} 많아 그만큼 돌려받습니다.${r.card > 0 ? ' 신용카드 발행세액공제는 환급되지 않습니다.' : ''}`, 'good');
  else if (r.cardCut > 0) setNote('#note', `신용카드 발행세액공제 ${won(r.cardCut)}은 납부세액을 넘어 공제되지 않습니다.`);
  else setNote('#note', '');
  setNote('#note2', r.card > 0 ? `신용카드 발행세액공제는 개인사업자(직전 연도 공급가액 ${koUnit(CARD_CREDIT_SALES_LIMIT)} 이하)만 받을 수 있습니다. 법인이라면 신용카드 금액을 0으로 두세요.` : '');
}

function renderSimple(o, r) {
  const ind = r.industry;
  $('#s-ind-hint').textContent = `${ind.label} · 매출 대비 ${PERCENT(r.effectiveRate)}`;
  setHead(r.exempt ? '납부할 부가세 (납부면제)' : '납부할 부가세', r.pay, `부가가치율 <b>${ind.rate}%</b> · 매출 대비 <b>${PERCENT(r.effectiveRate)}</b>`);
  const rows = [
    { label: '공급대가', value: won(r.sales), cls: 'gross', note: r.months < 12 ? `${r.months}개월 매출 · 12개월 환산 ${keep(koUnit(r.annualized))}` : '1년 매출, 부가세 포함' },
    { label: '납부세액', value: won(r.baseTax), note: `공급대가 × ${ind.rate}% × 10%` },
    { label: '매입 수취세액공제', value: fmt(r.purchaseCredit), cls: 'minus', note: `매입 ${won(r.purchases)} × 0.5%${r.purchaseCredit < r.purchaseCreditRaw ? ' · 납부세액까지만' : ''}` },
  ];
  if (r.card > 0) rows.push({ label: '신용카드 발행세액공제', value: fmt(r.cardCredit), cls: 'minus', note: `${cardNote(r)}${r.cardCredit < Math.min(r.cardCreditRaw, CARD_CREDIT_CAP) ? ' · 납부세액까지만' : ''}` });
  if (r.exempt && r.taxAfterCredit > 0) rows.push({ label: '납부의무 면제', value: fmt(r.taxAfterCredit), cls: 'minus', note: `공급대가 ${koUnit(EXEMPT_THRESHOLD)} 미만` });
  rows.push({ label: '납부할 세액', value: won(r.pay), cls: 'sum', note: r.pay !== r.due ? `${won(r.due)}에서 10원 미만 버림` : '' });
  ledgerRows($('#ledger'), rows);

  if (r.exempt) {
    setNote('#note', `${r.months < 12 ? '12개월로 환산한 ' : '1년 '}공급대가가 ${koUnit(EXEMPT_THRESHOLD)} 미만이라 납부의무가 면제됩니다. 세금은 내지 않지만 다음 해 1월 25일까지 확정신고는 해야 합니다.`, 'good');
  } else if (r.overThreshold) {
    setNote('#note', ind.key === 'rental'
      ? `부동산임대업은 직전 연도 공급대가가 ${koUnit(r.threshold)} 이상이면 간이과세를 적용받을 수 없습니다. 올해 공급대가가 기준 이상이므로 다음 해 7월 1일부터 일반과세자가 됩니다.`
      : `올해 공급대가가 ${koUnit(SIMPLE_THRESHOLD)} 이상이므로 다음 해 7월 1일부터 일반과세자가 됩니다. 올해분은 간이과세자 방식으로 신고합니다.`, 'bad');
  } else if (r.creditCut > 0) {
    setNote('#note', `공제세액 중 ${won(r.creditCut)}은 납부세액을 넘어 공제되지 않습니다. 간이과세자는 환급이 없습니다.`);
  } else {
    setNote('#note', '');
  }
  const g = r.general;
  const gText = g.refund ? `${won(g.refund)} 환급` : won(g.pay);
  setNote('#note2', `같은 매출·매입을 일반과세자 방식(매출세액 ${won(g.salesTax)} − 매입세액 ${won(g.purchaseTax)}${r.card > 0 ? ' − 신용카드 공제' : ''})으로 계산하면 ${gText}입니다.`);
}

/* ───── 공유 ───── */
const MODE_NAME = { supply: '공급가액 → 부가세', total: '합계 → 공급가액', vat: '부가세 → 공급가액', general: '일반과세자 납부세액', simple: '간이과세자 납부세액' };

wireShare({
  textFn: () => {
    const { o, r } = last;
    if (r.error) return `[머니셈] 부가세 계산 — ${r.error}`;
    if (r.mode === 'general') {
      return [
        `[머니셈] 일반과세자 부가세 (${r.inclusive ? '부가세 포함 금액 입력' : '공급가액 입력'})`,
        `매출세액 ${won(r.salesTax)} − 매입세액 ${won(r.purchaseTax)}`,
        ...(r.card > 0 ? [`신용카드 발행세액공제 ${won(r.cardCredit)}`] : []),
        r.refund ? `환급받을 세액: ${won(r.refundAmount)}` : `납부할 세액: ${won(r.pay)}`,
      ].join('\n');
    }
    if (r.mode === 'simple') {
      return [
        `[머니셈] 간이과세자 부가세 (${r.industry.label} ${r.industry.rate}%)`,
        `공급대가 ${won(r.sales)} × ${r.industry.rate}% × 10% = ${won(r.baseTax)}`,
        `매입 수취세액공제 ${won(r.purchaseCredit)}${r.card > 0 ? ` · 신용카드 발행세액공제 ${won(r.cardCredit)}` : ''}`,
        `납부할 세액: ${won(r.pay)}${r.exempt ? ' (4,800만원 미만 납부면제)' : ''}`,
      ].join('\n');
    }
    return [
      `[머니셈] 부가세 계산 (${MODE_NAME[r.mode]}, ${ROUNDING_LABELS[r.rounding]})`,
      `공급가액 ${won(r.supply)}`,
      `부가세 ${won(r.vat)}`,
      `합계 ${won(r.total)}`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { mode: o.mode };
    if (o.mode === 'general') {
      Object.assign(p, { sales: o.sales, buy: o.purchases });
      if (o.inclusive) p.incl = 1;
      if (o.card) p.card = o.card;
    } else if (o.mode === 'simple') {
      Object.assign(p, { ind: o.industry, sales: o.sales, buy: o.purchases });
      if (o.card) p.card = o.card;
      if (o.months !== 12) p.months = o.months;
    } else {
      p.amount = o.amount;
      if (o.rounding !== 'floor') p.round = o.rounding;
    }
    return p;
  },
});

/* ───── 공유 링크로 들어온 값 복원 ───── */
const q = readParams();
const qMode = q.get('mode');
const num = (k) => Math.max(0, Math.floor(Number(q.get(k)) || 0));
// moneyInput.set(0)은 칸을 비우므로 0은 그대로 보여 준다
const setMoney = (ctl, sel, k) => { if (q.has(k)) { ctl.set(num(k)); if (!num(k)) $(sel).value = '0'; } };
if (['supply', 'total', 'vat'].includes(qMode)) {
  setRadio('kind', 'convert');
  setRadio('basis', qMode);
  setMoney(amount, '#amount', 'amount');
  if (ROUNDING_LABELS[q.get('round')]) { setRadio('round', q.get('round')); if (q.get('round') !== 'floor') $('#round-box').open = true; }
} else if (qMode === 'general') {
  setRadio('kind', 'general');
  setMoney(gSales, '#g-sales', 'sales');
  setMoney(gBuy, '#g-buy', 'buy');
  setMoney(gCard, '#g-card', 'card');
  if (q.get('incl') === '1') $('#g-incl').checked = true;
  if (num('card')) $('#g-more').open = true;
} else if (qMode === 'simple') {
  setRadio('kind', 'simple');
  if (INDUSTRIES.some((x) => x.key === q.get('ind'))) $('#s-ind').value = q.get('ind');
  setMoney(sSales, '#s-sales', 'sales');
  setMoney(sBuy, '#s-buy', 'buy');
  setMoney(sCard, '#s-card', 'card');
  if (q.has('months')) $('#s-months').value = String(Math.min(12, Math.max(1, num('months') || 12)));
  if (num('card') || (q.has('months') && num('months') < 12)) $('#s-more').open = true;
}
refreshAmountHint();
refreshGSalesHint();
refreshSSalesHint();
onMode();
