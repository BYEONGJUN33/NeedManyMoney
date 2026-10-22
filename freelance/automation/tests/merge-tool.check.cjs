// 브라우저 점검 (Playwright 필요): node tests/merge-tool.check.cjs
// 샘플 파일 3개를 넣고 → 합본 줄 수·열 이름 맞추기·요약표 합계를 확인 → 내려받은 엑셀을 다시 열어 원본 합계와 비교
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const DIR = path.join(__dirname, '..');
const SAMPLES = path.join(DIR, 'samples');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`file://${path.join(DIR, 'merge-tool.html')}`);
  await page.waitForFunction(() => window.XLSX && window.__tool);
  const files = ['매출_강남점.xlsx', '매출_홍대점.xlsx', '매출_판교점.xlsx'].map((f) => path.join(SAMPLES, f));
  // 한글 경로는 Playwright가 그대로 못 넘겨서 내용과 이름을 직접 넘긴다
  await page.setInputFiles('#pick', files.map((f) => ({ name: path.basename(f), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(f) })));
  await page.waitForSelector('#outCard:not(.hidden)');
  const r = await page.evaluate(() => {
    const { cols, rows } = window.__tool.merge();
    const head = [...document.querySelectorAll('#pivot thead th')].map((t) => t.textContent);
    const foot = [...document.querySelectorAll('#pivot tr.total td')].map((t) => t.textContent);
    return { cols, n: rows.length, head, foot, rowKey: document.querySelector('#rowKey').value, colKey: document.querySelector('#colKey').value, valKey: document.querySelector('#valKey').value };
  });
  // 원본 합계 (파이썬으로 각 파일의 '합계' 줄 읽기)
  const expected = JSON.parse(execFileSync('python3', ['-c', `
import json, openpyxl, sys
tot = 0; rows = 0
for f in sys.argv[1:]:
    ws = openpyxl.load_workbook(f, data_only=True).active
    for r in ws.iter_rows(min_row=4, values_only=True):
        if r[0] == '합계': tot += r[4]
        elif any(v not in (None, '') for v in r): rows += 1
print(json.dumps({'total': tot, 'rows': rows}))`, ...files]).toString());
  const ok = (name, cond) => { console.log(cond ? '✓' : '✗', name); if (!cond) process.exitCode = 1; };
  ok(`열: ${r.cols.join(', ')}`, r.cols.includes('매출액') && !r.cols.includes('매출 금액') && r.cols.includes('담당자'));
  ok(`합본 ${r.n}줄 = 원본 ${expected.rows}줄 (합계 줄 제외)`, r.n === expected.rows);
  ok(`기본 요약: 행=${r.rowKey}, 열=${r.colKey}, 값=${r.valKey}`, r.rowKey === '파일' && r.colKey === '일자(월)' && r.valKey === '매출액');
  ok(`요약 열: ${r.head.join(' | ')}`, r.head.join('|') === '파일|2026-07|2026-08|2026-09|합계');
  const grand = Number(r.foot.at(-1).replace(/,/g, ''));
  ok(`요약 총합 ${grand.toLocaleString()} = 원본 합계 ${expected.total.toLocaleString()}`, grand === expected.total);
  // 내려받기
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
  const out = path.join(require('os').tmpdir(), `merge-result-${Date.now()}.xlsx`);
  await dl.saveAs(out);
  const x = JSON.parse(execFileSync('python3', ['-c', `
import json, openpyxl, sys
wb = openpyxl.load_workbook(sys.argv[1])
s = wb['요약']; m = wb['합본']
last = [c.value for c in list(s.iter_rows())[-1]]
print(json.dumps({'sheets': wb.sheetnames, 'grand': last[-1], 'merged_rows': m.max_row - 1, 'date_type': type(m.cell(2, 2).value).__name__}))`, out]).toString());
  ok(`내려받은 파일: 시트 ${x.sheets.join(', ')}, 총합 ${x.grand}, 합본 ${x.merged_rows}줄, 날짜 칸 ${x.date_type}`, x.grand === expected.total && x.merged_rows === expected.rows && x.date_type === 'datetime');
  // 예시 데이터 버튼
  await page.click('#demo');
  const demoN = await page.evaluate(() => window.__tool.merge().rows.length);
  ok(`예시 데이터 ${demoN}줄`, demoN > 50);
  await page.screenshot({ path: path.join(DIR, 'tests', 'merge-tool.png'), fullPage: true });
  ok(`오류 없음 ${errs.join(' | ')}`, errs.length === 0);
  await browser.close();
})();
