import { calcRaise, raiseTable, nextSalary, RAISE_STEPS } from '../calc/raise.js';
import {
  $, $$, fmt, won, koUnit, moneyInput, unitHint, stepper, radioValue, setRadio,
  readParams, wireShare, ledgerRows, resultDock,
} from '../ui.js';

const dock = resultDock();
const curEl = $('#current');
const nextEl = $('#next');
const current = moneyInput(curEl, update);
const next = moneyInput(nextEl, update);
const nontax = moneyInput($('#nontax'), update);
const refreshCurHint = unitHint(curEl, $('#current-hint'));
const refreshNextHint = unitHint(nextEl, $('#next-hint'));
$$('[data-stepper]').forEach((el) => stepper(el, update));
['#rate', '#inflation'].forEach((s) => $(s).addEventListener('input', update));
$('#severance').addEventListener('change', update);
$$('input[name="mode"]').forEach((el) => el.addEventListener('change', onMode));

/* ───── 표기 도우미 ───── */
const nf2 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
/** 소수 둘째 자리까지, 음수는 − 기호 */
function pct(n) {
  const v = Math.round((n || 0) * 100) / 100;
  if (v === 0) return '0';
  return `${v < 0 ? '−' : ''}${nf2.format(Math.abs(v))}`;
}
/** 계산으로 나온 비율(실수령·실질 인상률)은 소수 둘째 자리까지 고정 */
function pct2(n) {
  const v = Math.round((n || 0) * 100) / 100;
  if (v === 0) return '0';
  return `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;
}
const signed = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '0');
const signedWon = (n) => `${signed(n)}원`;
const signedMan = (n) => (n === 0 ? '0원' : `${n > 0 ? '+' : '−'}${koUnit(Math.abs(n), { short: true })}`);
const tone = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '');

/** 인상률 입력: 쉼표·% 제거, 유니코드 마이너스 허용. 비어 있으면 '' (계산 모듈이 오류로 처리) */
function readDecimal(el) {
  const s = el.value.replace(/[−–]/g, '-').replace(/[^\d.-]/g, '');
  if (s === '' || s === '-' || s === '.') return '';
  return Number(s);
}

/* ───── 프리셋 ───── */
$('#presets').replaceChildren(...[30, 40, 50, 60, 80, 100].map((v) => v * 1e6).map((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = koUnit(v).replace('원', '');
  b.addEventListener('click', () => {
    // 현재 연봉을 바꾸면 인상률은 유지하고 인상 후 연봉을 같은 비율로 옮긴다
    const r = last && !last.r.error ? last.r.rate : null;
    current.set(v);
    if (mode === 'amount' && r != null) next.set(nextSalary(v, r));
    refreshCurHint();
    refreshNextHint();
    update();
  });
  return b;
}));
$('#rate-chips').replaceChildren(...[3, 5, 7, 10].map((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = `${v}%`;
  b.addEventListener('click', () => { $('#rate').value = String(v); update(); });
  return b;
}));

/* ───── 모드 전환: 지금 결과를 새 입력칸으로 옮긴다 ───── */
let mode = 'amount';
function onMode() {
  const nextMode = radioValue('mode') === 'rate' ? 'rate' : 'amount';
  if (nextMode !== mode && last && !last.r.error) {
    if (nextMode === 'rate') $('#rate').value = String(Math.round(last.r.rate * 100) / 100);
    else { next.set(last.r.next); refreshNextHint(); }
  }
  mode = nextMode;
  $('#next-field').hidden = mode !== 'amount';
  $('#rate-field').hidden = mode !== 'rate';
  update();
}

function inputs() {
  const family = Math.max(1, Number($('#family').value) || 1);
  const inf = readDecimal($('#inflation'));
  return {
    mode,
    current: current.get(),
    next: next.get(),
    rate: readDecimal($('#rate')),
    nonTaxable: nontax.get(),
    family,
    children: Math.min(Math.max(0, Number($('#children').value) || 0), family - 1),
    includesSeverance: $('#severance').checked,
    inflation: inf === '' ? null : inf,
  };
}

const optsNote = (o) => `비과세 월 ${koUnit(o.nonTaxable)} · 부양가족 ${o.family}명${o.children ? ` · 자녀 ${o.children}명` : ''}${o.includesSeverance ? ' · 퇴직금 포함 연봉' : ''}`;

function showError(o, msg) {
  const note = $('#note');
  note.className = 'notice bad raise-note';
  note.textContent = msg;
  $('#head-label').textContent = mode === 'rate' ? '인상 후 연봉' : '연봉 인상률';
  $('#head').innerHTML = mode === 'rate' ? '0<small>원</small>' : '0<small>%</small>';
  $('#head-sub').textContent = '입력값을 확인해 주세요';
  $('#net-rate').textContent = '−';
  $('#net-diff').textContent = '−';
  $('#net-rate').className = '';
  $('#net-diff').className = '';
  $('#split').hidden = true;
  $('#legend').hidden = true;
  $('#ledger').replaceChildren();
  $('#compare tbody').replaceChildren();
  $('#steps tbody').replaceChildren();
  $('#compare-hint').textContent = '';
  $('#steps-hint').textContent = '현재 연봉을 넣으면 인상률별 실수령액이 나옵니다.';
  dock(mode === 'rate' ? '인상 후 연봉' : '연봉 인상률', '입력 확인');
}

let last;
function update() {
  const o = inputs();
  const r = calcRaise(o);
  last = { o, r };
  if (r.error) { showError(o, r.error); return; }

  // 전표 머리: 모드에 따라 인상률 또는 인상 후 연봉
  const rateLabel = r.isCut ? '연봉 삭감률' : '연봉 인상률';
  if (mode === 'rate') {
    $('#head-label').textContent = '인상 후 연봉';
    $('#head').innerHTML = `${fmt(r.next)}<small>원</small>`;
    $('#head-sub').innerHTML = `${r.isCut ? '삭감률' : '인상률'} <b>${pct(Math.abs(r.rate))}%</b> · 연봉 <b>${signedMan(r.grossAnnualDiff)}</b> · 세전 월급 <b>${signedWon(r.grossMonthlyDiff)}</b>`;
    dock('인상 후 연봉', won(r.next));
  } else {
    $('#head-label').textContent = rateLabel;
    $('#head').innerHTML = `${pct(Math.abs(r.rate))}<small>%</small>`;
    $('#head-sub').innerHTML = `연봉 <b>${signedMan(r.grossAnnualDiff)}</b> · 세전 월급 <b>${signedWon(r.grossMonthlyDiff)}</b>`;
    dock(rateLabel, `${pct(Math.abs(r.rate))}%`);
  }

  const netRateEl = $('#net-rate');
  netRateEl.textContent = r.netRate == null ? '−' : `${pct2(r.netRate)}%`;
  netRateEl.className = tone(r.netMonthlyDiff);
  const netDiffEl = $('#net-diff');
  netDiffEl.textContent = signedWon(r.netMonthlyDiff);
  netDiffEl.className = tone(r.netMonthlyDiff);

  // 세전 월급 증가분이 실수령·4대보험·세금으로 나뉘는 막대 (같은 방향일 때만)
  const g = Math.abs(r.grossMonthlyDiff);
  const parts = [r.netMonthlyDiff, r.insuranceDiff, r.taxDiff].map((v) => (Math.sign(v) === Math.sign(r.grossMonthlyDiff) ? Math.abs(v) : 0));
  const showSplit = g > 0;
  $('#split').hidden = !showSplit;
  $('#legend').hidden = !showSplit;
  if (showSplit) {
    const [sNet, sIns, sTax] = $$('#split span');
    sNet.style.width = `${(parts[0] / g) * 100}%`;
    sIns.style.width = `${(parts[1] / g) * 100}%`;
    sTax.style.width = `${(parts[2] / g) * 100}%`;
    const word = r.grossMonthlyDiff > 0 ? '증가' : '감소';
    const legend = $$('#legend span');
    legend[0].lastChild.textContent = `실수령 ${word}`;
    legend[1].lastChild.textContent = `4대보험 ${word}`;
    legend[2].lastChild.textContent = `세금 ${word}`;
  }

  const note = $('#note');
  const insTax = r.insuranceDiff + r.taxDiff;
  if (r.grossMonthlyDiff > 0) {
    note.className = 'notice raise-note';
    note.textContent = `세전 월급이 ${won(r.grossMonthlyDiff)} 늘면 그중 ${won(r.netMonthlyDiff)}(${(r.keepShare * 100).toFixed(1)}%)이 실수령액으로 남고, 4대보험 ${won(r.insuranceDiff)}과 소득세·지방소득세 ${won(r.taxDiff)}이 더 빠집니다.`;
  } else if (r.grossMonthlyDiff < 0) {
    note.className = 'notice bad raise-note';
    note.textContent = `세전 월급이 ${won(-r.grossMonthlyDiff)} 줄면 실수령액은 ${won(-r.netMonthlyDiff)} 줄어듭니다. 4대보험과 세금도 합계 ${won(Math.max(0, -insTax))} 함께 줄어듭니다.`;
  } else {
    note.className = 'notice raise-note';
    note.textContent = r.grossAnnualDiff === 0 ? '현재 연봉과 인상 후 연봉이 같습니다.' : '연봉 차이가 작아 월 급여(원 미만 버림)는 그대로입니다.';
  }

  const rows = [
    { label: '현재 연봉', value: won(r.current), cls: 'gross' },
    { label: '인상 후 연봉', value: won(r.next), note: `${r.isCut ? '삭감률' : '인상률'} ${pct(Math.abs(r.rate))}% · ${signedMan(r.grossAnnualDiff)}` },
    { label: '인상 전 월 실수령액', value: won(r.before.monthlyNet), note: `세전 월 ${won(r.before.monthlyGross)}` },
    { label: '인상 후 월 실수령액', value: won(r.after.monthlyNet), note: `세전 월 ${won(r.after.monthlyGross)}` },
  ];
  const diffRow = (label, v, note) => (v >= 0
    ? { label: `늘어난 ${label}`, value: fmt(v), cls: 'minus', note }
    : { label: `줄어든 ${label}`, value: `+${fmt(-v)}`, note });
  rows.push(diffRow('4대보험', r.insuranceDiff, '국민연금·건강·장기요양·고용'));
  rows.push(diffRow('소득세·지방소득세', r.taxDiff, '간이세액표 기준'));
  if (r.realRate != null) {
    rows.push({ label: '실질 인상률', value: `${pct2(r.realRate)}%`, note: `물가상승률 ${pct(r.inflation)}% 입력 기준` });
  }
  rows.push({ label: '월 실수령 증가액', value: signedWon(r.netMonthlyDiff), cls: 'sum', note: `연 ${signedWon(r.netAnnualDiff)}` });
  ledgerRows($('#ledger'), rows);

  // 인상 전후 급여명세 비교
  const tr = (cells, cls) => {
    const el = document.createElement('tr');
    if (cls) el.className = cls;
    el.innerHTML = cells.join('');
    return el;
  };
  const diffCell = (v) => `<td class="${tone(v)}">${signed(v)}</td>`;
  $('#compare tbody').replaceChildren(
    tr([`<td>월 급여 (세전)</td><td>${fmt(r.before.monthlyGross)}</td><td>${fmt(r.after.monthlyGross)}</td>`, diffCell(r.grossMonthlyDiff)]),
    tr([`<td>과세 급여</td><td>${fmt(r.before.taxable)}</td><td>${fmt(r.after.taxable)}</td>`, diffCell(r.after.taxable - r.before.taxable)]),
    ...r.items.map((it) => tr([`<td>${it.label}</td><td>${fmt(it.before)}</td><td>${fmt(it.after)}</td>`, `<td>${signed(it.diff)}</td>`])),
    tr([`<td>공제 합계</td><td>${fmt(r.before.totalDeduction)}</td><td>${fmt(r.after.totalDeduction)}</td>`, `<td>${signed(r.after.totalDeduction - r.before.totalDeduction)}</td>`]),
    tr([`<td>월 실수령액</td><td class="net">${fmt(r.before.monthlyNet)}</td><td class="net">${fmt(r.after.monthlyNet)}</td>`, diffCell(r.netMonthlyDiff)], 'hit'),
  );
  $('#compare-hint').textContent = `${koUnit(r.current)} → ${koUnit(r.next)} · ${optsNote(o)} 기준`;

  // 인상률별 표 (+ 지금 입력한 인상률이 목록에 없으면 한 줄 더)
  const base = { current: r.current, nonTaxable: o.nonTaxable, family: o.family, children: o.children, includesSeverance: o.includesSeverance };
  const list = raiseTable(base).map((x) => ({ ...x, mine: Math.abs(x.rate - r.rate) < 1e-9 }));
  if (!list.some((x) => x.mine) && r.grossAnnualDiff !== 0) {
    list.push({ rate: r.rate, next: r.next, monthlyNet: r.after.monthlyNet, netMonthlyDiff: r.netMonthlyDiff, netAnnualDiff: r.netAnnualDiff, netRate: r.netRate, mine: true });
    list.sort((a, b) => a.rate - b.rate);
  }
  $('#steps tbody').replaceChildren(...list.map((x) => tr([
    `<td>${pct(x.rate)}%${x.mine && !RAISE_STEPS.includes(x.rate) ? ' <span class="hint">입력값</span>' : ''}</td>`,
    `<td>${fmt(x.next)}</td>`,
    `<td class="net">${signed(x.netMonthlyDiff)}</td>`,
    `<td>${x.netRate == null ? '−' : `${pct2(x.netRate)}%`}</td>`,
    `<td>${fmt(x.monthlyNet)}</td>`,
    `<td>${signed(x.netAnnualDiff)}</td>`,
  ], x.mine ? 'hit' : '')));
  const allLower = list.every((x) => x.rate <= 0 || (x.netRate != null && x.netRate < x.rate));
  $('#steps-hint').textContent = `현재 연봉 ${koUnit(r.current)} · ${optsNote(o)} 기준.${allLower ? ' 실수령 인상률은 모두 세전 인상률보다 낮습니다.' : ''}`;

  const sp = new URLSearchParams({ amount: r.next, period: 'annual', family: o.family, children: o.children, nontax: o.nonTaxable });
  if (o.includesSeverance) sp.set('sev', '1');
  $('#to-salary').href = `salary.html?${sp}`;
}

wireShare({
  textFn: () => {
    const { o, r } = last;
    if (r.error) return `[머니셈] 연봉 인상률 계산 — ${r.error}`;
    const lines = [
      `[머니셈] 연봉 인상률 계산 (${optsNote(o)})`,
      `현재 연봉 ${won(r.current)} → 인상 후 ${won(r.next)}`,
      `${r.isCut ? '삭감률' : '인상률'} ${pct(Math.abs(r.rate))}% (연봉 ${signedWon(r.grossAnnualDiff)})`,
      `월 실수령액 ${won(r.before.monthlyNet)} → ${won(r.after.monthlyNet)} (${signedWon(r.netMonthlyDiff)})`,
      `실수령 기준 인상률 ${r.netRate == null ? '−' : `${pct2(r.netRate)}%`} · 연 실수령 ${signedWon(r.netAnnualDiff)}`,
    ];
    if (r.realRate != null) lines.push(`실질 인상률 ${pct2(r.realRate)}% (물가상승률 ${pct(r.inflation)}% 입력)`);
    return lines.join('\n');
  },
  paramsFn: () => {
    const { o } = last;
    const p = { mode: o.mode, cur: o.current, family: o.family, children: o.children, nontax: o.nonTaxable };
    if (o.mode === 'rate') p.rate = o.rate;
    else p.next = o.next;
    if (o.includesSeverance) p.sev = 1;
    if (o.inflation != null) p.inf = o.inflation;
    return p;
  },
});

// 공유 링크로 들어온 값 복원
const q = readParams();
if (q.get('mode') === 'rate') { setRadio('mode', 'rate'); mode = 'rate'; }
if (q.get('cur')) current.set(Number(q.get('cur')) || 0);
if (q.get('next')) next.set(Number(q.get('next')) || 0);
if (q.has('rate')) $('#rate').value = q.get('rate');
if (q.has('nontax')) nontax.set(Number(q.get('nontax')) || 0);
if (q.get('family')) $('#family').value = q.get('family');
if (q.get('children')) $('#children').value = q.get('children');
if (q.get('sev') === '1') $('#severance').checked = true;
if (q.has('inf')) $('#inflation').value = q.get('inf');
// 기본값과 다른 추가 조건이 링크에 있으면 접힌 칸을 펼쳐 보여준다
const custom = (k, def) => q.has(k) && q.get(k) !== def;
if (custom('nontax', '200000') || custom('family', '1') || custom('children', '0') || q.get('sev') === '1' || q.has('inf')) {
  $('details.more').open = true;
}
refreshCurHint();
refreshNextHint();
onMode();
