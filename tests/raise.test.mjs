import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  calcRaise, raiseTable, nextSalary, raiseRate, RAISE_STEPS, RATE_MIN, RATE_MAX,
} from '../src/assets/js/calc/raise.js';
import { calcSalary } from '../src/assets/js/calc.js';
import { INSURANCE, TAX_BRACKETS } from '../src/assets/js/rates.js';
import meta from '../src/pages/raise.meta.mjs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const fmt = (n) => new Intl.NumberFormat('ko-KR').format(n);

test('공식 간이세액표 값으로 손계산한 인상 전후 실수령액 (월 과세 300만 → 350만원, 1명)', () => {
  // 연봉 3,840만원 → 월 320만원, 비과세 20만원 → 과세 300만원
  //   간이세액표 3,000~3,020천원 1명 = 74,350원 (소득세법 시행령 별표 2)
  //   국민연금 3,000,000 × 4.75% = 142,500 / 건강 × 3.595% = 107,850 / 장기요양 107,850 × 13.14% → 14,170 / 고용 × 0.9% = 27,000
  //   소득세 74,350 / 지방소득세 7,430 → 공제 373,300, 실수령 2,826,700
  // 연봉 4,440만원 → 월 370만원 → 과세 350만원
  //   간이세액표 3,500~3,520천원 1명 = 127,220원
  //   국민연금 166,250 / 건강 125,825 → 125,820 / 장기요양 16,530 / 고용 31,500 / 소득세 127,220 / 지방 12,720
  //   공제 480,040, 실수령 3,219,960
  const r = calcRaise({ mode: 'amount', current: 38_400_000, next: 44_400_000 });
  assert.equal(r.rate, 15.625);
  assert.equal(r.before.monthlyNet, 2_826_700);
  assert.equal(r.after.monthlyNet, 3_219_960);
  assert.deepEqual(r.items.map((i) => i.before), [142_500, 107_850, 14_170, 27_000, 74_350, 7_430]);
  assert.deepEqual(r.items.map((i) => i.after), [166_250, 125_820, 16_530, 31_500, 127_220, 12_720]);
  assert.equal(r.grossMonthlyDiff, 500_000);
  assert.equal(r.insuranceDiff, 48_580);
  assert.equal(r.taxDiff, 58_160);
  assert.equal(r.netMonthlyDiff, 393_260);
  assert.equal(r.netAnnualDiff, 393_260 * 12);
  close(r.netRate, (393_260 / 2_826_700) * 100);
  assert.ok(r.netRate < r.rate);
});

test('국세청 안내 예시: 4명·자녀 2명 자녀세액공제 (월 과세 351만원 → 3,510원)', () => {
  // 인상 전 과세 300만원: 4명 26,690원 − 자녀 2명 45,830원 → 0원
  // 인상 후 과세 351만원(3,500~3,520천원): 4명 49,340원 − 45,830원 = 3,510원, 지방소득세 350원
  const r = calcRaise({ current: 38_400_000, next: 44_520_000, family: 4, children: 2 });
  assert.equal(r.items.find((i) => i.key === 'incomeTax').before, 0);
  assert.equal(r.items.find((i) => i.key === 'incomeTax').after, 3_510);
  assert.equal(r.items.find((i) => i.key === 'localTax').after, 350);
  assert.equal(r.taxDiff, 3_860);
  close(r.rate, (6_120_000 / 38_400_000) * 100);
});

test('국민연금 상한 659만원과 월 1천만원 초과 간이세액 산식 (연봉 1억 2,240만원, 5% 인상)', () => {
  // 인상 전 과세 10,000,000: 간이세액 1,507,400원, 국민연금 6,590,000 × 4.75% = 313,025 → 313,020
  // 인상 후 연봉 128,520,000 → 월 10,710,000 → 과세 10,510,000
  //   소득세 = 1,507,400 + 510,000 × 98% × 35% + 25,000 = 1,707,330, 지방 170,730
  const r = calcRaise({ mode: 'rate', current: 122_400_000, rate: 5 });
  assert.equal(r.next, 128_520_000);
  const pension = r.items.find((i) => i.key === 'pension');
  assert.equal(pension.before, 313_020);
  assert.equal(pension.after, 313_020);
  assert.equal(pension.diff, 0);
  assert.equal(r.items.find((i) => i.key === 'incomeTax').before, 1_507_400);
  assert.equal(r.items.find((i) => i.key === 'incomeTax').after, 1_707_330);
  assert.equal(r.taxDiff, 1_707_330 + 170_730 - 1_507_400 - 150_740);
  assert.equal(r.insuranceDiff, 25_320); // 연금 0 + 건강 18,330 + 장기요양 2,400 + 고용 4,590
  assert.equal(r.grossMonthlyDiff, 510_000);
});

test('두 모드: 인상 후 연봉 → 인상률, 인상률 → 인상 후 연봉', () => {
  const a = calcRaise({ mode: 'amount', current: 40_000_000, next: 42_000_000 });
  const b = calcRaise({ mode: 'rate', current: 40_000_000, rate: 5 });
  assert.equal(a.rate, 5);
  assert.equal(b.next, 42_000_000);
  assert.deepEqual({ ...a, mode: 'x' }, { ...b, mode: 'x' });
  // 연봉 실수령액 계산기와 같은 값 (연봉 4,000만원 월 2,935,813원)
  assert.equal(a.before.monthlyNet, calcSalary({ amount: 40_000_000 }).monthlyNet);
  assert.equal(a.before.monthlyNet, 2_935_813);
  assert.equal(a.after.monthlyNet, 3_066_300);
  assert.equal(a.netMonthlyDiff, 130_487);
  assert.equal(a.grossMonthlyDiff, 166_667);
  close(calcRaise({ current: 35_000_000, next: 37_450_000 }).rate, 7);
  close(raiseRate(40_000_000, 44_000_000), 10);
  assert.equal(calcRaise({ mode: 'rate', current: 40_000_000, rate: 10 }).netMonthlyDiff, 259_483);
});

test('인상 후 연봉 반올림: 부동소수점 오차 보정, 원 미만 반올림', () => {
  assert.equal(nextSalary(40_000_000, 7), 42_800_000);
  assert.equal(nextSalary(40_000_000, 3.3), 41_320_000);
  assert.equal(nextSalary(35_000_000, 4.5), 36_575_000);
  assert.equal(nextSalary(33_333_333, 3), 34_333_333); // 34,333,332.99
  assert.equal(nextSalary(10_000_001, 50), 15_000_002); // 15,000,001.5
  assert.equal(nextSalary(29_000_000, 1.1), 29_319_000);
  for (const c of [24_000_000, 31_000_000, 47_500_000, 123_456_789]) {
    for (const p of [0.1, 2.5, 3.3, 4.7, 6.6, 8.2, 11.1]) {
      assert.equal(nextSalary(c, p), Math.round((c * Math.round((100 + p) * 10)) / 1000), `${c} ${p}`);
    }
  }
});

test('경계값: 인상률 0%, 삭감, 비과세 범위 안, 퇴직금 포함 연봉', () => {
  const zero = calcRaise({ mode: 'rate', current: 40_000_000, rate: 0 });
  assert.equal(zero.next, 40_000_000);
  assert.equal(zero.netMonthlyDiff, 0);
  assert.equal(zero.netRate, 0);
  assert.equal(zero.keepShare, null);
  assert.equal(zero.isCut, false);

  const cut = calcRaise({ current: 50_000_000, next: 45_000_000 });
  assert.equal(cut.isCut, true);
  close(cut.rate, -10);
  assert.equal(cut.netMonthlyDiff, -311_856);
  assert.ok(cut.netRate < 0);

  // 월급 전부가 비과세(월 10만원 → 20만원, 비과세 20만원)면 늘어난 만큼 그대로 남는다
  const tiny = calcRaise({ current: 1_200_000, next: 2_400_000 });
  assert.equal(tiny.after.taxable, 0);
  assert.equal(tiny.netMonthlyDiff, 100_000);
  assert.equal(tiny.keepShare, 1);

  // 퇴직금 포함 연봉 5,200만원 = 월 400만원
  const sev = calcRaise({ current: 52_000_000, rate: 5, mode: 'rate', includesSeverance: true });
  assert.equal(sev.before.monthlyGross, 4_000_000);
  assert.equal(sev.after.monthlyGross, 4_200_000);

  // 인상률 범위 양 끝은 받는다
  assert.equal(calcRaise({ mode: 'rate', current: 40_000_000, rate: RATE_MIN }).next, 400_000);
  assert.equal(calcRaise({ mode: 'rate', current: 40_000_000, rate: RATE_MAX }).next, 440_000_000);
});

test('잘못된 입력은 예외 없이 error를 돌려준다', () => {
  for (const current of [0, -1, '', null, undefined, NaN, 'abc', Infinity, 0.5]) {
    assert.ok(calcRaise({ current, next: 42_000_000 }).error, `current=${current}`);
  }
  for (const next of [0, -5, '', null, NaN, 'x', 0.4]) {
    assert.ok(calcRaise({ mode: 'amount', current: 40_000_000, next }).error, `next=${next}`);
  }
  for (const rate of ['', null, undefined, NaN, 'abc', -100, -99.01, 1000.01, Infinity]) {
    assert.ok(calcRaise({ mode: 'rate', current: 40_000_000, rate }).error, `rate=${rate}`);
  }
  // 1원 × (1 − 99%) = 0.01원 → 0원이 되면 오류
  assert.ok(calcRaise({ mode: 'rate', current: 1, rate: -99 }).error);
  assert.ok(calcRaise().error);
  // 문자열 숫자는 받는다
  assert.equal(calcRaise({ mode: 'rate', current: '40000000', rate: '5' }).next, 42_000_000);
  // 이상한 부가 입력은 안전한 값으로
  const odd = calcRaise({ current: 40_000_000, next: 42_000_000, nonTaxable: -1, family: 0, children: -3 });
  assert.equal(odd.before.nonTaxable, 0);
  assert.equal(odd.before.monthlyNet, calcSalary({ amount: 40_000_000, nonTaxable: 0 }).monthlyNet);
});

test('인상률별 표: 3·5·7·10·15·20%, 실수령 인상률이 세전보다 낮다', () => {
  assert.deepEqual(RAISE_STEPS, [3, 5, 7, 10, 15, 20]);
  const rows = raiseTable({ current: 40_000_000 });
  assert.deepEqual(rows.map((x) => x.rate), RAISE_STEPS);
  assert.deepEqual(rows.map((x) => x.next), [41_200_000, 42_000_000, 42_800_000, 44_000_000, 46_000_000, 48_000_000]);
  assert.equal(rows[1].netMonthlyDiff, 130_487);
  for (const row of rows) {
    const r = calcRaise({ mode: 'rate', current: 40_000_000, rate: row.rate });
    assert.equal(row.monthlyNet, r.after.monthlyNet);
    assert.equal(row.netAnnualDiff, row.netMonthlyDiff * 12);
  }
  for (const c of [24e6, 30e6, 40e6, 50e6, 60e6, 70e6, 80e6, 100e6, 150e6, 300e6]) {
    for (const row of raiseTable({ current: c })) assert.ok(row.netRate < row.rate, `${c} ${row.rate}%`);
  }
  assert.deepEqual(raiseTable({ current: 0 }), []);
});

test('실질 인상률: 사용자가 넣은 물가상승률만 쓴다', () => {
  const r = calcRaise({ current: 40_000_000, next: 42_000_000, inflation: 2 });
  close(r.realRate, (105 / 102 - 1) * 100);
  assert.equal(r.inflation, 2);
  for (const inflation of [null, undefined, '', 'abc', -100]) {
    const x = calcRaise({ current: 40_000_000, next: 42_000_000, inflation });
    assert.equal(x.realRate, null);
    assert.equal(x.inflation, null);
  }
  close(calcRaise({ current: 40_000_000, next: 40_000_000, inflation: 0 }).realRate, 0);
});

test('본문·FAQ 숫자가 계산 모듈과 일치한다', async () => {
  const html = await readFile(new URL('../src/pages/raise.html', import.meta.url), 'utf8');
  const text = html.replace(/<[^>]+>/g, '');
  const prose = text.slice(text.indexOf('연봉 인상률 계산 공식'));
  const pctText = (n) => `${+(n * 100).toFixed(4)}%`;
  for (const rate of [INSURANCE.pension.rate, INSURANCE.health.rate, INSURANCE.employment.rate]) {
    assert.ok(prose.includes(pctText(rate)), pctText(rate));
  }
  assert.ok(prose.includes(`${(INSURANCE.care.incomeRate / INSURANCE.health.totalRate * 100).toFixed(2)}%`));
  assert.ok(prose.includes(`${(INSURANCE.health.totalRate * 100).toFixed(2)}%`));
  assert.ok(prose.includes(`${INSURANCE.pension.minBase / 1e4}만~${INSURANCE.pension.maxBase / 1e4}만원`));
  // 4대보험 근로자 부담 합계 ≈ 9.7% (장기요양 = 건강보험료 × 0.9448/7.19)
  const careRate = (INSURANCE.health.rate * INSURANCE.care.incomeRate) / INSURANCE.health.totalRate;
  const insTotal = INSURANCE.pension.rate + INSURANCE.health.rate + careRate + INSURANCE.employment.rate;
  assert.ok(prose.includes(`약 ${(insTotal * 100).toFixed(1)}%`));
  assert.ok(meta.faq.some(([, a]) => a.includes(`약 ${(insTotal * 100).toFixed(1)}%`)));
  for (const b of TAX_BRACKETS) {
    assert.ok(prose.includes(`${Math.round(b.rate * 100)}%`) && prose.includes(fmt(b.deduction)), `${b.rate}`);
  }

  // 본문 예시: 4,000만원 → 4,200만원
  const ex = calcRaise({ current: 40_000_000, next: 42_000_000 });
  for (const n of [ex.before.monthlyGross, ex.after.monthlyGross, ex.grossMonthlyDiff, ex.before.monthlyNet, ex.after.monthlyNet, ex.netMonthlyDiff, ex.netAnnualDiff, ex.insuranceDiff, ex.taxDiff]) {
    assert.ok(prose.includes(fmt(n)), fmt(n));
  }
  assert.ok(prose.includes(`${ex.netRate.toFixed(2)}%`));
  assert.ok(prose.includes(`${(ex.keepShare * 100).toFixed(1)}%`));

  // 연봉별 5% 인상 표
  const table = html.slice(html.indexOf('id="by-salary"'), html.indexOf('</table>', html.indexOf('id="by-salary"')));
  const rows = [...table.matchAll(/<tr><td>([^<]+)<\/td><td>([\d,]+)<\/td><td class="net">([\d,]+)<\/td><td>([\d.]+)%<\/td><td>([\d.]+)%<\/td><\/tr>/g)];
  assert.equal(rows.length, 6);
  const salaries = [30e6, 40e6, 50e6, 60e6, 80e6, 100e6];
  rows.forEach((m, i) => {
    const r = calcRaise({ mode: 'rate', current: salaries[i], rate: 5 });
    assert.equal(m[2], fmt(r.grossMonthlyDiff), `${m[1]} 세전`);
    assert.equal(m[3], fmt(r.netMonthlyDiff), `${m[1]} 실수령`);
    assert.equal(m[4], (r.keepShare * 100).toFixed(1), `${m[1]} 비율`);
    assert.equal(m[5], r.netRate.toFixed(2), `${m[1]} 인상률`);
  });

  // FAQ 숫자
  const faq = meta.faq.map(([q, a]) => q + a).join(' ');
  const ten = calcRaise({ mode: 'rate', current: 40_000_000, rate: 10 });
  const cut = calcRaise({ current: 50_000_000, next: 45_000_000 });
  for (const n of [ex.grossMonthlyDiff, ex.before.monthlyNet, ex.after.monthlyNet, ex.netMonthlyDiff, ten.grossMonthlyDiff, ten.netMonthlyDiff, -cut.netMonthlyDiff]) {
    assert.ok(faq.includes(fmt(n)), `FAQ ${fmt(n)}`);
  }
  assert.ok(faq.includes(`${ten.netRate.toFixed(2)}%`));
  assert.ok(faq.includes(`${(calcRaise({ current: 40_000_000, next: 42_000_000, inflation: 2 }).realRate).toFixed(2)}%`));
  assert.ok(meta.description.includes(fmt(ex.netMonthlyDiff)) && meta.description.includes(`${ex.netRate.toFixed(2)}%`));

  // 본문 분량: h2 3개 이상, 글자 1,000자 이상
  const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  assert.ok((article.match(/<h2>/g) || []).length >= 3);
  assert.ok(article.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length >= 1000);
  assert.ok(article.includes('class="formula"'));
  assert.ok(article.includes('반영하지 않'));
});

test('meta: 분류·순서·설명 길이', () => {
  assert.equal(meta.slug, 'raise');
  assert.equal(meta.category, 'work');
  assert.equal(meta.order, 20);
  assert.equal(meta.popular, undefined);
  assert.ok(meta.description.length >= 120 && meta.description.length <= 160, `description ${meta.description.length}자`);
  assert.ok(meta.faq.length >= 4 && meta.faq.length <= 6);
});
