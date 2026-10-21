import { $, $$, koUnit, moneyInput } from '../ui.js';

const rows = $$('#table-box tbody tr');
const out = $('#find-out');
const find = moneyInput($('#find'), locate);

function locate() {
  const v = find.get();
  rows.forEach((tr) => tr.classList.remove('hit'));
  if (!v) { out.textContent = '연봉을 입력하면 가장 가까운 행으로 이동합니다.'; return; }
  let best = rows[0];
  let gap = Infinity;
  for (const tr of rows) {
    const d = Math.abs(Number(tr.dataset.annual) - v);
    if (d < gap) { gap = d; best = tr; }
  }
  best.classList.add('hit');
  const box = $('#table-box');
  box.scrollTop = best.offsetTop - box.clientHeight / 2;
  out.innerHTML = gap === 0
    ? `${koUnit(v)} 행을 표시했습니다.`
    : `가장 가까운 ${koUnit(Number(best.dataset.annual))} 행을 표시했습니다. 정확한 금액은 <a href="salary.html?amount=${v}">계산기</a>에서 확인하세요.`;
}

$('#finder').addEventListener('submit', (e) => { e.preventDefault(); locate(); });
