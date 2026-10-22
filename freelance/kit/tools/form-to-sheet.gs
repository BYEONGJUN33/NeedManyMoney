/**
 * 문의 폼 → 구글 시트 저장 + 메일 알림 (무료, 고객 구글 계정에 설치)
 *
 * 설치 (5분)
 *  1. 고객 구글 계정으로 새 구글 시트를 만든다 → 확장 프로그램 → Apps Script
 *  2. 이 파일 내용을 붙여 넣고 NOTIFY_EMAIL을 고객 메일로 바꾼 뒤 저장
 *  3. 배포 → 새 배포 → 유형: 웹 앱 → 실행 사용자: 나, 액세스 권한: 모든 사용자 → 배포 → 권한 승인
 *  4. 나온 웹 앱 URL을 site.json의 form 섹션에 넣는다:
 *       "action": "https://script.google.com/macros/s/…/exec", "provider": "sheet"
 *  5. 사이트를 다시 빌드하고 실제로 한 번 보내 시트에 줄이 생기는지 확인
 */
const NOTIFY_EMAIL = 'owner@example.com'; // 문의가 오면 알림을 받을 메일 (비우면 알림 없음)
const SHEET_NAME = '문의';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    // 첫 줄은 제목. 새 항목이 들어오면 제목 칸을 늘린다
    const headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : ['접수 시각'];
    Object.keys(data).forEach((k) => { if (headers.indexOf(k) < 0) headers.push(k); });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    const row = headers.map((h) => (h === '접수 시각' ? new Date() : clean(data[h])));
    sheet.appendRow(row);
    if (NOTIFY_EMAIL) {
      const body = Object.keys(data).map((k) => `${k}: ${data[k]}`).join('\n');
      MailApp.sendEmail(NOTIFY_EMAIL, `[홈페이지 문의] ${data.name || data.email || '새 문의'}`, `${body}\n\n시트: ${ss.getUrl()}`);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/** 시트 수식 주입 방지: =, +, -, @로 시작하는 값 앞에 ' 를 붙인다 */
function clean(v) {
  const s = v == null ? '' : String(v).slice(0, 2000);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}
