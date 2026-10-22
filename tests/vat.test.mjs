import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  calcVat, generalTax, simpleTax, vatOfSupply, splitTotal, supplyOfVat, divRound, floorPay,
  VAT_RATE_PCT, INDUSTRIES, SIMPLE_THRESHOLD, SIMPLE_THRESHOLD_RENTAL, EXEMPT_THRESHOLD,
  SIMPLE_PURCHASE_CREDIT_PERMIL, CARD_CREDIT_PERMIL, CARD_CREDIT_CAP, MAX_AMOUNT,
} from '../src/assets/js/calc/vat.js';
import meta from '../src/pages/vat.meta.mjs';

const html = await readFile(new URL('../src/pages/vat.html', import.meta.url), 'utf8');
const toInt = (s) => Number(String(s).replace(/[^\d]/g, ''));
const manToWon = (s) => {
  // "1만원" "1,000만원" "1억원" → 원
  const t = s.replace(/,/g, '');
  if (/억/.test(t)) return Number(t.replace(/억원?/, '')) * 1e8;
  return Number(t.replace(/만원/, '')) * 1e4;
};

test('법령 기준값: 세율 10%, 간이 1억 400만원·4,800만원, 0.5%, 1.3%·1,000만원 (부가가치세법·시행령, 국세청)', () => {
  assert.equal(VAT_RATE_PCT, 10); // 법 제30조
  assert.equal(SIMPLE_THRESHOLD, 104_000_000); // 시행령 제109조제1항
  assert.equal(SIMPLE_THRESHOLD_RENTAL, 48_000_000); // 법 제61조제1항제3호
  assert.equal(EXEMPT_THRESHOLD, 48_000_000); // 법 제69조제1항
  assert.equal(SIMPLE_PURCHASE_CREDIT_PERMIL, 5); // 법 제63조제3항 0.5%
  assert.equal(CARD_CREDIT_PERMIL, 13); // 법 제46조제1항제3호 2026.12.31까지 1.3%
  assert.equal(CARD_CREDIT_CAP, 10_000_000); // 같은 호 연간 1천만원
  // 국세청 「세율 - 부가가치세」 2021.7.1. 이후 업종별 부가가치율
  const rate = Object.fromEntries(INDUSTRIES.map((x) => [x.key, x.rate]));
  assert.deepEqual(rate, {
    retail: 15, manufacturing: 20, lodging: 25, construction: 30, service: 30, professional: 40, rental: 40,
  });
});

test('공급가액 → 부가세·합계 (원 미만 버림 기본)', () => {
  assert.deepEqual(
    (({ supply, vat, total }) => ({ supply, vat, total }))(calcVat({ mode: 'supply', amount: 1_000_000 })),
    { supply: 1_000_000, vat: 100_000, total: 1_100_000 },
  );
  // 국세청 정책브리핑 공식(공급가액 × 10%)으로 계산: 공급가액 1,000만원 → 매출세액 100만원
  assert.equal(calcVat({ mode: 'supply', amount: 10_000_000 }).vat, 1_000_000);
  // 원 미만: 12,345 × 10% = 1,234.5
  assert.equal(calcVat({ mode: 'supply', amount: 12_345 }).vat, 1_234);
  assert.equal(calcVat({ mode: 'supply', amount: 12_345, rounding: 'round' }).vat, 1_235);
  assert.equal(calcVat({ mode: 'supply', amount: 12_341, rounding: 'round' }).vat, 1_234);
  assert.equal(calcVat({ mode: 'supply', amount: 12_341, rounding: 'ceil' }).vat, 1_235);
  assert.equal(calcVat({ mode: 'supply', amount: 12_345 }).total, 13_579);
  // 부동소수점: 1,000,001 × 0.1 = 100,000.1000…, 3 × 0.1 = 0.30000000000000004
  assert.equal(vatOfSupply(1_000_001), 100_000);
  assert.equal(vatOfSupply(3), 0);
  assert.equal(vatOfSupply(3, 'ceil'), 1);
  assert.equal(vatOfSupply(10), 1);
  assert.equal(vatOfSupply(9), 0);
});

test('합계 → 공급가액·부가세: 부가세 = 합계 × 10/110 버림, 공급가액 = 합계 − 부가세', () => {
  const a = calcVat({ mode: 'total', amount: 1_100_000 });
  assert.equal(a.supply, 1_000_000);
  assert.equal(a.vat, 100_000);
  assert.equal(a.consistent, true);
  const b = calcVat({ mode: 'total', amount: 10_000 });
  assert.equal(b.vat, 909); // 909.09…
  assert.equal(b.supply, 9_091);
  assert.equal(b.supply + b.vat, 10_000);
  assert.equal(vatOfSupply(b.supply), b.vat); // 공급가액으로 되돌려도 같은 부가세
  // 반올림·올림
  assert.deepEqual(splitTotal(10_000, 'round'), { supply: 9_091, vat: 909 });
  assert.deepEqual(splitTotal(10_000, 'ceil'), { supply: 9_090, vat: 910 });
  assert.deepEqual(splitTotal(15_000), { supply: 13_637, vat: 1_363 }); // 1,363.63…
  assert.deepEqual(splitTotal(15_000, 'round'), { supply: 13_636, vat: 1_364 });
  // 합계 ÷ 11의 나머지가 10이면 버림 기준으로 정확히 나눌 수 없다 (21 = 20 + 1, 그런데 20의 부가세는 2)
  const c = calcVat({ mode: 'total', amount: 21 });
  assert.deepEqual([c.supply, c.vat, c.consistent, c.recheckVat], [20, 1, false, 2]);
  assert.equal(calcVat({ mode: 'total', amount: 120 }).consistent, false);
  assert.equal(calcVat({ mode: 'total', amount: 110 }).consistent, true);
  // 전 구간 검사: 공급가액 + 부가세 = 합계, 버림 기준 어긋남은 나머지 10일 때뿐
  for (let t = 0; t <= 5_000; t += 1) {
    const r = splitTotal(t);
    assert.equal(r.supply + r.vat, t);
    assert.equal(vatOfSupply(r.supply) === r.vat, t % 11 !== 10, `합계 ${t}`);
  }
});

test('부가세 → 공급가액·합계와 같은 부가세가 나오는 공급가액 범위', () => {
  const r = calcVat({ mode: 'vat', amount: 50_000 });
  assert.deepEqual([r.supply, r.total, r.supplyMin, r.supplyMax], [500_000, 550_000, 500_000, 500_009]);
  assert.deepEqual(supplyOfVat(909), { supply: 9_090, min: 9_090, max: 9_099 });
  assert.deepEqual(supplyOfVat(909, 'round'), { supply: 9_090, min: 9_085, max: 9_094 });
  assert.deepEqual(supplyOfVat(909, 'ceil'), { supply: 9_090, min: 9_081, max: 9_090 });
  assert.deepEqual(supplyOfVat(0), { supply: 0, min: 0, max: 9 });
  assert.deepEqual(supplyOfVat(0, 'round'), { supply: 0, min: 0, max: 4 });
  // 범위 안의 모든 공급가액은 같은 부가세를 낸다
  for (const mode of ['floor', 'round', 'ceil']) {
    for (const v of [0, 1, 7, 909, 12_345]) {
      const { min, max } = supplyOfVat(v, mode);
      for (let s = min; s <= max; s += 1) assert.equal(vatOfSupply(s, mode), v, `${mode} ${v} ${s}`);
      if (min > 0) assert.notEqual(vatOfSupply(min - 1, mode), v);
      assert.notEqual(vatOfSupply(max + 1, mode), v);
    }
  }
});

test('일반과세자: 매출세액 − 매입세액, 환급, 신용카드 발행세액공제 1.3%·연 1,000만원·납부세액 한도', () => {
  // 국세청 공식: 납부세액 = 매출세액(매출액 × 10%) − 매입세액
  const a = generalTax({ sales: 50_000_000, purchases: 30_000_000 });
  assert.deepEqual([a.salesTax, a.purchaseTax, a.netTax, a.pay, a.refund], [5_000_000, 3_000_000, 2_000_000, 2_000_000, false]);
  // 신용카드 매출 2,200만원 × 1.3% = 286,000원
  const b = generalTax({ sales: 50_000_000, purchases: 30_000_000, card: 22_000_000 });
  assert.equal(b.cardCredit, 286_000);
  assert.equal(b.pay, 1_714_000);
  // 매입이 더 크면 환급, 신용카드 공제는 환급세액을 늘리지 않는다
  const c = generalTax({ sales: 10_000_000, purchases: 25_000_000, card: 5_000_000 });
  assert.equal(c.netTax, -1_500_000);
  assert.equal(c.cardCredit, 0);
  assert.equal(c.refund, true);
  assert.equal(c.refundAmount, 1_500_000);
  assert.equal(c.pay, 0);
  // 연 한도 1,000만원: 발행금액 10억원 × 1.3% = 1,300만원 → 1,000만원
  const d = generalTax({ sales: 2_000_000_000, purchases: 0, card: 1_000_000_000 });
  assert.equal(d.cardCreditRaw, 13_000_000);
  assert.equal(d.cardCredit, CARD_CREDIT_CAP);
  assert.equal(d.cardCapped, true);
  // 납부세액보다 큰 공제는 잘린다
  const e = generalTax({ sales: 3_000_000, purchases: 2_500_000, card: 10_000_000 });
  assert.deepEqual([e.netTax, e.cardCredit, e.cardCut, e.pay], [50_000, 50_000, 80_000, 0]);
  // 부가세 포함 금액 입력: 5,500만원 → 매출세액 500만원, 3,300만원 → 매입세액 300만원
  const f = generalTax({ sales: 55_000_000, purchases: 33_000_000, inclusive: true });
  assert.deepEqual([f.salesSupply, f.salesTax, f.purchaseTax, f.pay], [50_000_000, 5_000_000, 3_000_000, 2_000_000]);
  // 10원 미만 버림 (국고금 관리법 제47조): 매출 123,456 → 12,345 − 매입 0
  const g = generalTax({ sales: 123_456 });
  assert.equal(g.due, 12_345);
  assert.equal(g.pay, 12_340);
  const h = generalTax({ sales: 0, purchases: 123_456 });
  assert.equal(h.refundAmount, 12_340);
});

test('간이과세자: 공급대가 × 업종별 부가가치율 × 10% − 매입 0.5% (환급 없음)', () => {
  // 음식점 15%: 6,000만원 × 15% × 10% = 900,000, 매입 2,000만원 × 0.5% = 100,000 → 800,000
  const a = simpleTax({ sales: 60_000_000, industry: 'retail', purchases: 20_000_000 });
  assert.deepEqual([a.baseTax, a.purchaseCredit, a.due, a.pay, a.exempt], [900_000, 100_000, 800_000, 800_000, false]);
  assert.equal(a.effectiveRate, 1.5);
  // 같은 매출·매입을 일반과세자로: 60,000,000 ÷ 11 = 5,454,545 − 20,000,000 ÷ 11 = 1,818,181
  assert.deepEqual([a.general.salesTax, a.general.purchaseTax, a.general.due], [5_454_545, 1_818_181, 3_636_364]);
  // 정책브리핑 공식 예: 매출 5,000만원 × 15% × 10% = 750,000
  assert.equal(simpleTax({ sales: 50_000_000, industry: 'retail' }).baseTax, 750_000);
  // 업종별 (매출 1억원, 매입 없음)
  const by = Object.fromEntries(INDUSTRIES.map((x) => [x.key, simpleTax({ sales: 100_000_000, industry: x.key }).baseTax]));
  assert.deepEqual(by, {
    retail: 1_500_000, manufacturing: 2_000_000, lodging: 2_500_000, construction: 3_000_000,
    service: 3_000_000, professional: 4_000_000, rental: 4_000_000,
  });
  // 신용카드 발행세액공제: 매출 1억, 매입 4,000만원, 카드 7,000만원 → 1,500,000 − 200,000 − 910,000 = 390,000
  const b = simpleTax({ sales: 100_000_000, purchases: 40_000_000, card: 70_000_000 });
  assert.deepEqual([b.purchaseCredit, b.cardCredit, b.pay], [200_000, 910_000, 390_000]);
  // 공제가 납부세액보다 커도 0원, 남는 공제는 없어진다 (제63조제6항)
  const c = simpleTax({ sales: 50_000_000, purchases: 200_000_000, card: 50_000_000 });
  assert.equal(c.baseTax, 750_000);
  assert.equal(c.purchaseCredit, 750_000);
  assert.equal(c.cardCredit, 0);
  assert.equal(c.creditCut, 900_000); // 매입 1,000,000 + 카드 650,000 − 공제 750,000
  assert.equal(c.pay, 0);
  // 원 미만·10원 미만 버림
  const e = simpleTax({ sales: 52_345_678, industry: 'manufacturing', purchases: 3_333_333 });
  assert.equal(e.baseTax, 1_046_913); // 52,345,678 × 2% = 1,046,913.56
  assert.equal(e.purchaseCredit, 16_666); // 3,333,333 × 0.5% = 16,666.665
  assert.equal(e.due, 1_030_247);
  assert.equal(e.pay, 1_030_240);
});

test('간이과세자 경계값: 4,800만원 납부면제, 12개월 환산, 1억 400만원·4,800만원 기준', () => {
  const below = simpleTax({ sales: 47_999_999 });
  assert.equal(below.exempt, true);
  assert.equal(below.taxAfterCredit, 719_999);
  assert.equal(below.pay, 0);
  const at = simpleTax({ sales: 48_000_000 });
  assert.equal(at.exempt, false);
  assert.equal(at.pay, 720_000);
  // 7월 개업, 6개월 3,000만원 → 12개월 환산 6,000만원 → 면제 아님
  const half = simpleTax({ sales: 30_000_000, months: 6 });
  assert.equal(half.annualized, 60_000_000);
  assert.equal(half.exempt, false);
  assert.equal(half.pay, 450_000);
  // 3개월 1,100만원 → 4,400만원 → 면제
  assert.equal(simpleTax({ sales: 11_000_000, months: 3 }).exempt, true);
  // 1억 400만원 기준 (다음 해 7월 일반과세 전환 안내용)
  assert.equal(simpleTax({ sales: 103_999_999 }).overThreshold, false);
  assert.equal(simpleTax({ sales: 104_000_000 }).overThreshold, true);
  assert.equal(simpleTax({ sales: 48_000_000, industry: 'rental' }).overThreshold, true);
  assert.equal(simpleTax({ sales: 47_999_999, industry: 'rental' }).overThreshold, false);
  // 0원
  const zero = simpleTax({ sales: 0 });
  assert.deepEqual([zero.baseTax, zero.pay, zero.exempt], [0, 0, true]);
});

test('잘못된 입력은 예외 없이 { error }', () => {
  for (const o of [
    { mode: 'supply', amount: '' },
    { mode: 'supply', amount: null },
    { mode: 'supply', amount: 'abc' },
    { mode: 'supply', amount: -1 },
    { mode: 'total', amount: MAX_AMOUNT + 1 },
    { mode: 'vat', amount: Number.NaN },
    { mode: 'supply', amount: 1000, rounding: 'bank' },
    { mode: 'unknown', amount: 1000 },
    { mode: 'general', sales: '' },
    { mode: 'general', sales: 1000, purchases: -5 },
    { mode: 'general', sales: 1000, card: -5 },
    { mode: 'simple', sales: '' },
    { mode: 'simple', sales: 1000, industry: 'wholesale' },
    { mode: 'simple', sales: 1000, months: 0 },
    { mode: 'simple', sales: 1000, months: 13 },
    { mode: 'simple', sales: 1000, months: 2.5 },
    { mode: 'simple', sales: 1000, purchases: -1 },
  ]) {
    const r = calcVat(o);
    assert.ok(r.error, JSON.stringify(o));
    assert.equal(typeof r.error, 'string');
  }
  assert.doesNotThrow(() => calcVat());
  assert.ok(calcVat().error);
  // 0과 최대값은 정상
  assert.equal(calcVat({ mode: 'supply', amount: 0 }).total, 0);
  assert.equal(calcVat({ mode: 'total', amount: 0 }).supply, 0);
  const max = calcVat({ mode: 'supply', amount: MAX_AMOUNT });
  assert.equal(max.vat, 999_999_999_999);
  assert.equal(max.total, MAX_AMOUNT + 999_999_999_999);
  const maxT = calcVat({ mode: 'total', amount: MAX_AMOUNT });
  assert.equal(maxT.supply + maxT.vat, MAX_AMOUNT);
  assert.equal(maxT.vat, Math.floor(MAX_AMOUNT / 11));
  assert.ok(Number.isSafeInteger(simpleTax({ sales: MAX_AMOUNT, industry: 'rental' }).baseTax));
  // 원 미만 입력은 버린다, 빠진 선택 입력은 0
  assert.equal(calcVat({ mode: 'supply', amount: 1000.9 }).supply, 1000);
  assert.equal(generalTax({ sales: 1_000_000 }).purchaseTax, 0);
  assert.equal(simpleTax({ sales: 60_000_000, purchases: '' }).purchaseCredit, 0);
});

test('도우미: divRound·floorPay', () => {
  assert.equal(divRound(15, 10), 1);
  assert.equal(divRound(15, 10, 'round'), 2);
  assert.equal(divRound(14, 10, 'round'), 1);
  assert.equal(divRound(11, 10, 'ceil'), 2);
  assert.equal(divRound(10, 10, 'ceil'), 1);
  assert.equal(floorPay(12_349), 12_340);
  assert.equal(floorPay(9), 0);
  assert.equal(floorPay(0), 0);
});

test('본문 금액별 표와 업종 표·선택지가 계산 모듈과 일치', () => {
  const table = (id) => html.slice(html.indexOf(`id="${id}"`), html.indexOf('</table>', html.indexOf(`id="${id}"`)));
  const rows = (id) => [...table(id).matchAll(/<tr><td>([^<]+)<\/td><td>([\d,]+)<\/td><td>([\d,]+)<\/td><\/tr>/g)];
  const supplyRows = rows('quick-supply');
  const totalRows = rows('quick-total');
  assert.equal(supplyRows.length, 12);
  assert.equal(totalRows.length, 12);
  for (const [, label, vat, total] of supplyRows) {
    const s = calcVat({ mode: 'supply', amount: manToWon(label) });
    assert.deepEqual([toInt(vat), toInt(total)], [s.vat, s.total], label);
  }
  for (const [, label, supply, vat] of totalRows) {
    const t = calcVat({ mode: 'total', amount: manToWon(label) });
    assert.deepEqual([toInt(supply), toInt(vat)], [t.supply, t.vat], label);
  }
  // 업종별 부가가치율 표: 부가가치율과 매출 대비 세율
  const rates = html.slice(html.indexOf('id="rates"'), html.indexOf('</table>', html.indexOf('id="rates"')));
  const rateRows = [...rates.matchAll(/<tr><td>([^<]+)<\/td><td>(\d+)%<\/td><td>([\d.]+)%<\/td><\/tr>/g)];
  assert.equal(rateRows.length, 6);
  for (const [, name, rate, eff] of rateRows) {
    assert.ok(INDUSTRIES.some((x) => x.rate === Number(rate)), name);
    assert.equal(Number(eff), Number(rate) / 10);
  }
  // 업종 선택지: value가 모듈 key이고 괄호 안 비율이 같다
  const opts = [...html.matchAll(/<option value="(\w+)"[^>]*>[^<(]+\((\d+)%\)<\/option>/g)];
  assert.equal(opts.length, INDUSTRIES.length);
  for (const [, key, rate] of opts) assert.equal(INDUSTRIES.find((x) => x.key === key)?.rate, Number(rate), key);
  // 본문 예시 숫자
  assert.match(html, /부가세 <strong>909원<\/strong>, 공급가액 <strong>9,091원<\/strong>/);
  assert.match(html, /<strong>800,000원<\/strong>/);
  assert.match(html, /1,714,000원/);
  assert.ok(html.includes('1억 400만원') && html.includes('4,800만원') && html.includes('0.5%') && html.includes('1.3%'));
});

test('메타·본문 구조: 분류·순서, FAQ 숫자, h2 3개 이상, 본문 1,000자 이상', () => {
  assert.equal(meta.slug, 'vat');
  assert.equal(meta.category, 'tax');
  assert.equal(meta.order, 50);
  assert.equal(meta.popular, undefined);
  assert.equal(meta.script, 'vat.js');
  assert.ok(meta.faq.length >= 4 && meta.faq.length <= 6);
  assert.ok(meta.description.length >= 120 && meta.description.length <= 160, `${meta.description.length}자`);
  const article = html.slice(html.indexOf('<article class="prose">'), html.indexOf('</article>'));
  assert.ok((article.match(/<h2>/g) || []).length >= 3);
  const text = article.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  assert.ok(text.length >= 1000, `${text.length}자`);
  assert.ok(article.includes('class="formula"'));
  assert.ok(article.includes('반영하지 않습니다'));
  // FAQ 예시가 계산과 맞는다
  const faq = meta.faq.map(([q, a]) => q + a).join(' ');
  assert.ok(faq.includes('부가세 909원, 공급가액 9,091원'));
  const s = simpleTax({ sales: 60_000_000, purchases: 20_000_000 });
  assert.ok(faq.includes(`${new Intl.NumberFormat('ko-KR').format(s.pay)}원을 냅니다`));
});
