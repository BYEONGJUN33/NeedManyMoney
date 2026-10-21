"""근로소득 간이세액표 PDF → src/assets/js/taxtable-2026.js

간이세액표가 개정되면:
  1. 국가법령정보센터에서 소득세법 시행령 [별표 2] PDF를 내려받는다.
  2. pdftotext -layout 별표2.pdf table.txt
  3. python3 scripts/taxtable_from_pdf.py table.txt src/assets/js/taxtable-2026.js "<개정 YYYY. M. D.>"
  4. npm test 로 원문 값 검증 테스트를 새 표 기준으로 고친 뒤 통과시킨다.
"""
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
label = sys.argv[3] if len(sys.argv) > 3 else ''
num = lambda s: 0 if s == '-' else int(s.replace(',', ''))
rows = []
for line in open(src, encoding='utf-8'):
    toks = line.split()
    if len(toks) == 13 and all(re.fullmatch(r'[\d,]+|-', t) for t in toks):
        rows.append([num(toks[0]), num(toks[1])] + [num(t) for t in toks[2:]])
    elif toks[:1] == ['10,000천원'] and len(toks) == 12:
        rows.append([10000, 10000] + [num(t) for t in toks[1:]])

assert rows and rows[-1][0] == 10000, '10,000천원 행을 찾지 못했습니다'
for a, b in zip(rows, rows[1:-1]):
    assert a[1] == b[0], f'구간이 끊겼습니다: {a[:2]} → {b[:2]}'

out = [
    f'// 근로소득 간이세액표 — 소득세법 시행령 [별표 2] {label}'.rstrip(),
    '// 각 행: [월급여 이상(천원), 미만(천원), 공제대상가족 1명 … 11명 세액(원)]',
    '// 출처: 국가법령정보센터(law.go.kr) 원문 PDF에서 추출. 마지막 행은 월급여 10,000천원 정확히 해당.',
    'export const TAX_TABLE = [',
    *('[' + ','.join(map(str, r)) + '],' for r in rows),
    '];',
]
open(dst, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{len(rows)}행 → {dst}')
