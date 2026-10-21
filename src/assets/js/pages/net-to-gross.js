import {
  calcNetToGross, netToGrossTable, NEGOTIATION_UNIT, TABLE_TARGETS,
} from '../calc/net-to-gross.js';
import { INSURANCE, LOCAL_TAX_RATE } from '../rates.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, stepper, readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const targetEl = $('#target');
const target = moneyInput(targetEl, update);
const nontax = moneyInput($('#nontax'), update);
const refreshHint = unitHint(targetEl, $('#target-hint'));
$$('[data-stepper]').forEach((el) => stepper(el, update));
$('#severance').addEventListener('change', update);

$('#presets').replaceChildren(...[250, 300, 350, 400, 500].map((v) => v * 1e4).map((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = koUnit(v).replace('원', '');
  b.addEventListener('click', () => { target.set(v); refreshHint(); update(); });
  return b;
}));

const pct = (rate) => `${+(rate * 100).toFixed(4)}%`;
const UNIT_LABEL = koUnit(NEGOTIATION_UNIT).replace('원', '');

function inputs() {
  return {
    targetNet: target.get(),
    nonTaxable: nontax.get(),
    family: Number($('#family').value) || 1,
    children: Number($('#children').value) || 0,
    includesSeverance: $('#severance').checked,
  };
}

function conditionText(r) {
  return [
    `비과세 ${won(r.nonTaxable)}`,
    `부양가족 ${r.family}명${r.children ? ` (8~20세 자녀 ${r.children}명)` : ''}`,
    r.includesSeverance ? '퇴직금 포함 연봉' : '퇴직금 별도',
  ].join(' · ');
}

function renderTable(o, r) {
  const rows = netToGrossTable(o);
  $('#ntg-table tbody').replaceChildren(...rows.map((x) => {
    const tr = document.createElement('tr');
    tr.dataset.target = String(x.targetNet);
    if (r && !r.error && x.targetNet === r.targetNet) tr.className = 'hit';
    tr.innerHTML = x.error
      ? `<td>${koUnit(x.targetNet)}</td><td colspan="4">—</td>`
      : `<td>${koUnit(x.targetNet)}</td><td>${fmt(x.monthlyGross)}</td><td class="net">${fmt(x.annualGross)}</td><td>${koUnit(x.negotiationAnnual)}</td><td>${(x.deductionRate * 100).toFixed(1)}%</td>`;
    return tr;
  }));
}

let last;
function update() {
  const o = inputs();
  const r = calcNetToGross(o);
  last = { o, r };
  const err = $('#error');
  const warn = $('#warn');
  const nego = $('#nego');

  if (r.error) {
    err.textContent = r.error;
    err.hidden = false;
    nego.hidden = true;
    warn.hidden = true;
    $('#annual').innerHTML = '—';
    $('#annual-sub').textContent = '목표 금액을 넣으면 필요한 세전 연봉을 보여 줍니다.';
    $('#ledger').replaceChildren();
    dock('필요한 세전 연봉', '—');
    $('#to-salary').href = 'salary.html';
    // 표는 목표와 상관없이 조건만으로 만들 수 있으므로 정리된 조건을 받아 그대로 보여 준다
    const c = calcNetToGross({ ...o, targetNet: TABLE_TARGETS[0] });
    $('#table-cond').textContent = `${conditionText(c)} 기준. 연봉은 실수령액이 목표 이상이 되는 가장 작은 금액입니다.`;
    renderTable(o, null);
    return;
  }
  err.hidden = true;

  const s = r.salary;
  $('#annual').innerHTML = `${fmt(r.annualGross)}<small>원</small>`;
  dock('필요한 세전 연봉', won(r.annualGross));
  $('#annual-sub').innerHTML = `세전 월급 <b>${won(r.monthlyGross)}</b> · 연봉 약 <b>${koUnit(r.annualGross, { short: true })}</b> · 공제율 <b>${(s.deductionRate * 100).toFixed(1)}%</b>`;

  const n = r.negotiation;
  nego.className = 'notice good';
  nego.hidden = false;
  // .notice는 flex라 글 전체를 span 하나로 감싸야 굵은 글씨가 따로 떨어지지 않는다
  nego.innerHTML = `<span>연봉을 ${UNIT_LABEL}원 단위로 정한다면 <b>${koUnit(n.annualGross)}</b> 이상을 제시하세요. 이때 월 실수령액은 ${won(n.monthlyNet)}${n.surplus ? `으로 목표보다 ${won(n.surplus)} 많습니다` : '입니다'}.</span>`;

  if (r.childrenClamped) {
    warn.hidden = false;
    warn.textContent = `8~20세 자녀는 부양가족 수(본인 포함)에 들어갑니다. 부양가족 ${r.family}명이면 자녀는 ${r.children}명까지라 ${r.children}명으로 계산했습니다.`;
  } else {
    warn.hidden = true;
  }

  const { pension, health, care, employment } = INSURANCE;
  const notes = {
    pension: pct(pension.rate),
    health: pct(health.rate),
    care: `건강보험료의 ${((care.incomeRate / health.totalRate) * 100).toFixed(2)}%`,
    employment: pct(employment.rate),
    incomeTax: `간이세액표 · 가족 ${r.family}명${r.children ? ` · 자녀 ${r.children}명` : ''}`,
    localTax: `소득세의 ${pct(LOCAL_TAX_RATE)}`,
  };
  const grossNote = [
    r.nonTaxable ? `비과세 ${won(Math.min(r.nonTaxable, r.monthlyGross))} 포함` : '',
    r.includesSeverance ? `연봉 ÷ 13 (퇴직금 몫 ${won(r.severancePart)})` : '연봉 ÷ 12',
  ].filter(Boolean).join(' · ');
  ledgerRows($('#ledger'), [
    { label: '세전 월급', value: won(r.monthlyGross), cls: 'gross', note: grossNote },
    ...s.deductions.map((d) => ({ label: d.label, value: fmt(d.value), cls: 'minus', note: notes[d.key] })),
    { label: '공제 합계', value: fmt(s.totalDeduction), cls: 'minus' },
    {
      label: '월 실수령액',
      value: won(s.monthlyNet),
      cls: 'sum',
      note: r.surplus ? `목표 ${won(r.targetNet)}보다 ${won(r.surplus)} 많음` : `목표 ${won(r.targetNet)} 달성`,
    },
  ]);

  const p = new URLSearchParams({
    amount: r.annualGross, period: 'annual', family: r.family, children: r.children, nontax: r.nonTaxable,
  });
  if (r.includesSeverance) p.set('sev', '1');
  $('#to-salary').href = `salary.html?${p}`;

  $('#table-cond').textContent = `${conditionText(r)} 기준. 연봉은 실수령액이 목표 이상이 되는 가장 작은 금액입니다.`;
  renderTable(o, r);
}

wireShare({
  textFn: () => {
    const { r } = last;
    if (r.error) return `[머니셈] 실수령액 역산: ${r.error}`;
    const n = r.negotiation;
    return [
      `[머니셈] 월 실수령액 ${koUnit(r.targetNet)} 역산`,
      `필요한 세전 연봉: ${won(r.annualGross)} (월 ${won(r.monthlyGross)})`,
      `${UNIT_LABEL}원 단위 연봉: ${koUnit(n.annualGross)} → 월 실수령 ${won(n.monthlyNet)}`,
      `조건: ${conditionText(r)}`,
      ...r.salary.deductions.map((d) => `· ${d.label} ${won(d.value)}`),
      `월 실수령액: ${won(r.salary.monthlyNet)}`,
    ].join('\n');
  },
  paramsFn: () => {
    const { o, r } = last;
    const p = {
      target: o.targetNet,
      nontax: o.nonTaxable,
      family: r.error ? o.family : r.family,
      children: r.error ? o.children : r.children,
    };
    if (o.includesSeverance) p.sev = 1;
    return p;
  },
});

// 공유 링크로 들어온 값 복원
const q = readParams();
if (q.get('target')) target.set(Number(q.get('target')) || 0);
if (q.has('nontax')) nontax.set(Number(q.get('nontax')) || 0);
const intParam = (key, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(q.get(key))) || lo));
if (q.get('family')) $('#family').value = String(intParam('family', 1, 20));
if (q.get('children')) $('#children').value = String(intParam('children', 0, 10));
if (q.get('sev') === '1') $('#severance').checked = true;
refreshHint();
update();
