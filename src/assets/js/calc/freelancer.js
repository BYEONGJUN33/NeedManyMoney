// 3.3% 계산기: 프리랜서 사업소득(3.3%)·기타소득(8.8%) 원천징수세액과 실수령액, 실수령액으로 세전 지급액 역산.
// DOM에 의존하지 않는 순수 함수만 둔다 (브라우저·Node 공용).
import { LOCAL_TAX_RATE } from '../rates.js';

/* ───────────── 기준값 (확인 2026-10-21) ─────────────
 * 법령 본문: 국가법령정보센터 소득세법(시행 2026.7.1) https://www.law.go.kr/법령/소득세법
 *            소득세법 시행령(시행 2026.10.1) https://www.law.go.kr/법령/소득세법시행령
 *            지방세법(시행 2026.7.1) https://www.law.go.kr/법령/지방세법
 *            국고금관리법 https://www.law.go.kr/법령/국고금관리법
 * 국세청 안내: 사업소득 원천징수방법 https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6622&cntntsId=7902
 *              기타소득 원천징수 방법 https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6457&cntntsId=7893
 *              원천징수 개요(소액부징수) https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2289&cntntsId=7701
 */

// 원천징수대상 사업소득 원천징수세율 100분의 3 — 소득세법 제129조제1항제3호 (확인 2026-10-21)
//   (외국인 직업운동가의 프로구단 계약 소득 20%는 이 계산기에서 다루지 않는다)
export const BUSINESS_RATE_PCT = 3;

// 그 밖의 기타소득 원천징수세율 100분의 20 — 소득세법 제129조제1항제6호라목 (확인 2026-10-21)
export const OTHER_RATE_PCT = 20;

// 개인지방소득세 특별징수 = 원천징수하는 소득세의 100분의 10 — 지방세법 제103조의13제1항 (확인 2026-10-21)
// rates.js의 LOCAL_TAX_RATE(0.1)와 같은 값이다
export const LOCAL_RATE_PCT = Math.round(LOCAL_TAX_RATE * 100);

// 기타소득 필요경비 의제율 — 소득세법 시행령 제87조 (확인 2026-10-21)
//   60%: 제1호의2 — 법 제21조제1항제7호(산업재산권 등 양도·대여)·제8호의2(통신판매중개 물품·장소 대여)·
//        제9호(공익사업 지역권·지상권)·제15호(원고료·인세 등 창작품 대가)·제19호(강연료 등 일시 인적용역)
//   80%: 제1호 — 공익법인이 주무관청 승인을 받아 시상하는 상금·부상, 다수가 순위 경쟁하는 대회의 상금·부상,
//        주택입주 지체상금
//    0%: 의제 필요경비가 없는 기타소득(사례금 등). 실제 필요경비는 받지 않는다
//   어느 경우든 실제 필요경비가 의제율을 넘으면 그 금액을 필요경비로 할 수 있다 (이 계산기는 반영하지 않음)
export const EXPENSE_RATES = [60, 80, 0];
export const DEFAULT_EXPENSE_RATE = 60;

// 기타소득 과세최저한: 그 밖의 기타소득금액이 건별로 5만원 이하이면 과세하지 않는다
//   — 소득세법 제84조제3호 (2027.1.1부터는 가상자산 조항 신설로 제4호) (확인 2026-10-21)
//   국세청 예시: 강연료 125,000원 − 필요경비 75,000원(60%) = 50,000원 → 과세최저한, 원천징수 0원
export const OTHER_MIN_INCOME = 50_000;

// 소액 부징수: 원천징수세액이 1천원 미만이면 징수하지 않는다 — 소득세법 제86조제1호 (확인 2026-10-21)
//   다만 인적용역을 계속적·반복적으로 공급하고 받는 사업소득은 제외 — 소득세법 시행령 제149조의3,
//   2024.7.1 이후 지급분부터 (대통령령 제34265호 부칙 제1조제1호). 그래서 프리랜서 3.3%는 1천원 미만도 뗀다
export const SMALL_TAX_LIMIT = 1_000;

// 끝수 계산: 국고금의 10원 미만 끝수는 계산하지 않고, 전액이 10원 미만이면 전액을 계산하지 않는다
//   — 국고금관리법 제47조제1항 (지방자치단체는 같은 조 제3항으로 준용) (확인 2026-10-21)
//   소득세·지방소득세를 각각 10원 미만 절사한다

// 분리과세 기타소득: 원천징수된 기타소득금액 합계가 연 300만원 이하이면 종합과세하지 않을 수 있다(선택)
//   — 소득세법 제14조제3항제8호가목 (확인 2026-10-21). 본문 안내용
export const OTHER_SEPARATE_LIMIT = 3_000_000;

// 2027년 정부안: 종합소득세 신고 대상 인적용역 사업소득 원천징수세율 3% → 2% ('27.1.1 이후 지급분)
//   — 재정경제부 「2026년 세제개편안」 상세본 p.28 (2026.8.3 발표, 2026.9.1 국무회의 의결 후 국회 제출)
//   https://www.mofe.go.kr/nw/nes/detailNesDtaView.do?searchBbsId1=MOSFBBS_000000000028&searchNttId1=MOSF_000000000078809&menuNo=4010100
//   국회 심사 중인 안이므로 계산에는 쓰지 않고 본문 안내에만 쓴다 (확인 2026-10-21)
export const PROPOSED_2027_BUSINESS_RATE_PCT = 2;

// 아래는 법령 기준이 아니라 이 계산기의 입력 설정값
export const MAX_AMOUNT = 100_000_000_000; // 1,000억원
// 본문 "지급액별 원천징수액" 표의 지급액
export const TABLE_AMOUNTS = [100_000, 125_000, 300_000, 500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000];

/* ───────────── 원천징수 계산 ───────────── */

const TYPES = ['business', 'other'];
const floorTo10 = (numer, denom) => Math.floor(numer / (denom * 10)) * 10; // floor10(numer ÷ denom), 정수 연산

/** 필요경비율 p%일 때 기타소득금액이 과세최저한 이하가 되는 최대 지급액 (60% → 125,000원) */
export const exemptLimit = (p) => Math.floor((OTHER_MIN_INCOME * 100) / (100 - p));

/**
 * 지급액 하나에 대한 원천징수. 모든 금액은 원 단위 정수.
 * 사업소득: 소득세 = 지급액 × 3% (10원 미만 절사)
 * 기타소득: 기타소득금액 = 지급액 − 필요경비(지급액 × 의제율, 원 미만 절사), 소득세 = 기타소득금액 × 20% (10원 미만 절사)
 * 지방소득세 = 소득세 × 10% (10원 미만 절사)
 */
export function withholding(gross, type = 'business', expenseRate = DEFAULT_EXPENSE_RATE) {
  const g = Math.max(0, Math.floor(gross));
  if (type === 'other') {
    // 필요경비 = 받은 금액 × 의제율 (원 미만 버림), 기타소득금액 = 받은 금액 − 필요경비.
    // 법령에 원 미만 처리 규정이 따로 없어 지급명세서처럼 원 단위 정수로 맞춘다.
    // 이렇게 하면 국세청 안내대로 60%일 때 125,000원까지 비과세, 125,001원부터 과세가 된다
    const expense = Math.floor((g * expenseRate) / 100);
    const income = g - expense;
    const exemptMin = income <= OTHER_MIN_INCOME; // 기타소득금액 건별 5만원 이하 → 과세최저한
    const raw = exemptMin ? 0 : floorTo10(income * OTHER_RATE_PCT, 100);
    const exemptSmall = raw > 0 && raw < SMALL_TAX_LIMIT; // 소액 부징수 (과세최저한이 있어 실제로는 생기지 않는다)
    const incomeTax = exemptSmall ? 0 : raw;
    const localTax = floorTo10(incomeTax * LOCAL_RATE_PCT, 100);
    return {
      gross: g, expense, income, incomeTax, localTax, totalTax: incomeTax + localTax, net: g - incomeTax - localTax,
      exemptMin, exemptSmall, rawIncomeTax: raw,
    };
  }
  // 인적용역 사업소득은 소액 부징수 예외이므로 1천원 미만도 원천징수한다
  const incomeTax = floorTo10(g * BUSINESS_RATE_PCT, 100);
  const localTax = floorTo10(incomeTax * LOCAL_RATE_PCT, 100);
  return {
    gross: g, expense: 0, income: g, incomeTax, localTax, totalTax: incomeTax + localTax, net: g - incomeTax - localTax,
    exemptMin: false, exemptSmall: false, rawIncomeTax: incomeTax,
  };
}

/** 지급액 대비 원천징수 합계 비율 (끝수 절사 전): 사업소득 3.3%, 기타소득 60% → 8.8% */
export function nominalRate(type = 'business', expenseRate = DEFAULT_EXPENSE_RATE) {
  const base = type === 'other' ? ((100 - expenseRate) * OTHER_RATE_PCT) / 100 : BUSINESS_RATE_PCT;
  return (base * (100 + LOCAL_RATE_PCT)) / 10_000;
}

/**
 * 실수령액 target이 되는 지급액들. 끝수를 버리기 때문에 같은 실수령액이 되는 지급액이 둘 이상일 수 있다.
 * 원천징수 합계 t(g)는 rate·g − 21 < t(g) ≤ rate·g + 0.22 (기타소득 필요경비 원 미만 절사분) 이므로
 * 실수령액이 target인 지급액은 대략 (target − 21) ÷ (1 − rate) < g ≤ (target + 0.22) ÷ (1 − rate) 구간에만 있다.
 * 여유를 두고 이 구간을 모두 확인한다.
 * 지급액을 1원 올리면 실수령액은 최대 1원만 늘므로 모든 실수령액에는 그 값이 되는 지급액이 반드시 있다.
 * 원천징수가 없는 금액(기타소득 과세최저한 이하)이면 지급액 = 실수령액 하나만 돌려준다.
 */
export function grossCandidates(target, type = 'business', expenseRate = DEFAULT_EXPENSE_RATE) {
  const t = Math.floor(target);
  if (withholding(t, type, expenseRate).net === t) return [t];
  const keep = 1 - nominalRate(type, expenseRate);
  const lo = Math.max(t, Math.floor((t - 22) / keep));
  const hi = Math.ceil(t / keep) + 2;
  const out = [];
  for (let g = lo; g <= hi; g += 1) if (withholding(g, type, expenseRate).net === t) out.push(g);
  return out;
}

/* ───────────── 입력 정리 ───────────── */

const toNum = (v) => (v === '' || v == null || typeof v === 'boolean' ? NaN : Number(v));

function normalize(o = {}) {
  const mode = o.mode === 'net' ? 'net' : 'gross';
  const type = TYPES.includes(o.type) ? o.type : 'business';
  const er = toNum(o.expenseRate);
  const expenseRate = EXPENSE_RATES.includes(er) ? er : DEFAULT_EXPENSE_RATE;
  const raw = toNum(o.amount);
  const what = mode === 'net' ? '받을 실수령액' : '지급액(세전 금액)';
  if (!Number.isFinite(raw) || raw < 1) return { mode, type, expenseRate, error: `${what}을 1원 이상으로 입력해 주세요.` };
  if (raw > MAX_AMOUNT) return { mode, type, expenseRate, error: `${what}은 ${(MAX_AMOUNT / 1e8).toLocaleString('ko-KR')}억원 이하로 입력해 주세요.` };
  return { mode, type, expenseRate, amount: Math.floor(raw) };
}

/* ───────────── 계산 ───────────── */

/**
 * @param {object} o
 * @param {'gross'|'net'} [o.mode] gross: 지급액(세전) → 실수령액, net: 받을 실수령액 → 지급액 역산
 * @param {'business'|'other'} [o.type] business: 사업소득 3.3%, other: 기타소득
 * @param {60|80|0} [o.expenseRate] 기타소득 필요경비 의제율(%)
 * @param {number} o.amount 금액 (원)
 */
export function calcFreelancer(o) {
  const c = normalize(o);
  if (c.error) return c;
  const { mode, type, expenseRate } = c;
  let gross = c.amount;
  let alternatives = [];
  if (mode === 'net') {
    const cands = grossCandidates(c.amount, type, expenseRate);
    if (!cands.length) return { ...c, error: '세전 금액을 찾지 못했습니다. 입력값을 확인해 주세요.' };
    // 단순 나눗셈(실수령액 ÷ (1 − 3.3%))에 가장 가까운 가장 큰 금액을 대표값으로 쓴다
    gross = cands[cands.length - 1];
    alternatives = cands.slice(0, -1);
  }
  const w = withholding(gross, type, expenseRate);
  return {
    mode,
    type,
    expenseRate: type === 'other' ? expenseRate : 0,
    amount: c.amount,
    ...w,
    rate: nominalRate(type, expenseRate),
    effectiveRate: w.gross ? w.totalTax / w.gross : 0,
    exemptLimit: type === 'other' ? exemptLimit(expenseRate) : 0,
    alternatives,
    minGross: alternatives.length ? alternatives[0] : gross,
  };
}

/** 같은 지급액을 소득 구분별로 원천징수했을 때 비교 (사업소득, 기타소득 60%·80%·0%) */
export function compareTypes(gross) {
  const rows = [{ key: 'business', type: 'business', expenseRate: 0 }];
  for (const p of EXPENSE_RATES) rows.push({ key: `other-${p}`, type: 'other', expenseRate: p });
  return rows.map((r) => ({ ...r, rate: nominalRate(r.type, r.expenseRate), ...withholding(gross, r.type, r.expenseRate) }));
}
