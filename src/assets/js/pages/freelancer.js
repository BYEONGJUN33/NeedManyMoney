import {
  calcFreelancer, compareTypes, nominalRate, EXPENSE_RATES, DEFAULT_EXPENSE_RATE, BUSINESS_RATE_PCT, OTHER_RATE_PCT,
  OTHER_MIN_INCOME, LOCAL_RATE_PCT,
} from '../calc/freelancer.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, radioValue, setRadio, readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const amountEl = $('#amount');
const amount = moneyInput(amountEl, update);
const refreshHint = unitHint(amountEl, $('#amount-hint'));
$$('input[name="type"], input[name="mode"], input[name="expense"]').forEach((el) => el.addEventListener('change', update));

const pct = (r) => `${+(r * 100).toFixed(2)}%`;
const TYPE_HINT = {
  business: '계속·반복해서 독립적으로 일하는 프리랜서 (강사, 작가, 디자이너, 개발자, 배달 등)',
  other: '고용관계 없이 일시적으로 받은 강연료·원고료·심사료·상금·사례금 등',
};
const EXPENSE_HINT = {
  60: '강연료·원고료·인세·자문료처럼 일시적으로 받은 대가 (소득세법 시행령 제87조)',
  80: '공익법인이 주무관청 승인을 받아 주는 상금, 여러 사람이 순위를 겨루는 대회 상금, 주택입주 지체상금',
  0: '사례금처럼 필요경비 의제 규정이 없는 기타소득',
};
const LABEL = {
  business: '사업소득',
  other: (p) => `기타소득 · 필요경비 ${p ? `${p}%` : '없음'}`,
};
const typeLabel = (type, p) => (type === 'other' ? LABEL.other(p) : LABEL.business);

$('#presets').replaceChildren(...[1e5, 3e5, 5e5, 1e6, 2e6, 3e6, 5e6].map((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = koUnit(v).replace('원', '');
  b.addEventListener('click', () => { amount.set(v); refreshHint(); update(); });
  return b;
}));

function inputs() {
  return {
    type: radioValue('type') || 'business',
    mode: radioValue('mode') || 'gross',
    expenseRate: Number(radioValue('expense') ?? DEFAULT_EXPENSE_RATE),
    amount: amount.get(),
  };
}

function renderCompare(gross, r) {
  const rows = compareTypes(gross);
  const current = r && !r.error ? (r.type === 'other' ? `other-${r.expenseRate}` : 'business') : '';
  $('#compare tbody').replaceChildren(...rows.map((x) => {
    const tr = document.createElement('tr');
    tr.dataset.key = x.key;
    if (x.key === current) tr.className = 'hit';
    tr.innerHTML = `<td>${typeLabel(x.type, x.expenseRate)} <span class="rate">${pct(x.rate)}</span></td><td>${fmt(x.incomeTax)}</td><td>${fmt(x.localTax)}</td><td>${fmt(x.totalTax)}</td><td class="net">${fmt(x.net)}</td>`;
    return tr;
  }));
  $('#compare-cond').textContent = `지급액 ${won(gross)} 기준. 같은 금액이라도 어떤 소득으로 받느냐에 따라 떼는 세금이 다릅니다.`;
}

function noteFor(r) {
  if (r.type === 'other' && r.exemptMin) {
    return {
      cls: 'notice good',
      html: `<span>기타소득금액 ${won(r.income)}이 건별 ${won(OTHER_MIN_INCOME)} 이하라 과세최저한에 해당해 원천징수가 없습니다. 필요경비 ${r.expenseRate ? `${r.expenseRate}%` : '없음'} 기준으로 지급액 <b>${won(r.exemptLimit)}</b>까지 비과세입니다.</span>`,
    };
  }
  if (r.mode === 'net' && r.alternatives.length) {
    return {
      cls: 'notice',
      html: `<span>10원 미만 끝수를 버리기 때문에 세전 <b>${r.alternatives.map(won).join(', ')}</b>${r.alternatives.length > 1 ? '도' : '으로도'} 실수령액이 ${won(r.net)}이 됩니다. 실수령액 ÷ (1 − ${pct(r.rate)})에 가까운 ${won(r.gross)}을 보여 줍니다.</span>`,
    };
  }
  if (r.type === 'business' && r.incomeTax > 0 && r.incomeTax < 1000) {
    return {
      cls: 'notice',
      html: '<span>2024년 7월 1일 지급분부터 인적용역 사업소득은 원천징수세액이 1,000원 미만이어도 뗍니다 (소득세법 시행령 제149조의3).</span>',
    };
  }
  if (r.type === 'other' && r.mode === 'gross' && r.gross <= r.exemptLimit * 1.2) {
    return {
      cls: 'notice',
      html: `<span>기타소득금액이 건별 ${won(OTHER_MIN_INCOME)}을 넘어 과세됩니다. 지급액 ${won(r.exemptLimit)} 이하는 과세최저한으로 원천징수가 없습니다.</span>`,
    };
  }
  return null;
}

let last;
function update() {
  const o = inputs();
  const r = calcFreelancer(o);
  last = { o, r };
  const isNet = o.mode === 'net';
  const isOther = o.type === 'other';

  $('#expense-box').hidden = !isOther;
  $('#type-hint').textContent = TYPE_HINT[o.type] || TYPE_HINT.business;
  $('#expense-hint').textContent = EXPENSE_HINT[o.expenseRate] ?? EXPENSE_HINT[DEFAULT_EXPENSE_RATE];
  $('#amount-label').textContent = isNet ? '받을 실수령액' : '지급액 (세전)';
  const headLabel = isNet ? '필요한 세전 금액' : '실수령액';
  $('#head-label').textContent = headLabel;

  const err = $('#error');
  const note = $('#note');
  if (r.error) {
    err.textContent = r.error;
    err.hidden = false;
    note.hidden = true;
    $('#head').innerHTML = '—';
    $('#head-sub').textContent = isNet ? '받을 실수령액을 넣으면 세전 금액을 보여 줍니다.' : '지급액을 넣으면 실수령액을 보여 줍니다.';
    $('#ledger').replaceChildren();
    dock(headLabel, '—');
    renderCompare(1_000_000, null);
    return;
  }
  err.hidden = true;

  const headValue = isNet ? r.gross : r.net;
  $('#head').innerHTML = `${fmt(headValue)}<small>원</small>`;
  dock(headLabel, won(headValue));
  $('#head-sub').innerHTML = isNet
    ? `실수령액 <b>${won(r.net)}</b> · 원천징수 <b>${won(r.totalTax)}</b> (${pct(r.rate)})`
    : `원천징수 <b>${won(r.totalTax)}</b> · 지급액의 <b>${pct(r.effectiveRate)}</b>`;

  const n = noteFor(r);
  if (n) {
    note.className = n.cls;
    // .notice는 flex라 글 전체를 span 하나로 감싸야 굵은 글씨가 떨어지지 않는다
    note.innerHTML = n.html;
    note.hidden = false;
  } else {
    note.hidden = true;
  }

  const rows = [{ label: '지급액 (세전)', value: won(r.gross), cls: 'gross', note: isNet ? `실수령액 ${won(r.amount)}에서 역산` : '' }];
  if (isOther) {
    rows.push(
      { label: '필요경비', value: won(r.expense), note: r.expenseRate ? `지급액의 ${r.expenseRate}% (의제)` : '의제 필요경비 없음' },
      { label: '기타소득금액', value: won(r.income), note: r.exemptMin ? `건별 ${won(OTHER_MIN_INCOME)} 이하 → 과세최저한` : '지급액 − 필요경비' },
    );
  }
  // 0원은 "−0"으로 보이지 않게 빼기 표시를 하지 않는다
  const minus = (v) => (v > 0 ? 'minus' : '');
  rows.push(
    { label: '소득세', value: fmt(r.incomeTax), cls: minus(r.incomeTax), note: isOther ? `기타소득금액 × ${OTHER_RATE_PCT}%` : `지급액 × ${BUSINESS_RATE_PCT}%` },
    { label: '지방소득세', value: fmt(r.localTax), cls: minus(r.localTax), note: `소득세 × ${LOCAL_RATE_PCT}%` },
    { label: '원천징수 합계', value: fmt(r.totalTax), cls: minus(r.totalTax), note: `10원 미만 절사 · 명목 ${pct(nominalRate(r.type, r.expenseRate))}` },
    { label: '실수령액', value: won(r.net), cls: 'sum' },
  );
  ledgerRows($('#ledger'), rows);
  renderCompare(r.gross, r);
}

wireShare({
  textFn: () => {
    const { r } = last;
    if (r.error) return `[머니셈] 3.3% 계산기: ${r.error}`;
    const head = r.mode === 'net'
      ? `실수령액 ${won(r.net)}을 받으려면 세전 ${won(r.gross)}`
      : `지급액 ${won(r.gross)} → 실수령액 ${won(r.net)}`;
    return [
      `[머니셈] 3.3% 계산기 (${typeLabel(r.type, r.expenseRate)})`,
      head,
      ...(r.type === 'other' ? [`· 기타소득금액 ${won(r.income)}${r.exemptMin ? ' (과세최저한)' : ''}`] : []),
      `· 소득세 ${won(r.incomeTax)}`,
      `· 지방소득세 ${won(r.localTax)}`,
      `원천징수 합계 ${won(r.totalTax)} (${pct(r.effectiveRate)})`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { amount: o.amount, type: o.type, mode: o.mode };
    if (o.type === 'other') p.exp = o.expenseRate;
    return p;
  },
});

// 공유 링크로 들어온 값 복원
const q = readParams();
if (['business', 'other'].includes(q.get('type'))) setRadio('type', q.get('type'));
if (['gross', 'net'].includes(q.get('mode'))) setRadio('mode', q.get('mode'));
if (q.has('exp') && EXPENSE_RATES.includes(Number(q.get('exp')))) setRadio('expense', String(Number(q.get('exp'))));
if (q.get('amount')) amount.set(Math.max(0, Math.floor(Number(q.get('amount')) || 0)));
refreshHint();
update();
