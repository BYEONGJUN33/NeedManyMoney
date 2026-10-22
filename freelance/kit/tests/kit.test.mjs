import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, rm, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, buildSite, pagesOf } from '../build.mjs';
import { renderPage, collectImages, SECTIONS, esc, rich } from '../lib/render.mjs';
import { icon, ICONS } from '../lib/icons.mjs';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLES = join(KIT, '../samples');
const fakeImages = (site) => Object.fromEntries(collectImages(site).map((p) => [p, { w: 1600, h: 1000, widths: [480, 960, 1600], base: p.replace(/^img\//, '').replace(/\.\w+$/, '') }]));

test('설정 확인: 빠진 항목과 잘못된 구조를 알려 준다', () => {
  assert.deepEqual(validate({ name: 'a', description: 'b', sections: [{ type: 'hero' }] }), []);
  assert.deepEqual(validate({ name: 'a', description: 'b', pages: [{ slug: 'index', sections: [{ type: 'hero' }] }, { slug: 'menu', sections: [{ type: 'hero' }] }] }), []);
  const pageErrs = validate({ name: 'a', description: 'b', pages: [{ slug: 'home', sections: [{ type: 'faq' }] }, { slug: 'Menu Page', sections: [{ type: 'hero' }] }] });
  assert.ok(pageErrs.some((e) => e.includes('index')) && pageErrs.some((e) => e.includes('slug는')) && pageErrs.some((e) => e.includes('[home] 첫 섹션')));
  const errs = validate({ name: 'a', sections: [{ type: 'about' }, { type: 'faq', nav: 'FAQ' }, { type: 'cta', id: 'x' }, { type: 'cta', id: 'x' }] });
  assert.ok(errs.some((e) => e.includes('description')));
  assert.ok(errs.some((e) => e.includes('첫 섹션')));
  assert.ok(errs.some((e) => e.includes('id가 필요')));
  assert.ok(errs.some((e) => e.includes('id 중복')));
});

test('글자 처리: HTML은 막고 줄바꿈·굵게만 허용', () => {
  assert.equal(esc('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  assert.equal(rich('a\n**b**<i>'), 'a<br><strong>b</strong>&lt;i&gt;');
});

test('모든 아이콘이 그려지고, 없는 아이콘은 알려 준다', () => {
  for (const n of ICONS) assert.match(icon(n), /^<svg[^>]*><path d="[^"]+"\/><\/svg>$/);
  assert.throws(() => icon('nope'), /없는 아이콘/);
});

test('샘플 4개가 모든 섹션 종류를 쓰고, 오류 없이 그려진다', async () => {
  const used = new Set();
  for (const name of await readdir(SAMPLES)) {
    const site = JSON.parse(await readFile(join(SAMPLES, name, 'site.json'), 'utf8'));
    assert.deepEqual(validate(site), [], name);
    const pages = pagesOf(site);
    const files = new Set(pages.map((p) => (p.slug === 'index' ? './' : `${p.slug}.html`)));
    for (const page of pages) {
      page.sections.forEach((s) => used.add(s.type));
      const html = renderPage(site, fakeImages(site), page);
      const where = `${name}/${page.slug}`;
      assert.match(html, /^<!doctype html>/);
      assert.ok(html.includes(`<title>`), where);
      assert.ok(!html.includes('undefined'), `${where}: undefined가 화면에 나옴`);
      // 같은 페이지 안 링크(#id)와 다른 페이지 링크(x.html)가 실제로 있다
      for (const [, id] of html.matchAll(/href="#([\w-]+)"/g)) assert.ok(html.includes(`id="${id}"`), `${where}: #${id} 없음`);
      for (const [, f] of html.matchAll(/href="((?:\.\/|[\w-]+\.html))"/g)) assert.ok(files.has(f) || f === 'privacy.html', `${where}: ${f} 없음`);
    }
    for (const ic of JSON.stringify(site).matchAll(/"icon":\s*"(\w+)"/g)) assert.ok(ICONS.includes(ic[1]), `${name}: 아이콘 ${ic[1]}`);
  }
  for (const type of Object.keys(SECTIONS)) assert.ok(used.has(type), `샘플에서 안 쓰는 섹션: ${type}`);
});

test('실제 빌드: 사진 크기별 WebP, 공유 이미지, 개인정보처리방침, 사이트맵', async () => {
  const out = join(KIT, '../dist/_test');
  await rm(out, { recursive: true, force: true });
  const r = await buildSite(join(SAMPLES, 'pilates'), out);
  assert.equal(r.images, 5);
  const html = await readFile(join(out, 'index.html'), 'utf8');
  for (const [, src] of html.matchAll(/(?:src|href)="(img\/[^"]+)"/g)) await access(join(out, src));
  for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) for (const part of set.split(', ')) await access(join(out, part.split(' ')[0]));
  await access(join(out, 'img/og.jpg'));
  const privacy = await readFile(join(out, 'privacy.html'), 'utf8');
  assert.ok(privacy.includes('개인정보처리방침') && privacy.includes('연락처'));
  assert.ok(html.includes('href="privacy.html"'));
  await access(join(out, 'favicon.svg'));
  await access(join(out, 'site.js'));
  await rm(out, { recursive: true, force: true });
});
