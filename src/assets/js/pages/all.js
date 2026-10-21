import { $, $$ } from '../ui.js';

const items = $$('.cat-index li');
const sections = $$('.cat-index .cat');
const out = $('#q-out');
const norm = (s) => s.toLowerCase().replace(/\s+/g, '');

function filter() {
  const q = norm($('#q').value);
  let shown = 0;
  for (const li of items) {
    const hit = !q || norm(li.textContent).includes(q);
    li.hidden = !hit;
    if (hit) shown += 1;
  }
  for (const s of sections) s.hidden = !$$('li', s).some((li) => !li.hidden);
  out.textContent = q ? (shown ? `${shown}개 계산기` : '맞는 계산기가 없습니다. 다른 단어로 찾아보세요.') : '';
}

$('#q').addEventListener('input', filter);
$('#finder').addEventListener('submit', (e) => {
  e.preventDefault();
  const first = items.find((li) => !li.hidden);
  if (first) window.location.href = $('a', first).href;
});
