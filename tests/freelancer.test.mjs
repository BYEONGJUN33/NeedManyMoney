import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  calcFreelancer, withholding, grossCandidates, compareTypes, nominalRate, exemptLimit,
  BUSINESS_RATE_PCT, OTHER_RATE_PCT, LOCAL_RATE_PCT, EXPENSE_RATES, OTHER_MIN_INCOME, SMALL_TAX_LIMIT,
  OTHER_SEPARATE_LIMIT, PROPOSED_2027_BUSINESS_RATE_PCT, MAX_AMOUNT, TABLE_AMOUNTS,
} from '../src/assets/js/calc/freelancer.js';
import { LOCAL_TAX_RATE } from '../src/assets/js/rates.js';
import meta from '../src/pages/freelancer.meta.mjs';

const nf = new Intl.NumberFormat('ko-KR');
const f = (n) => nf.format(n);
const html = await readFile(new URL('../src/pages/freelancer.html', import.meta.url), 'utf8');
const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
const text = article.replace(/<[^>]+>/g, '');

test('기준값: 법령 세율·요율', () => {
  assert.equal(BUSINESS_RATE_PCT, 3); // 소득세법 제129조제1항제3호
  assert.equal(OTHER_RATE_PCT, 20); // 소득세법 제129조제1항제6호라목
  assert.equal(LOCAL_RATE_PCT, 10); // 지방세법 제103조의13
  assert.equal(LOCAL_RATE_PCT, LOCAL_TAX_RATE * 100);
  assert.deepEqual(EXPENSE_RATES, [60, 80, 0]); // 소득세법 시행령 제87조
  assert.equal(OTHER_MIN_INCOME, 50_000); // 소득세법 제84조
  assert.equal(SMALL_TAX_LIMIT, 1_000); // 소득세법 제86조
  assert.equal(nominalRate('business'), 0.033);
  assert.equal(nominalRate('other', 60), 0.088);
  assert.equal(nominalRate('other', 80), 0.044);
  assert.equal(nominalRate('other', 0), 0.22);
});

test('국세청 예시: 사업소득 5,000,000원 × 3/100 = 150,000원', () => {
  const w = withholding(5_000_000);
  assert.equal(w.incomeTax, 150_000);
  assert.equal(w.localTax, 15_000);
  assert.equal(w.totalTax, 165_000);
  assert.equal(w.net, 4_835_000);
  const r = calcFreelancer({ amount: 5_000_000 });
  assert.equal(r.net, 4_835_000);
  assert.equal(r.effectiveRate, 0.033);
  // 역산하면 5,000,000원으로 돌아온다
  assert.equal(calcFreelancer({ mode: 'net', amount: 4_835_000 }).gross, 5_000_000);
});

test('국세청 예시: 강연료 125,000원은 과세최저한, 125,000원 초과는 지급액 × 8.8%', () => {
  // 125,000 − 필요경비 75,000(60%) = 기타소득금액 50,000 → 과세최저한
  const a = withholding(125_000, 'other', 60);
  assert.equal(a.expense, 75_000);
  assert.equal(a.income, 50_000);
  assert.equal(a.exemptMin, true);
  assert.equal(a.totalTax, 0);
  assert.equal(a.net, 125_000);
  const b = withholding(125_001, 'other', 60);
  assert.equal(b.exemptMin, false);
  assert.equal(b.incomeTax, 10_000);
  assert.equal(b.localTax, 1_000);
  // 지급액 × 8.8% (지방소득세 포함)
  for (const g of [500_000, 1_000_000, 2_500_000, 10_000_000]) {
    assert.equal(withholding(g, 'other', 60).totalTax, g * 0.088, `${g}`);
  }
  assert.equal(withholding(1_000_000, 'other', 60).net, 912_000);
  assert.equal(exemptLimit(60), 125_000);
});

test('국세청 안내: 인적용역 사업소득은 2024.7.1 이후 1,000원 미만도 원천징수 (소액부징수 예외)', () => {
  const w = withholding(30_000);
  assert.equal(w.incomeTax, 900);
  assert.equal(w.localTax, 90);
  assert.equal(w.totalTax, 990);
  assert.equal(w.exemptSmall, false);
  // 33,333원: 소득세 999.99 → 990원 (10원 미만 절사), 지방소득세 99 → 90원
  assert.deepEqual([withholding(33_333).incomeTax, withholding(33_333).localTax], [990, 90]);
  // 1,000원: 소득세 30원, 지방소득세 3원은 10원 미만 전액이라 0원
  assert.deepEqual([withholding(1_000).incomeTax, withholding(1_000).localTax], [30, 0]);
  // 333원: 소득세 9.99원 → 0원, 334원: 10.02원 → 10원
  assert.equal(withholding(333).incomeTax, 0);
  assert.equal(withholding(334).incomeTax, 10);
  // 기타소득은 과세최저한을 넘으면 소득세가 최소 10,000원이라 소액부징수가 생기지 않는다
  for (const p of EXPENSE_RATES) {
    for (let g = 0; g <= 400_000; g += 7) {
      const t = withholding(g, 'other', p).incomeTax;
      assert.ok(t === 0 || t >= 10_000, `p ${p} g ${g}`);
    }
    assert.equal(withholding(exemptLimit(p) + 1, 'other', p).incomeTax, 10_000);
  }
});

test('끝수: 소득세·지방소득세 각각 10원 미만 절사 (국고금관리법 제47조)', () => {
  const w = withholding(1_234_567);
  assert.equal(w.incomeTax, 37_030); // 37,037.01
  assert.equal(w.localTax, 3_700); // 3,703
  assert.equal(w.net, 1_193_837);
  const x = withholding(125_000);
  assert.deepEqual([x.incomeTax, x.localTax, x.totalTax], [3_750, 370, 4_120]);
  // 부동소수점 경계: 정수 연산이라 x.9999… 오차가 없다
  assert.equal(withholding(3_333_330).incomeTax, 99_990);
  assert.equal(withholding(3_333_334).incomeTax, 100_000);
  // 기타소득: 필요경비는 원 미만 절사 후 소득금액 = 지급액 − 필요경비
  const o = withholding(1_249_999, 'other', 60);
  assert.equal(o.expense, 749_999);
  assert.equal(o.income, 500_000);
  assert.equal(o.incomeTax, 100_000);
  for (let g = 0; g <= 2_000_000; g += 9_973) {
    for (const [ty, p] of [['business', 0], ['other', 60], ['other', 80], ['other', 0]]) {
      const v = withholding(g, ty, p);
      assert.equal(v.incomeTax % 10, 0);
      assert.equal(v.localTax % 10, 0);
      assert.equal(v.localTax, Math.floor(v.incomeTax / 100) * 10);
      assert.equal(v.net, g - v.incomeTax - v.localTax);
      assert.equal(v.expense + v.income, g);
    }
  }
});

test('필요경비 80%·없음: 4.4%·22%와 과세최저한 경계', () => {
  const a = withholding(1_000_000, 'other', 80);
  assert.deepEqual([a.income, a.incomeTax, a.localTax, a.net], [200_000, 40_000, 4_000, 956_000]);
  const b = withholding(1_000_000, 'other', 0);
  assert.deepEqual([b.income, b.incomeTax, b.localTax, b.net], [1_000_000, 200_000, 20_000, 780_000]);
  assert.equal(exemptLimit(80), 250_000);
  assert.equal(exemptLimit(0), 50_000);
  assert.equal(withholding(250_000, 'other', 80).totalTax, 0);
  assert.equal(withholding(250_001, 'other', 80).totalTax, 11_000);
  assert.equal(withholding(50_000, 'other', 0).totalTax, 0);
  assert.equal(withholding(50_001, 'other', 0).totalTax, 11_000);
  // 경계 바로 위·아래를 전수 확인
  for (const p of EXPENSE_RATES) {
    const lim = exemptLimit(p);
    for (let g = lim - 30; g <= lim; g += 1) assert.equal(withholding(g, 'other', p).exemptMin, true, `${p} ${g}`);
    for (let g = lim + 1; g <= lim + 30; g += 1) assert.equal(withholding(g, 'other', p).exemptMin, false, `${p} ${g}`);
  }
});

test('역산: 실수령액 → 세전 금액', () => {
  const r = calcFreelancer({ mode: 'net', amount: 967_000 });
  assert.equal(r.gross, 1_000_000);
  assert.equal(r.net, 967_000);
  assert.deepEqual(r.alternatives, [999_980]);
  assert.equal(r.minGross, 999_980);
  assert.equal(withholding(999_980).net, 967_000);
  assert.equal(calcFreelancer({ mode: 'net', amount: 3_000_000 }).gross, 3_102_370);
  assert.equal(withholding(3_102_370).net, 3_000_000);
  assert.equal(calcFreelancer({ mode: 'net', amount: 912_000, type: 'other' }).gross, 1_000_000);
  // 과세최저한 이하 실수령액은 세전 = 실수령
  const low = calcFreelancer({ mode: 'net', amount: 120_000, type: 'other' });
  assert.equal(low.gross, 120_000);
  assert.equal(low.exemptMin, true);
  assert.deepEqual(low.alternatives, []);
  // 과세최저한 바로 위
  const edge = calcFreelancer({ mode: 'net', amount: 125_001, type: 'other' });
  assert.ok(edge.gross > 125_000);
  assert.equal(edge.net, 125_001);
});

test('역산: 전수 비교 — 모든 실수령액에 대해 후보가 빠짐없고 대표값은 가장 큰 후보', () => {
  for (const [ty, p] of [['business', 0], ['other', 60], ['other', 80], ['other', 0]]) {
    const byNet = new Map();
    for (let g = 0; g <= 260_000; g += 1) {
      const n = withholding(g, ty, p).net;
      if (!byNet.has(n)) byNet.set(n, []);
      byNet.get(n).push(g);
    }
    for (let t = 1; t <= 200_000; t += 1) {
      const c = grossCandidates(t, ty, p);
      const all = byNet.get(t) || [];
      assert.ok(c.length >= 1, `${ty} ${p} ${t}`);
      if (withholding(t, ty, p).net === t) assert.deepEqual(c, [t]);
      else assert.deepEqual(c, all, `${ty} ${p} ${t}`);
    }
  }
  for (let t = 1_000_000; t <= 50_000_000; t += 777_777) {
    const r = calcFreelancer({ mode: 'net', amount: t });
    assert.equal(r.net, t);
    assert.ok(r.gross <= Math.ceil(t / 0.967));
    // 대표값보다 큰 지급액 중에는 실수령액이 t인 것이 없다 (가장 큰 후보)
    for (let g = r.gross + 1; g <= Math.ceil(t / 0.967) + 30; g += 1) assert.notEqual(withholding(g).net, t);
    // 대체 후보는 모두 실수령액이 t
    for (const g of r.alternatives) assert.equal(withholding(g).net, t);
  }
});

test('경계값: 1원, 최대 1,000억원, 소수·문자열 입력', () => {
  assert.equal(calcFreelancer({ amount: 1 }).net, 1);
  assert.equal(calcFreelancer({ mode: 'net', amount: 1 }).gross, 1);
  const max = calcFreelancer({ amount: MAX_AMOUNT });
  assert.ok(!max.error);
  assert.equal(max.incomeTax, 3_000_000_000);
  assert.equal(max.net, MAX_AMOUNT - 3_300_000_000);
  const maxNet = calcFreelancer({ mode: 'net', amount: MAX_AMOUNT, type: 'other' });
  assert.equal(maxNet.net, MAX_AMOUNT);
  assert.match(calcFreelancer({ amount: MAX_AMOUNT + 1 }).error, /1,000억원 이하/);
  assert.match(calcFreelancer({ mode: 'net', amount: MAX_AMOUNT + 1 }).error, /실수령액은 1,000억원 이하/);
  assert.equal(calcFreelancer({ amount: 1_000_000.9 }).gross, 1_000_000);
  assert.equal(calcFreelancer({ amount: '1000000' }).net, 967_000);
  // 알 수 없는 구분·방향·필요경비율은 기본값(사업소득, 세전, 60%)
  assert.equal(calcFreelancer({ amount: 1_000_000, type: 'x', mode: 'y' }).net, 967_000);
  assert.equal(calcFreelancer({ amount: 1_000_000, type: 'other', expenseRate: 55 }).expenseRate, 60);
  assert.equal(calcFreelancer({ amount: 1_000_000, type: 'other', expenseRate: '80' }).net, 956_000);
  assert.equal(calcFreelancer({ amount: 1_000_000, type: 'business', expenseRate: 80 }).net, 967_000);
});

test('잘못된 입력은 예외 없이 error를 돌려준다', () => {
  for (const bad of [0, -1, 0.5, NaN, Infinity, -Infinity, '', 'abc', null, undefined, true, {}]) {
    for (const mode of ['gross', 'net']) {
      const r = calcFreelancer({ amount: bad, mode });
      assert.ok(r.error, `${mode} ${String(bad)}`);
    }
  }
  assert.ok(calcFreelancer().error);
  assert.ok(calcFreelancer({}).error);
  assert.match(calcFreelancer({ mode: 'net', amount: 0 }).error, /실수령액/);
  assert.match(calcFreelancer({ amount: -5 }).error, /지급액/);
});

test('소득 구분별 비교와 화면 비교표 기본값', () => {
  const rows = compareTypes(1_000_000);
  assert.deepEqual(rows.map((r) => r.key), ['business', 'other-60', 'other-80', 'other-0']);
  assert.deepEqual(rows.map((r) => r.totalTax), [33_000, 88_000, 44_000, 220_000]);
  const trs = [...html.matchAll(/<tr data-key="([\w-]+)"[^>]*>(.*?)<\/tr>/g)];
  assert.equal(trs.length, 4);
  trs.forEach((m, i) => {
    const cells = [...m[2].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((x) => x[1].replace(/<[^>]+>/g, ''));
    assert.equal(m[1], rows[i].key);
    assert.deepEqual(cells.slice(1), [rows[i].incomeTax, rows[i].localTax, rows[i].totalTax, rows[i].net].map(f));
    assert.ok(cells[0].includes(`${+(rows[i].rate * 100).toFixed(2)}%`));
  });
  // 결과 전표 기본값 (지급액 1,000,000원)
  assert.match(html, /id="amount"[^>]*value="1,000,000"/);
  assert.match(html, /id="head"[^>]*>967,000<small>/);
});

test('본문 지급액별 표: 계산 모듈과 일치', () => {
  const trs = [...article.matchAll(/<tr data-amount="(\d+)"[^>]*>(.*?)<\/tr>/g)];
  assert.equal(trs.length, TABLE_AMOUNTS.length);
  trs.forEach((m, i) => {
    const g = Number(m[1]);
    assert.equal(g, TABLE_AMOUNTS[i]);
    const cells = [...m[2].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((x) => x[1]);
    const b = withholding(g);
    const o = withholding(g, 'other', 60);
    assert.deepEqual(cells.slice(1), [b.totalTax, b.net, o.totalTax, o.net].map(f), `${g}`);
  });
});

test('본문·FAQ 숫자가 계산 결과·기준값과 일치한다', () => {
  assert.ok((article.match(/<h2>/g) || []).length >= 3);
  const len = text.replace(/\s+/g, '').length;
  assert.ok(len >= 1000, `본문 ${len}자`);
  assert.match(article, /class="formula"/);
  assert.match(text, /이 계산기는 .*반영하지 않습니다/);
  assert.match(html, /href="income-tax\.html"/);
  for (const s of [
    `지급액의 ${BUSINESS_RATE_PCT}%`, `기타소득금액의 ${OTHER_RATE_PCT}%`, `소득세 × ${LOCAL_RATE_PCT}%`,
    '받은 금액의 60%', '받은 금액의 80%', `건별 ${OTHER_MIN_INCOME / 1e4}만원 이하`, `${f(SMALL_TAX_LIMIT)}원 미만`,
    `연 ${OTHER_SEPARATE_LIMIT / 1e4}만원 이하`, '10원 미만',
    `${f(exemptLimit(60))}원`, `${f(exemptLimit(80))}원`, `${f(exemptLimit(0))}원`,
    '2024년 7월 1일', '5월 1일부터 31일까지', '2027년 1월 1일', `${PROPOSED_2027_BUSINESS_RATE_PCT}%`,
  ]) assert.ok(text.includes(s), `본문에 ${s}`);
  // 계산 예시
  const w1 = withholding(1_234_567);
  const w2 = withholding(30_000);
  const w3 = withholding(125_000);
  const w4 = withholding(125_001, 'other', 60);
  const proposed = Math.floor((1_000_000 * PROPOSED_2027_BUSINESS_RATE_PCT) / 1000) * 10;
  const proposedTotal = proposed + Math.floor(proposed / 100) * 10;
  assert.equal(proposedTotal, 22_000);
  for (const n of [w1.incomeTax, w1.localTax, w1.net, w2.incomeTax, w2.localTax, w2.totalTax, w3.incomeTax, w3.localTax,
    w3.totalTax, w4.incomeTax, w4.localTax, calcFreelancer({ mode: 'net', amount: 3_000_000 }).gross,
    withholding(5_000_000).incomeTax, withholding(5_000_000).totalTax, 999_980, 967_000, 33_000, proposedTotal,
    (OTHER_SEPARATE_LIMIT * 100) / (100 - 60)]) {
    assert.ok(text.includes(f(n)) || text.includes(`${f(n / 1e4)}만원`), `본문에 ${f(n)}`);
  }
  const faq = meta.faq.map(([q, a]) => `${q} ${a}`).join('\n');
  const b = withholding(1_000_000);
  const o = withholding(1_000_000, 'other', 60);
  for (const n of [b.incomeTax, b.localTax, b.totalTax, b.net, o.totalTax, o.net, exemptLimit(60), w4.incomeTax, w4.localTax,
    calcFreelancer({ mode: 'net', amount: 3_000_000 }).gross, proposedTotal]) {
    assert.ok(faq.includes(f(n)), `FAQ에 ${f(n)}`);
  }
  assert.ok(meta.description.includes(f(b.totalTax)) && meta.description.includes(f(b.net)));
  assert.equal(meta.category, 'tax');
  assert.equal(meta.order, 30);
  assert.equal(meta.popular, undefined);
  assert.equal(meta.script, 'freelancer.js');
  assert.ok(meta.faq.length >= 4 && meta.faq.length <= 6);
  assert.ok(meta.description.length >= 120 && meta.description.length <= 160, `${meta.description.length}`);
});
