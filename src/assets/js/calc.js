// 머니셈 계산 엔진. DOM에 의존하지 않는 순수 함수만 둔다 (브라우저·Node 공용).
import { TAX_TABLE } from './taxtable-2026.js';
import {
  INSURANCE, LOCAL_TAX_RATE, CHILD_CREDIT, MIN_WAGE, INTEREST_TAX, TAX_BRACKETS,
} from './rates.js';

// 요율 곱셈의 부동소수점 오차(25,199.9999…)가 10원 절사에서 한 단계 내려가지 않도록 0.001원 단위로 먼저 맞춘다
export const floor10 = (n) => Math.floor(Math.round(n * 1000) / 10_000) * 10;
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const num = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback);

/* ───────────── 근로소득 원천징수 (간이세액표) ───────────── */

const TABLE_FAMILY_MAX = 11;

function tableRow(monthlyTaxable) {
  const k = monthlyTaxable / 1000;
  let lo = 0;
  let hi = TAX_TABLE.length - 2; // 마지막 행(10,000천원 정확히)은 따로 처리
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [from, to] = TAX_TABLE[mid];
    if (k < from) hi = mid - 1;
    else if (k >= to) lo = mid + 1;
    else return TAX_TABLE[mid];
  }
  return null;
}

// 간이세액표 상 공제대상가족 n명(1~11)의 월 소득세. 자녀공제·원천징수 비율 적용 전.
function tableTax(monthlyTaxable, family) {
  const col = 1 + family;
  if (monthlyTaxable < TAX_TABLE[0][0] * 1000) return 0;
  const top = TAX_TABLE[TAX_TABLE.length - 1];
  const base = top[col];
  const x = monthlyTaxable;
  const M = 1_000_000;
  if (x < 10 * M) return tableRow(x)[col];
  if (x === 10 * M) return base;
  if (x <= 14 * M) return base + (x - 10 * M) * 0.98 * 0.35 + 25_000;
  if (x <= 28 * M) return base + 1_397_000 + (x - 14 * M) * 0.98 * 0.38;
  if (x <= 30 * M) return base + 6_610_600 + (x - 28 * M) * 0.98 * 0.40;
  if (x <= 45 * M) return base + 7_394_600 + (x - 30 * M) * 0.40;
  if (x <= 87 * M) return base + 13_394_600 + (x - 45 * M) * 0.42;
  return base + 31_034_600 + (x - 87 * M) * 0.45;
}

export function childCredit(children) {
  if (children <= 0) return 0;
  if (children === 1) return CHILD_CREDIT.one;
  return CHILD_CREDIT.two + (children - 2) * CHILD_CREDIT.extra;
}

/**
 * 월 근로소득세(간이세액)와 지방소득세.
 * @param {number} monthlyTaxable 비과세를 뺀 월급여
 * @param {number} family 공제대상가족 수 (본인 포함)
 * @param {number} children 그중 8세 이상 20세 이하 자녀 수
 * @param {number} ratio 원천징수 비율 (0.8 / 1 / 1.2)
 */
export function withholdingTax(monthlyTaxable, family = 1, children = 0, ratio = 1) {
  const f = Math.max(1, Math.floor(family));
  let tax;
  if (f <= TABLE_FAMILY_MAX) {
    tax = tableTax(monthlyTaxable, f);
  } else {
    const t11 = tableTax(monthlyTaxable, 11);
    const t10 = tableTax(monthlyTaxable, 10);
    tax = t11 - (t10 - t11) * (f - 11);
  }
  tax = floor10(Math.max(0, tax));
  tax = Math.max(0, tax - childCredit(Math.max(0, Math.floor(children))));
  const incomeTax = floor10(tax * ratio);
  const localTax = floor10(incomeTax * LOCAL_TAX_RATE);
  return { incomeTax, localTax };
}

/* ───────────── 4대보험 ───────────── */

export function socialInsurance(monthlyTaxable) {
  const { pension, health, care, employment } = INSURANCE;
  const pensionBase = clamp(Math.floor(monthlyTaxable / 1000) * 1000, pension.minBase, pension.maxBase);
  const pensionFee = monthlyTaxable > 0 ? floor10(pensionBase * pension.rate) : 0;
  const healthFee = floor10(monthlyTaxable * health.rate);
  const careFee = floor10(healthFee * (care.incomeRate / health.totalRate));
  const employmentFee = floor10(monthlyTaxable * employment.rate);
  return { pension: pensionFee, health: healthFee, care: careFee, employment: employmentFee };
}

/* ───────────── 연봉·월급 실수령액 ───────────── */

/**
 * @param {object} o
 * @param {number} o.amount 금액 (세전)
 * @param {'annual'|'monthly'} [o.period]
 * @param {boolean} [o.includesSeverance] 퇴직금 포함 연봉이면 13으로 나눈다
 * @param {number} [o.nonTaxable] 월 비과세액 (식대 등)
 * @param {number} [o.family] 공제대상가족 수 (본인 포함)
 * @param {number} [o.children] 8세 이상 20세 이하 자녀 수
 * @param {number} [o.ratio] 원천징수 비율 (0.8 / 1 / 1.2)
 */
export function calcSalary({
  amount, period = 'annual', includesSeverance = false,
  nonTaxable = 200_000, family = 1, children = 0, ratio = 1,
}) {
  const a = Math.max(0, num(amount));
  const monthlyGross = period === 'annual'
    ? Math.floor(a / (includesSeverance ? 13 : 12))
    : Math.floor(a);
  const nonTax = Math.min(Math.max(0, num(nonTaxable)), monthlyGross);
  const taxable = monthlyGross - nonTax;
  const ins = socialInsurance(taxable);
  const tax = withholdingTax(taxable, family, children, ratio);
  const deductions = [
    { key: 'pension', label: '국민연금', value: ins.pension },
    { key: 'health', label: '건강보험', value: ins.health },
    { key: 'care', label: '장기요양', value: ins.care },
    { key: 'employment', label: '고용보험', value: ins.employment },
    { key: 'incomeTax', label: '근로소득세', value: tax.incomeTax },
    { key: 'localTax', label: '지방소득세', value: tax.localTax },
  ];
  const totalDeduction = deductions.reduce((s, d) => s + d.value, 0);
  const monthlyNet = monthlyGross - totalDeduction;
  return {
    monthlyGross,
    nonTaxable: nonTax,
    taxable,
    deductions,
    totalDeduction,
    monthlyNet,
    annualNet: monthlyNet * 12,
    deductionRate: monthlyGross ? totalDeduction / monthlyGross : 0,
  };
}

/* ───────────── 날짜 유틸 (UTC 기준, 'YYYY-MM-DD') ───────────── */

const DAY = 86_400_000;
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  return d.getUTCDate() === +m[3] ? t : null;
}
export const daysBetween = (a, b) => Math.round((b - a) / DAY);
function addMonthsUTC(t, months) {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(day, last));
}

/** 근속연수: 1년 미만 끝수는 1년으로 올림 (소득세법 시행령 제105조) */
export function serviceYears(start, end) {
  let months = 0;
  while (addMonthsUTC(start, months + 1) <= end) months += 1;
  const exact = addMonthsUTC(start, months) === end;
  const years = Math.floor(months / 12);
  return exact && months % 12 === 0 ? years : years + 1;
}

/* ───────────── 퇴직금 · 퇴직소득세 ───────────── */

export function basicTax(base) {
  if (base <= 0) return 0;
  const b = TAX_BRACKETS.find((x) => base <= x.upTo);
  return base * b.rate - b.deduction;
}

function serviceDeduction(years) {
  if (years <= 5) return 1_000_000 * years;
  if (years <= 10) return 5_000_000 + 2_000_000 * (years - 5);
  if (years <= 20) return 15_000_000 + 2_500_000 * (years - 10);
  return 40_000_000 + 3_000_000 * (years - 20);
}

function convertedPayDeduction(pay) {
  if (pay <= 8_000_000) return pay;
  if (pay <= 70_000_000) return 8_000_000 + (pay - 8_000_000) * 0.6;
  if (pay <= 100_000_000) return 45_200_000 + (pay - 70_000_000) * 0.55;
  if (pay <= 300_000_000) return 61_700_000 + (pay - 100_000_000) * 0.45;
  return 151_700_000 + (pay - 300_000_000) * 0.35;
}

/** 퇴직소득세 (2023년 이후 퇴직분) */
export function retirementTax(severancePay, years) {
  const y = Math.max(1, years);
  const sDed = serviceDeduction(y);
  const converted = Math.max(0, ((severancePay - sDed) * 12) / y);
  const cDed = convertedPayDeduction(converted);
  const taxBase = Math.max(0, converted - cDed);
  const convertedTax = basicTax(taxBase);
  const incomeTax = Math.max(0, Math.floor((convertedTax * y) / 12));
  const localTax = Math.floor(incomeTax * LOCAL_TAX_RATE);
  return {
    serviceDeduction: sDed, converted, convertedDeduction: cDed, taxBase, incomeTax, localTax,
  };
}

/**
 * @param {object} o
 * @param {string} o.start 입사일 'YYYY-MM-DD'
 * @param {string} o.end 퇴직일 (마지막 근무일의 다음 날)
 * @param {number} o.wages3m 퇴직 전 3개월 임금 총액 (세전)
 * @param {number} [o.annualBonus] 직전 1년 상여금 총액
 * @param {number} [o.annualLeavePay] 직전 1년 연차수당 총액
 */
export function calcSeverance({ start, end, wages3m, annualBonus = 0, annualLeavePay = 0 }) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (s == null || e == null) return { error: '입사일과 퇴직일을 확인해 주세요.' };
  if (e <= s) return { error: '퇴직일은 입사일보다 뒤여야 합니다.' };
  const workDays = daysBetween(s, e);
  const periodStart = addMonthsUTC(e, -3);
  const periodDays = daysBetween(Math.max(periodStart, s), e);
  const wageSum = num(wages3m) + (num(annualBonus) * 3) / 12 + (num(annualLeavePay) * 3) / 12;
  const avgDaily = periodDays > 0 ? wageSum / periodDays : 0;
  const pay = Math.floor(avgDaily * 30 * (workDays / 365));
  const years = serviceYears(s, e);
  const eligible = workDays >= 365;
  const tax = retirementTax(eligible ? pay : 0, years);
  const net = eligible ? pay - tax.incomeTax - tax.localTax : 0;
  return {
    workDays, periodDays, wageSum, avgDaily, years, eligible,
    pay: eligible ? pay : 0, estimatedPay: pay, tax, net,
  };
}

/* ───────────── 대출 상환 ───────────── */

/**
 * @param {object} o
 * @param {number} o.principal 대출 원금
 * @param {number} o.annualRate 연 이자율 (%)
 * @param {number} o.months 대출 기간 (개월, 거치기간 포함)
 * @param {'annuity'|'principal'|'bullet'} o.method 원리금균등 / 원금균등 / 만기일시
 * @param {number} [o.graceMonths] 거치기간 (개월, 이자만 납부)
 */
export function calcLoan({ principal, annualRate, months, method = 'annuity', graceMonths = 0 }) {
  const P = Math.max(0, Math.round(num(principal)));
  const n = Math.max(1, Math.floor(num(months, 1)));
  const g = method === 'bullet' ? 0 : clamp(Math.floor(num(graceMonths)), 0, n - 1);
  const r = Math.max(0, num(annualRate)) / 100 / 12;
  const k = n - g;
  const annuity = r === 0 ? P / k : (P * r * (1 + r) ** k) / ((1 + r) ** k - 1);
  const schedule = [];
  let balance = P;
  for (let m = 1; m <= n; m += 1) {
    const interest = Math.round(balance * r);
    let principalPart = 0;
    if (m === n) principalPart = balance;
    else if (m > g) {
      if (method === 'annuity') principalPart = Math.round(annuity) - interest;
      else if (method === 'principal') principalPart = Math.round(P / k);
    }
    principalPart = clamp(principalPart, 0, balance);
    balance -= principalPart;
    schedule.push({ month: m, payment: principalPart + interest, principal: principalPart, interest, balance });
  }
  const totalInterest = schedule.reduce((s, x) => s + x.interest, 0);
  const firstAmortizing = schedule[g] || schedule[0];
  return {
    principal: P,
    months: n,
    graceMonths: g,
    schedule,
    totalInterest,
    totalPayment: P + totalInterest,
    firstPayment: schedule[0].payment,
    regularPayment: firstAmortizing.payment,
    lastPayment: schedule[n - 1].payment,
  };
}

/* ───────────── 예금·적금 이자 ───────────── */

/**
 * @param {object} o
 * @param {'deposit'|'installment'} o.product 정기예금 / 정기적금
 * @param {number} o.amount 예치금 (예금) 또는 월 납입액 (적금)
 * @param {number} o.annualRate 연 이자율 (%)
 * @param {number} o.months 기간 (개월)
 * @param {'simple'|'monthly'} [o.compounding] 단리 / 월복리
 * @param {'normal'|'preferential'|'exempt'} [o.taxType]
 */
export function calcSavings({ product = 'installment', amount, annualRate, months, compounding = 'simple', taxType = 'normal' }) {
  const A = Math.max(0, num(amount));
  const n = Math.max(1, Math.floor(num(months, 1)));
  const r = Math.max(0, num(annualRate)) / 100;
  const mr = r / 12;
  let interest;
  let principal;
  if (product === 'deposit') {
    principal = A;
    interest = compounding === 'monthly' ? A * ((1 + mr) ** n - 1) : (A * r * n) / 12;
  } else {
    principal = A * n;
    if (compounding === 'monthly') {
      interest = 0;
      for (let i = 1; i <= n; i += 1) interest += A * ((1 + mr) ** i - 1);
    } else {
      interest = (A * r * (n * (n + 1))) / 2 / 12;
    }
  }
  interest = Math.floor(interest);
  const taxRate = (INTEREST_TAX[taxType] || INTEREST_TAX.normal).rate;
  const tax = floor10(interest * taxRate);
  return {
    principal, interest, tax, taxRate,
    netInterest: interest - tax,
    maturity: principal + interest - tax,
    effectiveRate: principal ? ((interest - tax) / principal) * (12 / n) : 0,
  };
}

/* ───────────── 시급·주휴수당·월급 환산 ───────────── */

export const WEEKS_PER_MONTH = 365 / 7 / 12;

/** 주휴시간: 주 15시간 이상 근무 시 (주 소정근로시간 ÷ 40) × 8, 최대 8시간 */
export function weeklyHolidayHours(weeklyHours) {
  if (weeklyHours < 15) return 0;
  return (Math.min(weeklyHours, 40) / 40) * 8;
}

/**
 * @param {object} o
 * @param {'hourly'|'monthly'|'annual'} o.mode 입력 금액의 단위
 * @param {number} o.amount
 * @param {number} [o.weeklyHours] 주 소정근로시간 (최대 40)
 * @param {number} [o.overtimeHours] 주 연장근로시간 (1.5배)
 * @param {number} [o.year] 최저임금 비교 연도
 */
export function calcHourly({ mode = 'hourly', amount, weeklyHours = 40, overtimeHours = 0, year = 2026 }) {
  const wh = clamp(num(weeklyHours, 40), 0, 40);
  const ot = clamp(num(overtimeHours), 0, 52);
  const holidayHours = weeklyHolidayHours(wh);
  const monthlyHours = Math.round((wh + holidayHours) * WEEKS_PER_MONTH);
  const overtimeMonthlyHours = ot * WEEKS_PER_MONTH;
  const paidHourUnits = monthlyHours + overtimeMonthlyHours * 1.5;
  const a = Math.max(0, num(amount));
  let hourly;
  if (mode === 'hourly') hourly = a;
  else if (mode === 'monthly') hourly = paidHourUnits ? a / paidHourUnits : 0;
  else hourly = paidHourUnits ? a / 12 / paidHourUnits : 0;
  const monthly = mode === 'monthly' ? a : mode === 'annual' ? a / 12 : Math.round(hourly * paidHourUnits);
  const minWage = MIN_WAGE[year] ?? MIN_WAGE[2026];
  return {
    hourly,
    weeklyHours: wh,
    holidayHours,
    weeklyHolidayPay: Math.round(holidayHours * hourly),
    weeklyPay: Math.round((wh + holidayHours + ot * 1.5) * hourly),
    monthlyHours,
    overtimeMonthlyHours,
    monthly: Math.round(monthly),
    annual: Math.round(monthly * 12),
    minWage,
    minMonthly: Math.round(minWage * monthlyHours),
    meetsMinWage: hourly + 1e-9 >= minWage,
  };
}
