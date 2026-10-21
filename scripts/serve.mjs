// 로컬 미리보기 서버: node scripts/serve.mjs [폴더] [포트]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const root = process.argv[2] || 'dist';
const port = Number(process.argv[3] || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = (await stat(`${file}.html`).catch(() => null)) ? `${file}.html` : join(root, '404.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(file.endsWith('404.html') && !path.endsWith('404.html') ? 404 : 200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500).end();
  }
}).listen(port, () => console.log(`http://localhost:${port} (${root})`));
