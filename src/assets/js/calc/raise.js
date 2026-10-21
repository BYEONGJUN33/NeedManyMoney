// 연봉 인상률 계산 — 인상률·인상 후 연봉과 인상 전후 월 실수령액 비교. DOM 없음 (브라우저·Node 공용).
//
// 4대보험 요율과 근로소득 간이세액표는 이 파일에 따로 두지 않고 공유 모듈 calc.js의 calcSalary를 그대로 쓴다.
//   - 4대보험 근로자 부담: rates.js INSURANCE (국민연금 4.75%, 건강보험 3.595%, 장기요양 13.14%, 고용보험 0.9%)
//   - 소득세: taxtable-2026.js (소득세법 시행령 [별표 2] 근로소득 간이세액표, 2026.3.1 이후 지급분)
// 아래 상수는 법령 기준값이 아니라 이 계산기의 비교용 예시와 입력 범위다.
import { calcSalary } from '../calc.js';

// 인상률별 비교표의 인상률(%) — 비교용 예시값
export const RAISE_STEPS = [3, 5, 7, 10, 15, 20];

// 인상률 입력 범위(%) — 계산기 자체 제한. −100% 이하는 연봉이 0원 이하가 되므로 받지 않는다.
export const RATE_MIN = -99;
export const RATE_MAX = 1000;

// 빈 값·숫자가 아닌 값은 null, 나머지는 숫자
const toNum = (v) => {
  if (v === '' || v == null || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 인상 후 연봉 = 현재 연봉 × (1 + 인상률 ÷ 100), 원 미만 반올림.
 * 1.07 같은 소수 곱셈의 부동소수점 오차(42,799,999.999…)가 반올림 경계를 넘지 않도록 0.001원 단위로 먼저 맞춘다.
 */
export function nextSalary(current, ratePct) {
  const raw = (current * (100 + ratePct)) / 100;
  return Math.round(Math.round(raw * 1000) / 1000);
}

/** 인상률(%) = (인상 후 연봉 − 현재 연봉) ÷ 현재 연봉 × 100. 반올림하지 않은 값 */
export function raiseRate(current, next) {
  return ((next - current) / current) * 100;
}

const sumOf = (list) => list.reduce((s, d) => s + d.value, 0);

/**
 * @param {object} o
 * @param {'amount'|'rate'} [o.mode] amount: 인상 후 연봉을 알고 인상률을 구한다 / rate: 인상률을 알고 인상 후 연봉을 구한다
 * @param {number} o.current 현재 연봉 (세전, 원)
 * @param {number} [o.next] 인상 후 연봉 (세전, 원) — mode 'amount'
 * @param {number} [o.rate] 인상률 (%) — mode 'rate'. 삭감은 음수
 * @param {number} [o.nonTaxable] 월 비과세액 (식대 등). 인상 전후 같다고 본다
 * @param {number} [o.family] 공제대상가족 수 (본인 포함)
 * @param {number} [o.children] 8세 이상 20세 이하 자녀 수
 * @param {boolean} [o.includesSeverance] 퇴직금 포함 연봉이면 13으로 나눈다
 * @param {number|null} [o.inflation] 비교할 물가상승률 (%). 사용자가 넣은 값만 쓴다
 */
export function calcRaise({
  mode = 'amount', current, next, rate,
  nonTaxable = 200_000, family = 1, children = 0, includesSeverance = false, inflation = null,
} = {}) {
  const cur = toNum(current);
  if (cur == null || cur <= 0) return { error: '현재 연봉을 0원보다 큰 금액으로 입력해 주세요.' };
  const curWon = Math.floor(cur);
  if (curWon <= 0) return { error: '현재 연봉을 0원보다 큰 금액으로 입력해 주세요.' };

  let nextWon;
  let ratePct;
  if (mode === 'rate') {
    const r = toNum(rate);
    if (r == null) return { error: '인상률을 숫자로 입력해 주세요. 예: 5' };
    if (r < RATE_MIN || r > RATE_MAX) {
      return { error: `인상률은 ${RATE_MIN}%에서 ${RATE_MAX.toLocaleString('ko-KR')}% 사이로 입력해 주세요.` };
    }
    ratePct = r;
    nextWon = nextSalary(curWon, r);
    if (nextWon <= 0) return { error: '인상 후 연봉이 0원 이하가 됩니다. 인상률을 확인해 주세요.' };
  } else {
    const n = toNum(next);
    if (n == null || n <= 0) return { error: '인상 후 연봉을 0원보다 큰 금액으로 입력해 주세요.' };
    nextWon = Math.floor(n);
    if (nextWon <= 0) return { error: '인상 후 연봉을 0원보다 큰 금액으로 입력해 주세요.' };
    ratePct = raiseRate(curWon, nextWon);
  }

  const opts = {
    period: 'annual',
    includesSeverance: !!includesSeverance,
    nonTaxable: Math.max(0, toNum(nonTaxable) ?? 0),
    family: Math.max(1, Math.floor(toNum(family) ?? 1)),
    children: Math.max(0, Math.floor(toNum(children) ?? 0)),
  };
  const before = calcSalary({ amount: curWon, ...opts });
  const after = calcSalary({ amount: nextWon, ...opts });

  // 공제 항목별 인상 전후 비교 (calcSalary 순서: 국민연금·건강보험·장기요양·고용보험·근로소득세·지방소득세)
  const items = before.deductions.map((d, i) => ({
    key: d.key,
    label: d.label,
    before: d.value,
    after: after.deductions[i].value,
    diff: after.deductions[i].value - d.value,
  }));
  const insuranceDiff = sumOf(after.deductions.slice(0, 4)) - sumOf(before.deductions.slice(0, 4));
  const taxDiff = sumOf(after.deductions.slice(4)) - sumOf(before.deductions.slice(4));

  const grossMonthlyDiff = after.monthlyGross - before.monthlyGross;
  const netMonthlyDiff = after.monthlyNet - before.monthlyNet;
  // 실수령 기준 인상률: 월 실수령액 증가 ÷ 인상 전 월 실수령액
  const netRate = before.monthlyNet > 0 ? (netMonthlyDiff / before.monthlyNet) * 100 : null;
  // 세전 월급 증가분 중 통장에 남는 몫 (나머지는 4대보험·세금 증가)
  const keepShare = grossMonthlyDiff !== 0 ? netMonthlyDiff / grossMonthlyDiff : null;

  // 실질 인상률 = (1 + 인상률) ÷ (1 + 물가상승률) − 1. 물가상승률은 사용자가 넣은 경우에만 계산
  const inf = toNum(inflation);
  const realRate = inf != null && inf > -100 ? (((100 + ratePct) / (100 + inf)) - 1) * 100 : null;

  return {
    mode: mode === 'rate' ? 'rate' : 'amount',
    current: curWon,
    next: nextWon,
    rate: ratePct,
    isCut: nextWon < curWon,
    grossAnnualDiff: nextWon - curWon,
    grossMonthlyDiff,
    before,
    after,
    items,
    insuranceDiff,
    taxDiff,
    netMonthlyDiff,
    netAnnualDiff: netMonthlyDiff * 12,
    netRate,
    keepShare,
    inflation: realRate == null ? null : inf,
    realRate,
  };
}

/**
 * 같은 조건에서 인상률만 바꿔 본 비교표.
 * @param {object} o calcRaise 입력 (current, nonTaxable, family, children, includesSeverance)
 * @param {number[]} [steps] 인상률(%) 목록
 */
export function raiseTable(o, steps = RAISE_STEPS) {
  const rows = [];
  for (const rate of steps) {
    const r = calcRaise({ ...o, mode: 'rate', rate });
    if (r.error) return [];
    rows.push({
      rate,
      next: r.next,
      monthlyNet: r.after.monthlyNet,
      netMonthlyDiff: r.netMonthlyDiff,
      netAnnualDiff: r.netAnnualDiff,
      netRate: r.netRate,
    });
  }
  return rows;
}
