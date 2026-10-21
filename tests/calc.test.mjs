import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  withholdingTax, socialInsurance, calcSalary, calcSeverance, retirementTax, serviceYears,
  parseDate, calcLoan, calcSavings, calcHourly, weeklyHolidayHours,
} from '../src/assets/js/calc.js';
import { TAX_TABLE } from '../src/assets/js/taxtable-2026.js';

test('간이세액표: 데이터 구간이 빈틈없이 이어진다', () => {
  assert.equal(TAX_TABLE.length, 647);
  for (let i = 1; i < TAX_TABLE.length - 1; i += 1) {
    assert.equal(TAX_TABLE[i][0], TAX_TABLE[i - 1][1], `row ${i}`);
  }
  for (const row of TAX_TABLE) assert.equal(row.length, 13);
});

test('간이세액표: 원문 값과 일치한다', () => {
  // 월 3,000~3,020천원, 1명 → 74,350원 (원문 표)
  assert.deepEqual(withholdingTax(3_000_000, 1), { incomeTax: 74_350, localTax: 7_430 });
  // 월 3,500~3,520천원, 4명 → 49,340원, 자녀 2명이면 49,340 − 45,830 = 3,510원 (국세청 안내 예시)
  assert.equal(withholdingTax(3_510_000, 4).incomeTax, 49_340);
  assert.equal(withholdingTax(3_510_000, 4, 2).incomeTax, 3_510);
  // 월 10,000천원, 1명 → 1,507,400원
  assert.equal(withholdingTax(10_000_000, 1).incomeTax, 1_507_400);
});

test('간이세액표: 월 1천만원 초과 구간 산식', () => {
  // 1,507,400 + 2,000,000 × 98% × 35% + 25,000
  assert.equal(withholdingTax(12_000_000, 1).incomeTax, 2_218_400);
  // 14,000천원 경계는 두 산식이 같은 값
  assert.equal(withholdingTax(14_000_000, 1).incomeTax, 1_507_400 + 1_397_000);
});

test('간이세액표: 11명 초과, 비과세 구간, 원천징수 비율, 자녀공제 하한', () => {
  // 5,000~5,020천원: 11명 87,850, 10명 106,600 → 15명 = 87,850 − 18,750 × 4
  assert.equal(withholdingTax(5_000_000, 15).incomeTax, 12_850);
  assert.equal(withholdingTax(700_000, 1).incomeTax, 0);
  assert.equal(withholdingTax(3_000_000, 1, 0, 0.8).incomeTax, 59_480);
  assert.equal(withholdingTax(3_000_000, 1, 0, 1.2).incomeTax, 89_220);
  assert.equal(withholdingTax(2_000_000, 3, 2).incomeTax, 0);
});

test('4대보험: 2026년 요율과 국민연금 상한', () => {
  assert.deepEqual(socialInsurance(2_800_000), {
    pension: 133_000, health: 100_660, care: 13_220, employment: 25_200,
  });
  assert.equal(socialInsurance(10_000_000).pension, 313_020);
  assert.equal(socialInsurance(300_000).pension, 19_470);
});

test('연봉 실수령액: 공제 합계와 실수령액이 맞아떨어진다', () => {
  const r = calcSalary({ amount: 36_000_000 });
  assert.equal(r.monthlyGross, 3_000_000);
  assert.equal(r.taxable, 2_800_000);
  assert.equal(r.totalDeduction, r.deductions.reduce((s, d) => s + d.value, 0));
  assert.equal(r.monthlyNet, 3_000_000 - r.totalDeduction);
  assert.equal(r.annualNet, r.monthlyNet * 12);
  const sev = calcSalary({ amount: 39_000_000, includesSeverance: true });
  assert.equal(sev.monthlyGross, 3_000_000);
  const monthly = calcSalary({ amount: 3_000_000, period: 'monthly' });
  assert.equal(monthly.monthlyNet, r.monthlyNet);
});

test('근속연수: 1년 미만 끝수는 올림', () => {
  assert.equal(serviceYears(parseDate('2021-01-01'), parseDate('2026-01-01')), 5);
  assert.equal(serviceYears(parseDate('2021-01-01'), parseDate('2026-01-02')), 6);
  assert.equal(serviceYears(parseDate('2025-03-15'), parseDate('2026-03-14')), 1);
  assert.equal(parseDate('2026-02-30'), null);
});

test('퇴직소득세: 퇴직금 3,000만원, 근속 5년', () => {
  const t = retirementTax(30_000_000, 5);
  assert.equal(t.converted, 60_000_000);
  assert.equal(t.taxBase, 20_800_000);
  assert.equal(t.incomeTax, 775_000);
  assert.equal(t.localTax, 77_500);
});

test('퇴직금: 평균임금 × 30일 × 재직일수/365', () => {
  const r = calcSeverance({ start: '2021-01-01', end: '2026-01-01', wages3m: 9_200_000 });
  assert.equal(r.workDays, 1826);
  assert.equal(r.periodDays, 92);
  assert.equal(r.years, 5);
  assert.equal(r.pay, Math.floor(100_000 * 30 * (1826 / 365)));
  assert.equal(r.net, r.pay - r.tax.incomeTax - r.tax.localTax);
  const short = calcSeverance({ start: '2025-06-01', end: '2026-03-01', wages3m: 9_000_000 });
  assert.equal(short.eligible, false);
  assert.equal(short.pay, 0);
  assert.ok(calcSeverance({ start: '2026-01-01', end: '2025-01-01', wages3m: 1 }).error);
});

test('대출: 원리금균등 1억, 연 4%, 30년', () => {
  const r = calcLoan({ principal: 100_000_000, annualRate: 4, months: 360 });
  assert.equal(r.regularPayment, 477_415);
  assert.equal(r.schedule.at(-1).balance, 0);
  assert.equal(r.schedule.reduce((s, x) => s + x.principal, 0), 100_000_000);
});

test('대출: 원금균등, 만기일시, 거치기간', () => {
  const p = calcLoan({ principal: 12_000_000, annualRate: 6, months: 12, method: 'principal' });
  assert.equal(p.firstPayment, 1_060_000);
  assert.equal(p.totalInterest, 390_000);
  const b = calcLoan({ principal: 10_000_000, annualRate: 5, months: 12, method: 'bullet' });
  assert.equal(b.schedule[0].principal, 0);
  assert.equal(b.lastPayment, 10_000_000 + 41_667);
  const g = calcLoan({ principal: 12_000_000, annualRate: 6, months: 24, method: 'principal', graceMonths: 12 });
  assert.equal(g.schedule[11].principal, 0);
  assert.equal(g.schedule[12].principal, 1_000_000);
  assert.equal(g.schedule.at(-1).balance, 0);
  const zero = calcLoan({ principal: 1_200_000, annualRate: 0, months: 12 });
  assert.equal(zero.totalInterest, 0);
  assert.equal(zero.regularPayment, 100_000);
});

test('예적금: 단리·월복리, 이자과세', () => {
  const s = calcSavings({ product: 'installment', amount: 1_000_000, annualRate: 4, months: 12 });
  assert.equal(s.interest, 260_000);
  assert.equal(s.tax, 40_040);
  assert.equal(s.maturity, 12_000_000 + 260_000 - 40_040);
  const d = calcSavings({ product: 'deposit', amount: 10_000_000, annualRate: 3.5, months: 12 });
  assert.equal(d.interest, 350_000);
  assert.equal(d.tax, 53_900);
  const dc = calcSavings({ product: 'deposit', amount: 10_000_000, annualRate: 3.5, months: 12, compounding: 'monthly' });
  assert.equal(dc.interest, Math.floor(10_000_000 * ((1 + 0.035 / 12) ** 12 - 1)));
  assert.equal(calcSavings({ product: 'deposit', amount: 10_000_000, annualRate: 3.5, months: 12, taxType: 'exempt' }).tax, 0);
});

test('시급: 2026년 최저임금 월 환산 209시간', () => {
  const r = calcHourly({ mode: 'hourly', amount: 10_320 });
  assert.equal(r.monthlyHours, 209);
  assert.equal(r.monthly, 2_156_880);
  assert.equal(r.weeklyHolidayPay, 82_560);
  assert.equal(r.meetsMinWage, true);
  assert.equal(calcHourly({ mode: 'hourly', amount: 10_700, year: 2027 }).monthly, 2_236_300);
  assert.equal(weeklyHolidayHours(14), 0);
  assert.equal(weeklyHolidayHours(20), 4);
  assert.equal(calcHourly({ mode: 'hourly', amount: 10_320, weeklyHours: 20 }).monthlyHours, 104);
  const back = calcHourly({ mode: 'monthly', amount: 2_156_880 });
  assert.equal(Math.round(back.hourly), 10_320);
  assert.equal(calcHourly({ mode: 'monthly', amount: 2_000_000 }).meetsMinWage, false);
});
