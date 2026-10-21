import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { generateSalaryPages, manLabel } from '../src/generators/salary-pages.mjs';
import { CATEGORIES } from '../src/categories.mjs';

test('금액별 페이지: 연봉 181개 + 월급 81개, 슬러그 중복 없음', () => {
  const pages = generateSalaryPages();
  assert.equal(pages.length, 181 + 81);
  assert.equal(new Set(pages.map((p) => p.meta.slug)).size, pages.length);
  const p = pages.find((x) => x.meta.slug === 'salary-4000');
  assert.match(p.meta.title, /연봉 4,000만원 실수령액 2026 — 월 2,935,813원/);
  assert.equal(manLabel(12500), '1억 2,500만원');
  assert.equal(manLabel(20000), '2억원');
});

test('페이지 메타: 필수 항목과 짝이 되는 본문 파일', async () => {
  const dir = new URL('../src/pages/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.meta.mjs'));
  const cats = new Set(CATEGORIES.map((c) => c.key));
  const titles = new Set();
  for (const f of files) {
    const meta = (await import(new URL(f, dir))).default;
    const slug = f.replace('.meta.mjs', '');
    assert.equal(meta.slug, slug, f);
    assert.ok(meta.title && meta.description, `${f}: title/description`);
    assert.ok(!titles.has(meta.title), `${f}: 제목 중복`);
    titles.add(meta.title);
    await readFile(new URL(`${slug}.html`, dir), 'utf8');
    if (meta.kind === 'calculator') {
      assert.ok(cats.has(meta.category), `${f}: category`);
      for (const k of ['name', 'nav', 'desc', 'script']) assert.ok(meta[k], `${f}: ${k}`);
      assert.ok(Array.isArray(meta.faq) && meta.faq.length >= 3, `${f}: FAQ 3개 이상`);
    }
  }
});
