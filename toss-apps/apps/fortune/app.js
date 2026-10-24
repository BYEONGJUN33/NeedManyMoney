// 오늘의 띠별 운세 화면. 내 띠를 기억해 두고 다음에 열면 바로 오늘 운세를 보여 준다.
import { ANIMALS, animalOfYear, fortune, todayKST } from './fortune.js';
import { store, mountBanner, rewarded, share, toast } from '../../kit/kit.js';

const $ = (s) => document.querySelector(s);
const today = todayKST();
let animal = null;
let unlocked = { date: '', animals: [] };
let adWaitTimer = 0;

const ad = rewarded(() => renderUnlock());

function dateLabel() {
  const [y, m, d] = today.split('-').map(Number);
  const wd = '일월화수목금토'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 ${wd}요일`;
}

function renderPicker() {
  $('#animals').innerHTML = ANIMALS.map((a, i) => {
    const years = [];
    for (let y = 1975; y <= 2010; y += 1) if (animalOfYear(y) === i) years.push(y);
    return `<button type="button" data-a="${i}" aria-pressed="${i === animal}">${a.name}띠<small>${years.map((y) => String(y).slice(2)).join('·')}</small></button>`;
  }).join('');
}

const isUnlocked = () => !ad.supported || (unlocked.date === today && unlocked.animals.includes(animal));

function renderUnlock() {
  if (animal == null) return;
  const open = isUnlocked();
  $('#detail').hidden = !open;
  $('#detail-locked').hidden = open;
  const btn = $('#unlock');
  btn.disabled = !ad.ready && !btn.dataset.free;
  btn.textContent = btn.dataset.free ? '자세한 운세 보기' : ad.ready ? '광고 보고 자세한 운세 보기' : '광고 불러오는 중…';
}

function renderResult() {
  const f = fortune(today, animal);
  $('#who').textContent = `${f.animal}띠 · 오늘의 운세 지수`;
  $('#score').textContent = f.score;
  $('#meter').style.width = `${f.score}%`;
  $('#intro').textContent = `${f.intro}에게`;
  $('#overall').textContent = f.overall;
  $('#keyword').textContent = f.keyword;
  $('#swatch').style.background = f.hex;
  $('#color').textContent = f.color;
  $('#number').textContent = f.number;
  $('#direction').textContent = f.direction;
  $('#item').textContent = f.item;
  $('#advice').textContent = `오늘의 한마디 · ${f.advice}`;
  $('#detail').innerHTML = f.detail.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#pick').hidden = true;
  $('#result').hidden = false;
  renderUnlock();
  // 광고가 20초 안에 준비되지 않으면 기다리게 하지 않고 그냥 보여 준다
  clearTimeout(adWaitTimer);
  if (ad.supported && !ad.ready) adWaitTimer = setTimeout(() => { if (!ad.ready) { $('#unlock').dataset.free = '1'; renderUnlock(); } }, 20_000);
}

function choose(i) {
  animal = i;
  store.set('animal', i);
  renderResult();
  scrollTo({ top: 0, behavior: 'smooth' });
}

function unlockToday() {
  if (unlocked.date !== today) unlocked = { date: today, animals: [] };
  if (!unlocked.animals.includes(animal)) unlocked.animals.push(animal);
  store.set('unlocked', unlocked);
  renderUnlock();
}

async function main() {
  $('#date').textContent = dateLabel();
  const saved = await store.get('animal', null);
  unlocked = await store.get('unlocked', unlocked);
  if (Number.isInteger(saved) && saved >= 0 && saved < 12) { animal = saved; renderResult(); } else { renderPicker(); $('#pick').hidden = false; }

  $('#year').addEventListener('input', (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = v;
    const y = Number(v);
    const hint = $('#year-hint');
    if (v.length < 4) { hint.textContent = ''; return; }
    if (y < 1920 || y > 2026) { hint.textContent = '1920~2026 사이로 입력해 주세요'; return; }
    const i = animalOfYear(y);
    hint.textContent = `${y}년생은 ${ANIMALS[i].name}띠예요`;
    choose(i);
  });
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.a) choose(Number(t.dataset.a));
    else if (t.id === 'change') {
      renderPicker();
      $('#pick-title').textContent = '다른 띠를 골라 보세요';
      $('#pick').hidden = false;
      $('#result').hidden = true;
      scrollTo({ top: 0 });
    } else if (t.id === 'unlock') {
      if (t.dataset.free) { unlockToday(); return; }
      const ok = await ad.show();
      if (ok) unlockToday();
      else toast('광고를 끝까지 보면 자세한 운세가 열려요');
    } else if (t.id === 'share') {
      const f = fortune(today, animal);
      share(`오늘 ${f.animal}띠 운세 지수는 ${f.score}점! 행운의 색은 ${f.color}, 키워드는 "${f.keyword}"예요. 내 띠 운세도 확인해 보세요`);
    }
  });
  mountBanner($('#ad-slot'));
}

main();
