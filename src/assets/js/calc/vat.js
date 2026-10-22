// 부가세 계산기 — 공급가액·합계(부가세 포함)·부가세 상호 변환과 일반과세자·간이과세자 납부세액.
// DOM 없음 (브라우저·Node 공용). 금액은 모두 원 단위 정수로 다루고, 요율 곱셈은 정수 나눗셈으로 바꿔
// 부동소수점 오차(예: 1,000,001 × 0.1 = 100,000.1000…)가 끝수 처리에 끼어들지 않게 한다.

/* ───────────── 법령 기준값 (출처·확인일) ───────────── */

// 부가가치세 세율 10% — 부가가치세법 제30조 "부가가치세의 세율은 10퍼센트로 한다."
//   (https://www.law.go.kr/LSW//lsSideInfoP.do?lsiSeq=276117&joNo=0030&joBrNo=00&docCls=jo&urlMode=lsScJoRltInfoR,
//    시행 2026.1.2 법률 제21065호, 확인 2026-10-21)
export const VAT_RATE_PCT = 10;

// 간이과세 기준금액: 직전 연도 공급대가 합계액 1억 400만원 미만 개인사업자
//   — 부가가치세법 제61조제1항(8천만원~그 130% 범위에서 대통령령), 시행령 제109조제1항 "1억4백만원"
//   (https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1015986155&chrClsCd=010202, 시행 2026.2.27 대통령령 제36133호;
//    국세상담센터 Q&A "2024.1.1. 이후 개시하는 과세기간 분부터 적용" https://call.nts.go.kr/call/qna/selectQnaInfo.do?mi=1329&ctgId=CTG11937, 확인 2026-10-21)
export const SIMPLE_THRESHOLD = 104_000_000;

// 부동산임대업·과세유흥장소의 간이과세 기준: 직전 연도 공급대가 4,800만원 이상이면 간이과세 배제
//   — 부가가치세법 제61조제1항제3호 (https://www.law.go.kr/LSW//lsLawLinkInfo.do?lsJoLnkSeq=1000920535&lsId=001571&chrClsCd=010202&print=print, 확인 2026-10-21)
export const SIMPLE_THRESHOLD_RENTAL = 48_000_000;

// 간이과세자 납부의무 면제: 해당 과세기간 공급대가 합계액 4,800만원 미만. 신규사업자 등은 12개월로 환산, 1개월 미만 끝수는 1개월
//   — 부가가치세법 제69조제1항·제3항 (https://www.law.go.kr/LSW//lsSideInfoP.do?lsiSeq=276117&joNo=0069&joBrNo=00&docCls=jo&urlMode=lsScJoRltInfoR,
//    시행 2026.1.2, 확인 2026-10-21)
export const EXEMPT_THRESHOLD = 48_000_000;

// 간이과세자 업종별 부가가치율 (2021.7.1. 이후 공급분) — 부가가치세법 제63조제2항, 시행령 제111조제2항
//   (국세청 「세율 - 부가가치세」 https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2275&cntntsId=7696,
//    시행령 제111조 현행 시행 2026.2.27 대통령령 제36133호 — 2024~2026 개정에 부가가치율 변경 없음, 확인 2026-10-21)
// rate는 퍼센트 정수. rental은 부가가치율은 40% 묶음과 같지만 간이과세 기준이 4,800만원이라 따로 둔다.
export const INDUSTRIES = [
  { key: 'retail', rate: 15, label: '소매업·음식점업·재생용 재료수집 및 판매업' },
  { key: 'manufacturing', rate: 20, label: '제조업·농업·임업·어업·소화물 전문 운송업' },
  { key: 'lodging', rate: 25, label: '숙박업' },
  { key: 'construction', rate: 30, label: '건설업·운수 및 창고업(소화물 전문 운송업 제외)·정보통신업' },
  { key: 'service', rate: 30, label: '그 밖의 서비스업' },
  { key: 'professional', rate: 40, label: '금융·보험 관련 서비스업·전문·과학 및 기술서비스업(인물사진·행사용 영상 촬영업 제외)·사업시설관리·사업지원 및 임대서비스업·부동산 관련 서비스업' },
  { key: 'rental', rate: 40, label: '부동산임대업' },
];

// 간이과세자 매입세금계산서 등 수취세액공제: 세금계산서등(신용카드매출전표등 포함)을 받은 재화·용역의 공급대가 × 0.5% (2021.7.1. 이후 공급받는 분)
//   — 부가가치세법 제63조제3항 (https://www.law.go.kr/LSW//lsLawLinkInfo.do?lsJoLnkSeq=1000920576&lsId=001571&chrClsCd=010202&print=print, 확인 2026-10-21)
//   공제세액이 납부세액을 넘으면 초과분은 없는 것으로 본다(같은 조 제6항) — 간이과세자는 환급 없음.
//   계산 흐름: 국세청 「세액계산 흐름도」 https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2274&cntntsId=7695
// 퍼밀(‰) 단위 정수: 5‰ = 0.5%
export const SIMPLE_PURCHASE_CREDIT_PERMIL = 5;

// 신용카드매출전표 등 발행세액공제: 발급금액(부가세 포함)의 1%, 2026.12.31까지는 1.3%. 연간 500만원, 2026.12.31까지는 1천만원 한도.
//   법인사업자와 직전 연도 공급가액(사업장 기준) 10억원 초과 개인사업자는 제외. 공제액이 납부할 세액을 넘는 부분은 없는 것으로 본다.
//   — 부가가치세법 제46조제1항·제2항 (https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=900315855&lsId=001571&chrClsCd=010202&print=print, 시행 2026.1.2),
//     시행령 제88조제3항 10억원 (https://www.law.go.kr/lsLawLinkInfo.do?lsJoLnkSeq=900327178&chrClsCd=010202, 시행 2026.2.27), 확인 2026-10-21
// 2027년 이후 공급분은 2026년 세법개정안(1.2%·연 500만원)이 국회 심의 중이라 이 계산기는 2026년 기준만 쓴다.
export const CARD_CREDIT_PERMIL = 13;
export const CARD_CREDIT_CAP = 10_000_000;
export const CARD_CREDIT_SALES_LIMIT = 1_000_000_000;

// 국고금의 끝수 계산: 국고금의 수입·지출에서 10원 미만 끝수는 계산하지 않는다 — 국고금 관리법 제47조제1항
//   (https://www.law.go.kr/LSW//lsSideInfoP.do?lsiSeq=66599&urlMode=lsRvsDocInfoR&chrClsCd=010201, 확인 2026-10-21)
// 납부할 세액·환급받을 세액에만 적용한다. 거래 한 건의 부가세는 원 단위까지 표시한다.
export const PAY_UNIT = 10;

/* ───────────── 입력 범위 (계산기 자체 제한) ───────────── */

// 입력칸이 받는 최대 13자리
export const MAX_AMOUNT = 9_999_999_999_999;
export const ROUNDINGS = ['floor', 'round', 'ceil'];
export const ROUNDING_LABELS = { floor: '원 미만 버림', round: '원 미만 반올림', ceil: '원 미만 올림' };

/* ───────────── 도우미 ───────────── */

// 빈 값·숫자가 아닌 값은 null, 나머지는 숫자
const toNum = (v) => {
  if (v === '' || v == null || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 받침 유무에 따라 조사를 고른다: josa('부가세', '을', '를') → '부가세를' */
function josa(word, withFinal, withoutFinal) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11_171 && code % 28 !== 0 ? withFinal : withoutFinal);
}

/** 0 이상 MAX_AMOUNT 이하 원 단위 금액. 원 미만은 버린다. 문제가 있으면 { error } */
function readAmount(v, name, { required = true } = {}) {
  const n = toNum(v);
  if (n == null) return required ? { error: `${josa(name, '을', '를')} 숫자로 입력해 주세요.` } : { value: 0 };
  if (n < 0) return { error: `${josa(name, '은', '는')} 0원 이상이어야 합니다.` };
  if (n > MAX_AMOUNT) return { error: `${josa(name, '이', '가')} 너무 큽니다. 9조 9,999억원 이하로 입력해 주세요.` };
  return { value: Math.floor(n) };
}

/** 정수 n ÷ 정수 d를 지정한 방식으로 원 단위 정수로 만든다 (n ≥ 0, d > 0) */
export function divRound(n, d, rounding = 'floor') {
  const q = Math.floor(n / d);
  const r = n - q * d;
  if (rounding === 'ceil') return r > 0 ? q + 1 : q;
  if (rounding === 'round') return r * 2 >= d ? q + 1 : q; // 0.5원은 올림 (사사오입)
  return q;
}

/** 납부·환급 세액의 10원 미만 버림 (국고금 관리법 제47조제1항) */
export const floorPay = (n) => Math.floor(n / PAY_UNIT) * PAY_UNIT;

/* ───────────── 공급가액 · 합계 · 부가세 변환 ───────────── */

/** 공급가액 → 부가세 = 공급가액 × 10% (기본 원 미만 버림) */
export function vatOfSupply(supply, rounding = 'floor') {
  return divRound(supply * VAT_RATE_PCT, 100, rounding);
}

/**
 * 합계(공급대가) → 공급가액·부가세.
 * 부가세 = 합계 × 10/110 (= 합계 ÷ 11)의 원 미만을 먼저 처리하고, 공급가액 = 합계 − 부가세.
 * 그래서 공급가액 + 부가세는 언제나 입력한 합계와 같다.
 */
export function splitTotal(total, rounding = 'floor') {
  const vat = divRound(total * VAT_RATE_PCT, 100 + VAT_RATE_PCT, rounding);
  return { supply: total - vat, vat };
}

/** 부가세 → 공급가액 = 부가세 ÷ 10%, 그리고 같은 부가세가 나오는 공급가액의 범위 */
export function supplyOfVat(vat, rounding = 'floor') {
  const per = 100 / VAT_RATE_PCT; // 10
  const supply = vat * per;
  let min;
  let max;
  if (rounding === 'ceil') { min = supply - (per - 1); max = supply; }
  else if (rounding === 'round') { min = supply - per / 2; max = supply + per / 2 - 1; }
  else { min = supply; max = supply + per - 1; }
  return { supply, min: Math.max(0, min), max };
}

/* ───────────── 납부세액 ───────────── */

/** 신용카드매출전표 등 발행세액공제 (공제 한도 적용 전 → 연 한도 적용 후) */
function cardCreditOf(card) {
  const raw = divRound(card * CARD_CREDIT_PERMIL, 1000);
  return { raw, capped: Math.min(raw, CARD_CREDIT_CAP) };
}

/**
 * 일반과세자: 납부(환급)세액 = 매출세액 − 매입세액, 신용카드 발행세액공제는 납부세액 범위에서만.
 * (부가가치세법 제37조, 국세청 「세액계산 흐름도」 https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2274&cntntsId=7695, 확인 2026-10-21)
 * @param {object} o
 * @param {number} o.sales 매출 공급가액 (inclusive면 부가세 포함 매출)
 * @param {number} [o.purchases] 공제받는 매입 공급가액 (inclusive면 부가세 포함)
 * @param {boolean} [o.inclusive] 입력 금액에 부가세가 포함되어 있으면 true
 * @param {number} [o.card] 신용카드·현금영수증 발행금액 (부가세 포함)
 */
export function generalTax({ sales, purchases = 0, inclusive = false, card = 0 } = {}) {
  const s = readAmount(sales, '매출 금액');
  if (s.error) return { error: s.error };
  const p = readAmount(purchases, '매입 금액', { required: false });
  if (p.error) return { error: p.error };
  const c = readAmount(card, '신용카드 발행금액', { required: false });
  if (c.error) return { error: c.error };

  const sale = inclusive ? splitTotal(s.value) : { supply: s.value, vat: vatOfSupply(s.value) };
  const buy = inclusive ? splitTotal(p.value) : { supply: p.value, vat: vatOfSupply(p.value) };
  const salesTax = sale.vat;
  const purchaseTax = buy.vat;
  const netTax = salesTax - purchaseTax; // 음수면 환급세액
  const cc = cardCreditOf(c.value);
  const cardCredit = Math.min(cc.capped, Math.max(0, netTax));
  const due = netTax - cardCredit;
  return {
    mode: 'general',
    inclusive: !!inclusive,
    salesSupply: sale.supply,
    purchaseSupply: buy.supply,
    salesTax,
    purchaseTax,
    netTax,
    card: c.value,
    cardCreditRaw: cc.raw,
    cardCredit,
    cardCapped: cc.raw > CARD_CREDIT_CAP,
    cardCut: cc.capped - cardCredit,
    due,
    refund: due < 0,
    pay: due > 0 ? floorPay(due) : 0,
    refundAmount: due < 0 ? floorPay(-due) : 0,
  };
}

/**
 * 간이과세자: 납부세액 = 공급대가 × 업종별 부가가치율 × 10%,
 * 공제세액(매입 0.5% + 신용카드 발행 1.3%)은 납부세액을 넘지 못하고 환급은 없다.
 * @param {object} o
 * @param {number} o.sales 해당 과세기간(1.1~12.31) 공급대가 합계 (부가세 포함 매출)
 * @param {string} o.industry INDUSTRIES의 key
 * @param {number} [o.purchases] 세금계산서등을 받은 매입의 공급대가 (부가세 포함)
 * @param {number} [o.card] 신용카드·현금영수증 발행금액 (부가세 포함)
 * @param {number} [o.months] 사업한 개월 수 (신규 개업 등, 1~12). 납부면제 판단 때 12개월로 환산
 */
export function simpleTax({ sales, industry = 'retail', purchases = 0, card = 0, months = 12 } = {}) {
  const s = readAmount(sales, '공급대가');
  if (s.error) return { error: s.error };
  const ind = INDUSTRIES.find((x) => x.key === industry);
  if (!ind) return { error: '업종을 목록에서 골라 주세요.' };
  const p = readAmount(purchases, '매입 금액', { required: false });
  if (p.error) return { error: p.error };
  const c = readAmount(card, '신용카드 발행금액', { required: false });
  if (c.error) return { error: c.error };
  const m = toNum(months) ?? 12;
  if (!Number.isInteger(m) || m < 1 || m > 12) return { error: '사업한 개월 수는 1에서 12 사이의 정수로 입력해 주세요.' };

  // 공급대가 × 부가가치율(%) × 10% = 공급대가 × rate ÷ 1,000 (원 미만 버림)
  const baseTax = divRound(s.value * ind.rate * VAT_RATE_PCT, 10_000);
  // 공제 순서는 신고서 순서대로 매입 수취세액공제 → 신용카드 발행세액공제.
  // 공제 합계가 납부세액을 넘는 부분은 없는 것으로 본다 (제63조제6항, 제46조제2항) — 환급 없음
  const purchaseCreditRaw = divRound(p.value * SIMPLE_PURCHASE_CREDIT_PERMIL, 1000);
  const purchaseCredit = Math.min(purchaseCreditRaw, baseTax);
  const cc = cardCreditOf(c.value);
  const cardCredit = Math.min(cc.capped, baseTax - purchaseCredit);
  const creditTotal = purchaseCredit + cardCredit;
  const creditCut = purchaseCreditRaw + cc.capped - creditTotal;
  const taxAfterCredit = baseTax - creditTotal;

  // 납부의무 면제: 해당 과세기간 공급대가(신규 개업 등은 12개월 환산) 4,800만원 미만 (제69조)
  const annualized = m === 12 ? s.value : Math.floor((s.value * 12) / m);
  const exempt = annualized < EXEMPT_THRESHOLD;
  const due = exempt ? 0 : taxAfterCredit;
  const threshold = ind.key === 'rental' ? SIMPLE_THRESHOLD_RENTAL : SIMPLE_THRESHOLD;

  // 비교용: 같은 매출·매입을 일반과세자 방식으로 계산한 값 (매출세액 − 매입세액 − 신용카드 공제)
  const gSalesTax = splitTotal(s.value).vat;
  const gPurchaseTax = splitTotal(p.value).vat;
  const gNet = gSalesTax - gPurchaseTax;
  const gDue = gNet - Math.min(cc.capped, Math.max(0, gNet));

  return {
    mode: 'simple',
    industry: ind,
    sales: s.value,
    purchases: p.value,
    card: c.value,
    months: m,
    annualized,
    baseTax,
    purchaseCreditRaw,
    purchaseCredit,
    cardCreditRaw: cc.raw,
    cardCredit,
    cardCapped: cc.raw > CARD_CREDIT_CAP,
    creditTotal,
    creditCut,
    taxAfterCredit,
    exempt,
    due,
    pay: floorPay(due),
    threshold,
    overThreshold: s.value >= threshold,
    effectiveRate: (ind.rate * VAT_RATE_PCT) / 100, // 공급대가 대비 실효 세율(%)
    general: {
      salesTax: gSalesTax,
      purchaseTax: gPurchaseTax,
      due: gDue,
      pay: gDue > 0 ? floorPay(gDue) : 0,
      refund: gDue < 0 ? floorPay(-gDue) : 0,
    },
  };
}

/* ───────────── 진입점 ───────────── */

/**
 * @param {object} o
 * @param {'supply'|'total'|'vat'|'general'|'simple'} o.mode
 *   supply: 공급가액 → 부가세·합계 / total: 합계 → 공급가액·부가세 / vat: 부가세 → 공급가액·합계
 *   general: 일반과세자 납부세액 / simple: 간이과세자 납부세액
 * @param {number} [o.amount] supply·total·vat 모드의 금액
 * @param {'floor'|'round'|'ceil'} [o.rounding] supply·total·vat 모드에서 부가세 원 미만 처리 (기본 버림)
 */
export function calcVat(o = {}) {
  const mode = o.mode ?? 'supply';
  if (mode === 'general') return generalTax(o);
  if (mode === 'simple') return simpleTax(o);
  if (!['supply', 'total', 'vat'].includes(mode)) return { error: '계산 방식을 골라 주세요.' };
  const rounding = o.rounding ?? 'floor';
  if (!ROUNDINGS.includes(rounding)) return { error: '원 미만 처리 방식은 버림·반올림·올림 중에서 골라 주세요.' };
  const name = { supply: '공급가액', total: '합계금액', vat: '부가세' }[mode];
  const a = readAmount(o.amount, name);
  if (a.error) return { error: a.error };
  const amount = a.value;

  if (mode === 'supply') {
    const vat = vatOfSupply(amount, rounding);
    return { mode, rounding, amount, supply: amount, vat, total: amount + vat, exactVat: (amount * VAT_RATE_PCT) / 100 };
  }
  if (mode === 'total') {
    const { supply, vat } = splitTotal(amount, rounding);
    // 이 공급가액으로 다시 부가세를 계산해도 같은 값이 나오는지 (합계를 11로 나눈 나머지가 10이면 버림 기준에서 어긋난다)
    const check = vatOfSupply(supply, rounding);
    return {
      mode, rounding, amount, supply, vat, total: amount,
      exactVat: (amount * VAT_RATE_PCT) / (100 + VAT_RATE_PCT),
      consistent: check === vat,
      recheckVat: check,
    };
  }
  // vat → 공급가액
  const range = supplyOfVat(amount, rounding);
  return {
    mode, rounding, amount, vat: amount, supply: range.supply, total: range.supply + amount,
    supplyMin: range.min, supplyMax: range.max,
  };
}
