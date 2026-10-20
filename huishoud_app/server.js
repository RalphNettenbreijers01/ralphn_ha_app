// Minimale server zonder dependencies: serveert de gebouwde app en bewaart data in een JSON-bestand.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 8099);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const DATA_DIR = process.env.DATA_DIR ?? '/data'; // /data blijft behouden bij updates van de add-on
const DATA_FILE = path.join(DATA_DIR, 'huishoud.json');
const MAX_BODY = 20 * 1024 * 1024; // avatars zijn data-URL's

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function handleApi(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    try {
      res.end(fs.readFileSync(DATA_FILE));
    } catch {
      res.end('{}'); // nog geen data
    }
    return;
  }

  if (req.method === 'PUT') {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        res.statusCode = 413;
        res.end('{"error":"te groot"}');
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) throw new Error('ongeldig');
        const tmp = DATA_FILE + '.tmp';
        fs.writeFileSync(tmp, body);
        fs.renameSync(tmp, DATA_FILE); // atomisch schrijven
        res.end('{"ok":true}');
      } catch {
        res.statusCode = 400;
        res.end('{"error":"ongeldige data"}');
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end('{"error":"methode niet toegestaan"}');
}

function handleStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html'); // SPA-fallback
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
  if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://x');
      if (pathname === '/api/data') handleApi(req, res);
      else handleStatic(req, res);
    } catch {
      res.statusCode = 400;
      res.end();
    }
  })
  .listen(PORT, '0.0.0.0', () => console.log(`Huishoud-app luistert op poort ${PORT}, data: ${DATA_FILE}`));
