import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  calcNetToGross, netToGrossTable, TABLE_TARGETS, MAX_TARGET, MEAL_NONTAX_LIMIT, NEGOTIATION_UNIT,
} from '../src/assets/js/calc/net-to-gross.js';
import { calcSalary, withholdingTax } from '../src/assets/js/calc.js';
import { INSURANCE, CHILD_CREDIT, LOCAL_TAX_RATE } from '../src/assets/js/rates.js';
import meta from '../src/pages/net-to-gross.meta.mjs';

const nf = new Intl.NumberFormat('ko-KR');
const f = (n) => nf.format(n);
const netOf = (monthly, c = {}) => calcSalary({
  amount: monthly, period: 'monthly', nonTaxable: c.nonTaxable ?? 200_000, family: c.family ?? 1, children: c.children ?? 0,
}).monthlyNet;

/** 전수 탐색: 목표 이상이 되는 가장 작은 세전 월급 (실수령액 ≤ 세전 월급이므로 목표부터 센다) */
function brute(target, c, upTo) {
  for (let g = target; g <= upTo; g += 1) if (netOf(g, c) >= target) return g;
  return null;
}

/** 단순 이분 탐색 (실수령액이 단조 증가한다고 가정) — 비교용 */
function naiveBisect(target, c) {
  let lo = target - 1;
  let hi = target * 3 + 1_000_000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (netOf(mid, c) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

test('왕복: 연봉 4,000만원의 실수령액을 넣으면 연봉 4,000만원으로 돌아온다', () => {
  // 연봉 4,000만원 → 월 2,935,813원 (tests/pages.test.mjs의 salary-4000 페이지 값)
  assert.equal(calcSalary({ amount: 40_000_000 }).monthlyNet, 2_935_813);
  const r = calcNetToGross({ targetNet: 2_935_813 });
  assert.equal(r.monthlyGross, 3_333_333);
  assert.equal(r.annualGross, 39_999_996); // 3,333,333 × 12 → 월급은 floor(÷12) = 3,333,333
  assert.equal(r.salary.monthlyNet, 2_935_813);
  assert.equal(r.negotiation.annualGross, 40_000_000);
  assert.equal(r.negotiation.monthlyNet, 2_935_813);
  assert.equal(brute(2_935_813, {}, r.monthlyGross), r.monthlyGross);
});

test('공식 예시 왕복: 간이세액표 원문 값과 국세청 자녀공제 예시', () => {
  // 간이세액표 월 3,000~3,020천원, 1명 → 74,350원. 과세 급여 3,000,000원(비과세 0)의 실수령액을 역산
  assert.equal(withholdingTax(3_000_000, 1).incomeTax, 74_350);
  const net1 = netOf(3_000_000, { nonTaxable: 0 });
  const r1 = calcNetToGross({ targetNet: net1, nonTaxable: 0 });
  assert.ok(r1.monthlyGross <= 3_000_000);
  assert.equal(r1.monthlyGross, brute(net1, { nonTaxable: 0 }, 3_000_000));
  assert.ok(r1.salary.monthlyNet >= net1);

  // 국세청 예시: 월 3,510천원, 공제대상가족 4명, 자녀 2명 → 49,340 − 45,830 = 3,510원
  assert.equal(withholdingTax(3_510_000, 4, 2).incomeTax, 3_510);
  const c2 = { nonTaxable: 0, family: 4, children: 2 };
  const net2 = netOf(3_510_000, c2);
  assert.equal(net2, 3_510_000 - (166_720 + 126_180 + 16_580 + 31_590 + 3_510 + 350));
  const r2 = calcNetToGross({ targetNet: net2, ...c2 });
  assert.equal(r2.monthlyGross, brute(net2, c2, 3_510_000));
  assert.ok(r2.salary.monthlyNet >= net2);

  // 2026년 최저임금 월 환산 2,156,880원(10,320원 × 209시간)의 실수령액 역산
  const net3 = netOf(2_156_880, { nonTaxable: 0 });
  const r3 = calcNetToGross({ targetNet: net3, nonTaxable: 0 });
  assert.equal(r3.monthlyGross, brute(net3, { nonTaxable: 0 }, 2_156_880));
});

test('기본 조건 월 300만원: 결과와 공제 내역이 연봉 실수령액 계산과 같다', () => {
  const r = calcNetToGross({ targetNet: 3_000_000 });
  assert.equal(r.monthlyGross, 3_412_740);
  assert.equal(r.annualGross, 40_952_880);
  assert.equal(r.nonTaxable, MEAL_NONTAX_LIMIT);
  const s = calcSalary({ amount: 40_952_880 });
  assert.deepEqual(r.salary, s);
  assert.deepEqual(r.salary.deductions.map((d) => d.value), [152_570, 115_490, 15_170, 28_910, 91_460, 9_140]);
  assert.equal(r.salary.monthlyNet, 3_000_000);
  assert.equal(r.surplus, 0);
  assert.ok(netOf(r.monthlyGross - 1) < 3_000_000);
  assert.equal(r.negotiation.annualGross, 41_000_000);
  assert.equal(r.negotiation.monthlyNet, 3_003_546);
  assert.equal(r.negotiation.surplus, 3_546);
});

test('최소성: 전수 탐색과 같은 값 (공제대상가족 12명 이상·비과세 0·자녀 포함)', () => {
  const cases = [
    [2_000_000, {}],
    [2_031_676, {}],
    [3_000_000, { nonTaxable: 0 }],
    [3_422_479, {}],
    [3_700_000, { family: 13, children: 2 }],
    [3_456_789, { nonTaxable: 0, family: 15 }],
    [4_100_000, { family: 18, children: 3 }],
    [2_600_000, { nonTaxable: 450_000, family: 3, children: 1 }],
  ];
  for (const [t, c] of cases) {
    const r = calcNetToGross({ targetNet: t, ...c });
    assert.equal(r.monthlyGross, brute(t, c, r.monthlyGross), `target ${t} ${JSON.stringify(c)}`);
    assert.ok(r.salary.monthlyNet >= t);
    assert.ok(r.steps < 400, `steps ${r.steps}`);
  }
});

test('단순 이분 탐색은 최소값을 놓칠 수 있다 (계단식 공제)', () => {
  // 월 2,031,676원: 이분 탐색은 2,254,526원을 내지만 2,254,516원에서 이미 목표에 닿는다
  const t = 2_031_676;
  const r = calcNetToGross({ targetNet: t });
  assert.equal(r.monthlyGross, 2_254_516);
  assert.equal(naiveBisect(t, {}), 2_254_526);
  assert.ok(netOf(2_254_516) >= t);
  // 넓은 범위에서 항상 이분 탐색 이하이고, 실수령액은 목표 이상
  for (let t2 = 2_000_000; t2 <= 6_000_000; t2 += 37_501) {
    const x = calcNetToGross({ targetNet: t2 });
    assert.ok(x.monthlyGross <= naiveBisect(t2, {}), `target ${t2}`);
    assert.ok(x.salary.monthlyNet >= t2);
    assert.ok(netOf(x.monthlyGross - 1) < t2);
  }
});

test('간이세액표 계단: 세전 월급 1원 차이로 실수령액이 8,159원 줄어드는 지점 (본문 예시)', () => {
  assert.equal(withholdingTax(3_759_999, 1).incomeTax, 156_560);
  assert.equal(withholdingTax(3_760_000, 1).incomeTax, 163_920);
  assert.equal(netOf(3_959_999), 3_422_479);
  assert.equal(netOf(3_960_000), 3_414_320);
  assert.equal(netOf(3_959_999) - netOf(3_960_000), 8_159);
  // 목표 3,422,479원은 계단 아래(3,959,999원 이하)에서 찾고, 계단 위 3,968,979원으로 가지 않는다
  assert.ok(calcNetToGross({ targetNet: 3_422_479 }).monthlyGross <= 3_959_999);
  let g = 3_960_000;
  while (netOf(g) < 3_422_479) g += 1;
  assert.equal(g, 3_968_979);
});

test('퇴직금 포함 연봉: 연봉 = 세전 월급 × 13', () => {
  const r = calcNetToGross({ targetNet: 3_000_000, includesSeverance: true });
  assert.equal(r.divisor, 13);
  assert.equal(r.monthlyGross, 3_412_740);
  assert.equal(r.annualGross, 44_365_620);
  assert.equal(r.severancePart, 3_412_740);
  assert.equal(r.salary.monthlyGross, 3_412_740);
  assert.equal(r.salary.monthlyNet, 3_000_000);
  assert.equal(r.negotiation.annualGross % NEGOTIATION_UNIT, 0);
  assert.equal(r.negotiation.annualGross, 45_000_000);
  assert.ok(calcSalary({ amount: 44_000_000, includesSeverance: true }).monthlyNet < 3_000_000);
  assert.equal(calcNetToGross({ targetNet: 3_000_000 }).annualGross + 3_412_740, 44_365_620);
});

test('부양가족·자녀: 필요한 연봉이 줄고, 자녀는 부양가족 − 1명까지만 센다', () => {
  const r = calcNetToGross({ targetNet: 3_000_000, family: 4, children: 2 });
  assert.equal(r.annualGross, 39_616_080);
  assert.equal(r.salary.deductions.find((d) => d.key === 'incomeTax').value, 0);
  const clamped = calcNetToGross({ targetNet: 3_000_000, family: 1, children: 3 });
  assert.equal(clamped.children, 0);
  assert.equal(clamped.childrenClamped, true);
  assert.equal(clamped.annualGross, 40_952_880);
  const big = calcNetToGross({ targetNet: 3_000_000, family: 25, children: 30 });
  assert.equal(big.family, 20);
  assert.equal(big.children, 10);
  assert.equal(calcNetToGross({ targetNet: 3_000_000, family: 0 }).family, 1);
  assert.equal(calcNetToGross({ targetNet: 3_000_000, family: 2.7 }).family, 2);
});

test('비과세: 0원, 목표 이하 전액 비과세, 국민연금 하한이 붙는 경계', () => {
  assert.equal(calcNetToGross({ targetNet: 3_000_000, nonTaxable: 0 }).annualGross, 41_662_560);
  assert.equal(41_662_560 - 40_952_880, 709_680);
  // 목표가 비과세액 이하면 공제가 없어 세전 = 실수령
  const low = calcNetToGross({ targetNet: 150_000 });
  assert.equal(low.monthlyGross, 150_000);
  assert.equal(low.salary.totalDeduction, 0);
  assert.equal(calcNetToGross({ targetNet: 200_000 }).monthlyGross, 200_000);
  // 1원이라도 과세되면 국민연금 하한(41만원 × 4.75% = 19,470원)이 붙는다
  const edge = calcNetToGross({ targetNet: 200_001 });
  assert.equal(edge.monthlyGross, brute(200_001, {}, edge.monthlyGross));
  assert.ok(edge.monthlyGross > 200_001 + 19_470);
  // 음수·문자 비과세는 0으로
  assert.equal(calcNetToGross({ targetNet: 3_000_000, nonTaxable: -5 }).nonTaxable, 0);
  assert.equal(calcNetToGross({ targetNet: 3_000_000, nonTaxable: 'x' }).nonTaxable, 0);
});

test('100만원 단위 협상 연봉: 목표 이상이 되는 가장 작은 100만원 단위', () => {
  for (const [t, c] of [[2_500_000, {}], [3_000_000, { includesSeverance: true }], [5_000_000, { family: 3, children: 1 }], [7_777_777, {}]]) {
    const r = calcNetToGross({ targetNet: t, ...c });
    const n = r.negotiation;
    const sev = !!c.includesSeverance;
    const salary = (a) => calcSalary({ amount: a, includesSeverance: sev, family: r.family, children: r.children });
    assert.equal(n.annualGross % NEGOTIATION_UNIT, 0);
    assert.ok(n.annualGross >= r.annualGross);
    assert.ok(n.monthlyNet >= t);
    assert.equal(salary(n.annualGross).monthlyNet, n.monthlyNet);
    for (let a = n.annualGross - NEGOTIATION_UNIT; a >= Math.max(NEGOTIATION_UNIT, n.annualGross - 5 * NEGOTIATION_UNIT); a -= NEGOTIATION_UNIT) {
      assert.ok(salary(a).monthlyNet < t, `target ${t}: ${a}`);
    }
  }
});

test('고소득: 월 1,000만원 초과 산식 구간과 입력 상한 1억원', () => {
  const r = calcNetToGross({ targetNet: 8_000_000 });
  assert.equal(r.monthlyGross, 10_715_450);
  assert.equal(r.annualGross, 128_585_400);
  assert.ok(netOf(10_715_449) < 8_000_000);
  assert.equal(brute(8_000_000, {}, 10_715_450), 10_715_450);
  const max = calcNetToGross({ targetNet: MAX_TARGET });
  assert.ok(!max.error);
  assert.ok(max.salary.monthlyNet >= MAX_TARGET);
  assert.ok(netOf(max.monthlyGross - 1) < MAX_TARGET);
  assert.ok(calcNetToGross({ targetNet: MAX_TARGET + 1 }).error);
});

test('잘못된 입력은 예외 없이 error를 돌려준다', () => {
  for (const bad of [0, -1, NaN, Infinity, '', 'abc', null, undefined]) {
    const r = calcNetToGross({ targetNet: bad });
    assert.ok(r.error, `targetNet ${bad}`);
  }
  assert.ok(calcNetToGross().error);
  assert.ok(calcNetToGross({}).error);
  // 소수는 올려서 원 단위로 (실수령액은 정수)
  assert.equal(calcNetToGross({ targetNet: 2_999_999.4 }).monthlyGross, 3_412_740);
  assert.equal(calcNetToGross({ targetNet: '3000000' }).monthlyGross, 3_412_740);
  assert.equal(calcNetToGross({ targetNet: 1 }).monthlyGross, 1);
  const tbl = netToGrossTable({ family: 'x', nonTaxable: -1 });
  assert.equal(tbl.length, 13);
  assert.ok(tbl.every((x) => !x.error));
});

test('목표 실수령액별 표: 200만~800만원 50만원 간격, 본문 표와 일치', async () => {
  assert.deepEqual(TABLE_TARGETS, [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((v) => v * 1e6));
  const rows = netToGrossTable({});
  assert.equal(rows.length, 13);
  for (let i = 0; i < rows.length; i += 1) {
    assert.ok(rows[i].monthlyNet >= rows[i].targetNet);
    if (i) assert.ok(rows[i].monthlyGross > rows[i - 1].monthlyGross);
  }
  const html = await readFile(new URL('../src/pages/net-to-gross.html', import.meta.url), 'utf8');
  const trs = [...html.matchAll(/<tr data-target="(\d+)"[^>]*>(.*?)<\/tr>/g)];
  assert.equal(trs.length, 13);
  trs.forEach((m, i) => {
    const cells = [...m[2].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((x) => x[1]);
    const row = rows[i];
    assert.equal(Number(m[1]), row.targetNet);
    assert.equal(cells[1], f(row.monthlyGross));
    assert.equal(cells[2], f(row.annualGross));
    const man = row.negotiationAnnual / 1e4;
    const label = man >= 1e4 ? `${Math.floor(man / 1e4)}억${man % 1e4 ? ` ${f(man % 1e4)}만` : ''}원` : `${f(man)}만원`;
    assert.equal(cells[3], label);
    assert.equal(cells[4], `${(row.deductionRate * 100).toFixed(1)}%`);
  });
});

test('본문·FAQ 숫자가 계산 결과·기준값과 일치한다', async () => {
  const html = await readFile(new URL('../src/pages/net-to-gross.html', import.meta.url), 'utf8');
  const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  const text = article.replace(/<[^>]+>/g, '');
  assert.ok((article.match(/<h2>/g) || []).length >= 3);
  assert.ok(text.replace(/\s+/g, '').length >= 1000, `본문 ${text.replace(/\s+/g, '').length}자`);
  assert.match(article, /class="formula"/);
  assert.match(text, /이 계산기는 .*반영하지 않습니다/);
  // 기준값 (rates.js)
  const pct = (x) => `${+(x * 100).toFixed(4)}%`;
  for (const s of [
    pct(INSURANCE.pension.rate), pct(INSURANCE.health.rate), pct(INSURANCE.employment.rate),
    pct(INSURANCE.health.totalRate), pct(INSURANCE.care.incomeRate),
    `${((INSURANCE.care.incomeRate / INSURANCE.health.totalRate) * 100).toFixed(2)}%`,
    `${INSURANCE.pension.minBase / 1e4}만~${INSURANCE.pension.maxBase / 1e4}만원`,
    `${f(CHILD_CREDIT.one)}원`, `${f(CHILD_CREDIT.two)}원`, `${f(CHILD_CREDIT.extra)}원`,
    `소득세 × ${LOCAL_TAX_RATE * 100}%`, `월 ${MEAL_NONTAX_LIMIT / 1e4}만원까지`,
  ]) assert.ok(text.includes(s), `본문에 ${s}`);
  // 계산 예시
  const base = calcNetToGross({ targetNet: 3_000_000 });
  const sev = calcNetToGross({ targetNet: 3_000_000, includesSeverance: true });
  const fam = calcNetToGross({ targetNet: 3_000_000, family: 4, children: 2 });
  const zero = calcNetToGross({ targetNet: 3_000_000, nonTaxable: 0 });
  for (const n of [base.monthlyGross, base.annualGross, sev.annualGross, 3_959_999, 3_422_479, 3_414_320, 8_159, 3_968_979]) {
    assert.ok(text.includes(f(n)), `본문에 ${f(n)}`);
  }
  assert.ok(text.includes(`${f(base.negotiation.annualGross / 1e4)}만원`));
  const faq = meta.faq.map(([q, a]) => `${q} ${a}`).join('\n');
  for (const n of [base.monthlyGross, base.annualGross, base.negotiation.monthlyNet, sev.annualGross, base.monthlyGross,
    fam.annualGross, zero.annualGross, zero.annualGross - base.annualGross, netOf(3_959_999), netOf(3_960_000)]) {
    assert.ok(faq.includes(f(n)), `FAQ에 ${f(n)}`);
  }
  assert.ok(meta.description.includes(f(base.annualGross)));
  assert.equal(meta.category, 'work');
  assert.equal(meta.order, 15);
  assert.equal(meta.popular, undefined);
  assert.ok(meta.faq.length >= 4 && meta.faq.length <= 6);
  assert.ok(meta.description.length >= 120 && meta.description.length <= 160);
});
