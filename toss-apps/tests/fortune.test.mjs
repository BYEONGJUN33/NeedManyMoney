import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, animalOfYear, fortune, todayKST, ALL_TEXT } from '../apps/fortune/fortune.js';

test('띠 계산: 태어난 해 → 띠', () => {
  assert.equal(ANIMALS[animalOfYear(1996)].name, '쥐');
  assert.equal(ANIMALS[animalOfYear(1997)].name, '소');
  assert.equal(ANIMALS[animalOfYear(2024)].name, '용');
  assert.equal(ANIMALS[animalOfYear(1990)].name, '말');
});

test('같은 날 같은 띠는 늘 같은 운세, 날마다·띠마다 달라진다', () => {
  assert.deepEqual(fortune('2026-10-24', 3), fortune('2026-10-24', 3));
  const days = Array.from({ length: 30 }, (_, i) => fortune(`2026-11-${String(i + 1).padStart(2, '0')}`, 0).overall);
  assert.ok(new Set(days).size >= 15, '한 달 동안 문장이 충분히 바뀐다');
  const animals = ANIMALS.map((_, i) => fortune('2026-10-24', i).score);
  assert.ok(new Set(animals).size >= 6, '띠마다 점수가 다르다');
});

test('점수 55~98, 세 가지 분위기가 모두 나온다', () => {
  const tones = new Set();
  for (let d = 1; d <= 60; d += 1) for (let a = 0; a < 12; a += 1) {
    const f = fortune(`2027-01-${String((d % 28) + 1).padStart(2, '0')}-${d}`, a);
    assert.ok(f.score >= 55 && f.score <= 98);
    assert.ok(f.number >= 1 && f.number <= 9);
    tones.add(f.tone);
  }
  assert.deepEqual([...tones].sort(), ['careful', 'good', 'great']);
});

test('투자·도박·의료 조언이 들어가지 않는다 (토스 출시 정책)', () => {
  const banned = /주식|코인|투자|로또|복권|도박|베팅|대출|보험 상품|병원|진료|약을|처방|치료|다이어트약/;
  for (const s of ALL_TEXT) assert.ok(!banned.test(s), s);
});

test('한국 시간 날짜', () => {
  assert.equal(todayKST(new Date('2026-10-23T15:30:00Z')), '2026-10-24'); // KST 00:30
  assert.equal(todayKST(new Date('2026-10-23T14:59:00Z')), '2026-10-23');
});
