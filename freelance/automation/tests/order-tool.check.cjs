// 브라우저 점검 (Playwright 필요): node tests/order-tool.check.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const DIR = path.join(__dirname, '..');
const SAMPLE = path.join(DIR, 'samples', '스마트스토어_주문내역_샘플.xlsx');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`file://${path.join(DIR, 'order-tool.html')}`);
  await page.waitForFunction(() => window.XLSX && window.__tool);
  await page.setInputFiles('#pick', [{ name: path.basename(SAMPLE), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(SAMPLE) }]);
  await page.waitForSelector('#outCard:not(.hidden)');
  const src = JSON.parse(execFileSync('python3', ['-c', `
import json, openpyxl, sys
ws = openpyxl.load_workbook(sys.argv[1]).active
rows = list(ws.iter_rows(min_row=2, values_only=True))
print(json.dumps({'lines': len(rows), 'qty': sum(r[10] for r in rows), 'people': len({(r[4], r[7]) for r in rows})}))`, SAMPLE]).toString());
  const r = await page.evaluate(() => { const b = window.__tool.build(); return { map: window.__tool.state.map, lines: b.lines.length, boxes: b.ship.length, shipQty: b.ship.reduce((s, x) => s + x.qty, 0), pickQty: b.picks.reduce((s, x) => s + x.qty, 0), multi: b.ship.filter((s) => s.multi).length, sample: b.ship.find((s) => s.multi) }; });
  const ok = (name, cond) => { console.log(cond ? '✓' : '✗', name); if (!cond) process.exitCode = 1; };
  ok(`열 자동 연결: ${JSON.stringify(r.map)}`, r.map.name === '수취인명' && r.map.phone === '수취인연락처1' && r.map.addr === '통합배송지' && r.map.qty === '수량' && r.map.option === '옵션정보' && r.map.order === '주문번호');
  ok(`주문 ${r.lines}줄 = 원본 ${src.lines}줄`, r.lines === src.lines);
  ok(`합포장 ${r.boxes}박스 = 받는 분 ${src.people}명`, r.boxes === src.people);
  ok(`수량 송장 ${r.shipQty} = 피킹 ${r.pickQty} = 원본 ${src.qty}`, r.shipQty === src.qty && r.pickQty === src.qty);
  ok(`합포장 예: ${r.sample.name} → ${r.sample.items}`, r.sample.items.includes('×') && r.multi > 0);
  ok('전화번호 정리', await page.evaluate(() => ['01011112222', '010 5555 6666', '0212345678', '031-123-4567'].map(window.__tool.phone).join() === '010-1111-2222,010-5555-6666,02-1234-5678,031-123-4567'));
  // 합포장 끄기
  await page.uncheck('#combine');
  const off = await page.evaluate(() => window.__tool.build().ship.length);
  ok(`합포장 끄면 ${off}박스`, off === src.lines);
  await page.check('#combine');
  // 송장 열 이름 바꾸기 → 내려받기에 반영
  await page.click('details summary');
  await page.fill('[data-head="name"]', '받는분');
  await page.dispatchEvent('[data-head="name"]', 'change');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
  const out = path.join(require('os').tmpdir(), `order-result-${Date.now()}.xlsx`);
  await dl.saveAs(out);
  const x = JSON.parse(execFileSync('python3', ['-c', `
import json, openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1])
s = wb['송장등록']; p = wb['피킹리스트']
print(json.dumps({'sheets': wb.sheetnames, 'head': [c.value for c in s[1]], 'boxes': s.max_row - 1, 'qty': sum(r[5] for r in s.iter_rows(min_row=2, values_only=True)), 'pick': sum(r[2] for r in p.iter_rows(min_row=2, values_only=True)), 'zip': s.cell(2, 3).value}))`, out]).toString());
  ok(`내려받은 파일: ${x.sheets.join(', ')} / 머리글 ${x.head.join('·')} / ${x.boxes}박스 / 수량 ${x.qty}·${x.pick} / 우편번호 ${x.zip}`, x.head[0] === '받는분' && x.boxes === src.people && x.qty === src.qty && x.pick === src.qty && /^\d{5}$/.test(String(x.zip)));
  await page.click('#demo');
  await page.screenshot({ path: path.join(DIR, 'tests', 'order-tool.png'), fullPage: true });
  ok(`오류 없음 ${errs.join(' | ')}`, errs.length === 0);
  await browser.close();
})();
