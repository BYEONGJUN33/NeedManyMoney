// 실수령액 역산: 원하는 월 실수령액을 받으려면 세전 월급·연봉이 얼마여야 하는지 찾는다.
// 공제액은 calc.js의 calcSalary를 그대로 쓴다 (4대보험 요율은 rates.js, 소득세는 taxtable-2026.js의 간이세액표).
// DOM에 의존하지 않는 순수 함수만 둔다 (브라우저·Node 공용).
import { calcSalary } from '../calc.js';
import { TAX_TABLE } from '../taxtable-2026.js';

/* ───────────── 기준값 ───────────── */

// 근로자 식사대 비과세 한도 월 20만원 — 소득세법 제12조제3호 러목, 2023.1.1 이후 발생 소득분부터
// (국가법령정보센터 https://www.law.go.kr/lsLawLinkInfo.do?lsJoLnkSeq=1000383293&chrClsCd=010202 ,
//  정책브리핑 2023-12-11 https://www.korea.kr/news/policyNewsView.do?newsId=148923639 , 확인 2026-10-21)
export const MEAL_NONTAX_LIMIT = 200_000;

// 아래는 법령 기준이 아니라 이 계산기의 입력·표시 설정값
export const MAX_TARGET = 100_000_000; // 목표 월 실수령액 상한 (월 1억원)
export const FAMILY_MAX = 20; // 부양가족 수 상한 (연봉 실수령액 계산기와 같음)
export const CHILDREN_MAX = 10;
export const NEGOTIATION_UNIT = 1_000_000; // 연봉 협상 제시액 단위 (100만원)
// 목표 실수령액별 표: 월 200만~800만원, 50만원 간격
export const TABLE_TARGETS = Array.from({ length: 13 }, (_, i) => 2_000_000 + i * 500_000);

const MAX_STEPS = 10_000; // 탐색 안전장치. 실제로는 200번 안쪽에서 끝난다

/* ───────────── 탐색 ───────────── */

// 간이세액표 행 경계(과세 급여, 원). 한 행 안에서는 소득세가 같다.
const BOUNDS = [...new Set(TAX_TABLE.flatMap((r) => [r[0] * 1000, r[1] * 1000]))].sort((a, b) => a - b);

/** 과세 급여 x보다 큰 첫 행 경계 (월 1,000만원 초과는 산식 구간이라 경계 없음) */
function nextBound(x) {
  let lo = 0;
  let hi = BOUNDS.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (BOUNDS[mid] > x) hi = mid;
    else lo = mid + 1;
  }
  return lo < BOUNDS.length ? BOUNDS[lo] : Infinity;
}

const netAt = (monthly, c) => calcSalary({
  amount: monthly, period: 'monthly', nonTaxable: c.nonTaxable, family: c.family, children: c.children,
}).monthlyNet;

/**
 * 연봉 = unit × m (m은 자연수) 꼴의 금액 가운데 월 실수령액이 target 이상인 가장 작은 연봉.
 * 매달 받는 세전 월급은 floor(연봉 ÷ divisor), divisor는 12 (퇴직금 포함 연봉이면 13).
 *
 * 실수령액은 세전 월급에 대해 단조 증가하지 않는다. 국민연금은 1,000원 미만을 버린 금액에,
 * 건강보험 등은 10원 미만 절사로 붙고, 소득세는 간이세액표 행이 바뀔 때 계단식으로 오른다
 * (공제대상가족 12명 이상은 행이 바뀔 때 세액이 줄기도 한다). 그래서 단순 이분 탐색은
 * 가장 작은 금액을 놓칠 수 있다. 대신 다음 성질을 쓴다.
 *   간이세액표 한 행 안에서는 소득세가 같고 4대보험료는 줄지 않으므로 공제 합계 D가 줄지 않는다.
 *   월급 g의 실수령액이 목표보다 k원 모자라면, 같은 행 안의 g ≤ h < g + k 는 모두
 *   h − D(h) ≤ h − D(g) < 목표 이므로 건너뛰어도 된다. 행 경계를 넘을 때는 경계에서 다시 계산한다.
 * 목표보다 적은 월급은 실수령액이 목표에 닿을 수 없으므로 월급 = 목표에서 시작한다.
 */
function minAnnual(target, c, unit) {
  const d = c.divisor;
  let from = target;
  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const m = Math.ceil((d * from) / unit); // floor(unit × m ÷ d) ≥ from 인 가장 작은 m
    const monthly = Math.floor((unit * m) / d);
    const net = netAt(monthly, c);
    if (net >= target) return { annual: unit * m, monthly, net, steps: step };
    const taxable = monthly - Math.min(c.nonTaxable, monthly);
    const jump = monthly + (target - net);
    from = Math.max(monthly + 1, Math.min(jump, c.nonTaxable + nextBound(taxable)));
  }
  return null;
}

/* ───────────── 입력 정리 ───────────── */

const toNum = (v) => (v === '' || v == null ? NaN : Number(v));
const clampInt = (v, lo, hi, fallback) => {
  const n = toNum(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
};

function normalize(o = {}) {
  const raw = toNum(o.targetNet);
  if (!Number.isFinite(raw) || raw <= 0) return { error: '목표 월 실수령액을 1원 이상으로 입력해 주세요.' };
  if (raw > MAX_TARGET) return { error: `목표 월 실수령액은 ${MAX_TARGET / 1e8}억원 이하로 입력해 주세요.` };
  const nt = toNum(o.nonTaxable ?? MEAL_NONTAX_LIMIT);
  const nonTaxable = Number.isFinite(nt) && nt > 0 ? Math.floor(nt) : 0;
  const family = clampInt(o.family, 1, FAMILY_MAX, 1);
  const wantChildren = clampInt(o.children, 0, CHILDREN_MAX, 0);
  // 8~20세 자녀는 공제대상가족(본인 포함)에 들어가므로 부양가족 수 − 1을 넘을 수 없다
  const children = Math.min(wantChildren, family - 1);
  const includesSeverance = o.includesSeverance === true || o.includesSeverance === 1 || o.includesSeverance === '1';
  return {
    targetNet: Math.ceil(raw), // 실수령액은 원 단위 정수이므로 소수는 올린다
    nonTaxable,
    family,
    children,
    childrenClamped: wantChildren > children,
    includesSeverance,
    divisor: includesSeverance ? 13 : 12,
  };
}

/* ───────────── 계산 ───────────── */

/**
 * @param {object} o
 * @param {number} o.targetNet 목표 월 실수령액 (원)
 * @param {number} [o.nonTaxable] 월 비과세액 (식대 등, 기본 20만원)
 * @param {number} [o.family] 공제대상가족 수 (본인 포함, 1~20)
 * @param {number} [o.children] 그중 8세 이상 20세 이하 자녀 수
 * @param {boolean} [o.includesSeverance] 퇴직금 포함 연봉이면 연봉 = 월급 × 13
 */
export function calcNetToGross(o) {
  const c = normalize(o);
  if (c.error) return c;
  const exact = minAnnual(c.targetNet, c, 1);
  const nego = minAnnual(c.targetNet, c, NEGOTIATION_UNIT);
  if (!exact || !nego) return { error: '금액을 찾지 못했습니다. 입력값을 확인해 주세요.' };

  // 찾은 연봉을 연봉 실수령액 계산기와 같은 방식으로 다시 계산해 공제 내역을 만든다
  const salaryOf = (annual) => calcSalary({
    amount: annual,
    period: 'annual',
    includesSeverance: c.includesSeverance,
    nonTaxable: c.nonTaxable,
    family: c.family,
    children: c.children,
  });
  const salary = salaryOf(exact.annual);
  const negoSalary = salaryOf(nego.annual);
  return {
    ...c,
    monthlyGross: exact.monthly,
    annualGross: exact.annual,
    severancePart: c.includesSeverance ? exact.annual - exact.monthly * 12 : 0,
    salary,
    surplus: salary.monthlyNet - c.targetNet,
    negotiation: {
      unit: NEGOTIATION_UNIT,
      annualGross: nego.annual,
      monthlyGross: nego.monthly,
      monthlyNet: negoSalary.monthlyNet,
      surplus: negoSalary.monthlyNet - c.targetNet,
    },
    steps: exact.steps + nego.steps,
  };
}

/** 목표 실수령액별 필요 연봉 표 (월 200만~800만원, 50만원 간격). 조건은 o와 같고 목표만 바꾼다. */
export function netToGrossTable(o = {}, targets = TABLE_TARGETS) {
  return targets.map((targetNet) => {
    const r = calcNetToGross({ ...o, targetNet });
    if (r.error) return { targetNet, error: r.error };
    return {
      targetNet,
      monthlyGross: r.monthlyGross,
      annualGross: r.annualGross,
      negotiationAnnual: r.negotiation.annualGross,
      monthlyNet: r.salary.monthlyNet,
      totalDeduction: r.salary.totalDeduction,
      deductionRate: r.salary.deductionRate,
    };
  });
}
