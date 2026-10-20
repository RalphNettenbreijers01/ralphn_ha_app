// Minimale server zonder dependencies:
//  - serveert de gebouwde app
//  - bewaart data in een JSON-bestand
//  - publiceert sensoren naar Home Assistant en stuurt dagelijkse taakherinneringen
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 8099);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const DATA_DIR = process.env.DATA_DIR ?? '/data'; // /data blijft behouden bij updates van de add-on
const DATA_FILE = path.join(DATA_DIR, 'huishoud.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const OPTIONS_FILE = process.env.OPTIONS_FILE ?? path.join(DATA_DIR, 'options.json');
const MAX_BODY = 20 * 1024 * 1024; // avatars zijn data-URL's
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_API = 'http://supervisor/core/api';

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

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJsonAtomic = (file, text) => {
  fs.writeFileSync(file + '.tmp', text);
  fs.renameSync(file + '.tmp', file);
};

const options = readJson(OPTIONS_FILE, {});
const NOTIFY_DEFAULT = (options.notify_service ?? '').replace(/^notify\./, '').trim();
const NOTIFY_TIME = /^\d{2}:\d{2}$/.test(options.notify_time ?? '') ? options.notify_time : '08:00';

// ---------- Home Assistant ----------

async function ha(method, apiPath, body) {
  if (!SUPERVISOR_TOKEN) return null; // niet in HA (lokaal testen)
  const res = await fetch(HA_API + apiPath, {
    method,
    headers: { Authorization: `Bearer ${SUPERVISOR_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HA ${method} ${apiPath} → ${res.status}`);
  return res;
}

async function initTimezone() {
  if (!SUPERVISOR_TOKEN) return;
  try {
    const res = await fetch('http://supervisor/info', { headers: { Authorization: `Bearer ${SUPERVISOR_TOKEN}` } });
    const tz = (await res.json())?.data?.timezone;
    if (tz) process.env.TZ = tz;
  } catch (e) {
    console.warn('Tijdzone ophalen mislukt, UTC wordt gebruikt:', e.message);
  }
}

const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'gebruiker';
const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99');

function summarize(data) {
  const today = todayISO();
  const user = (id) => data.users?.find((u) => u.id === id);
  const room = (id) => data.rooms?.find((r) => r.id === id);
  const describe = (t) => ({
    titel: t.title,
    tijd: t.time || null,
    gebruiker: user(t.userId)?.name ?? null,
    ruimte: room(t.roomId)?.name ?? null,
    status: t.status,
  });
  const todays = data.tasks.filter((t) => t.date === today).sort(byTime);
  const overdue = data.tasks.filter((t) => t.date < today && t.status !== 'done');
  return { today, todays, overdue, describe, user, room };
}

let publishedIds = new Set();

async function publishStates() {
  if (!SUPERVISOR_TOKEN) return;
  const data = readJson(DATA_FILE, { users: [], rooms: [], tasks: [] });
  const { todays, overdue, describe } = summarize(data);
  const open = todays.filter((t) => t.status !== 'done');
  const states = {
    'sensor.huishoud_taken_vandaag': {
      state: open.length,
      attributes: {
        friendly_name: 'Huishouden: open taken vandaag',
        icon: 'mdi:home-heart',
        unit_of_measurement: 'taken',
        totaal: todays.length,
        voltooid: todays.length - open.length,
        taken: todays.map(describe),
      },
    },
    'sensor.huishoud_taken_achterstallig': {
      state: overdue.length,
      attributes: {
        friendly_name: 'Huishouden: achterstallige taken',
        icon: 'mdi:alert-circle-outline',
        unit_of_measurement: 'taken',
        taken: overdue.map(describe),
      },
    },
  };
  for (const u of data.users ?? []) {
    const mine = open.filter((t) => t.userId === u.id);
    states[`sensor.huishoud_${slug(u.name)}_open_vandaag`] = {
      state: mine.length,
      attributes: {
        friendly_name: `Huishouden: open taken ${u.name}`,
        icon: 'mdi:account-check-outline',
        unit_of_measurement: 'taken',
        taken: mine.map(describe),
      },
    };
  }
  try {
    for (const [id, body] of Object.entries(states)) await ha('POST', `/states/${id}`, body);
    for (const id of publishedIds) if (!(id in states)) await ha('DELETE', `/states/${id}`).catch(() => {});
    publishedIds = new Set(Object.keys(states));
  } catch (e) {
    console.warn('Sensoren publiceren mislukt:', e.message);
  }
}

let publishTimer;
const schedulePublish = () => {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(publishStates, 1000);
};

async function notify(service, title, message) {
  await ha('POST', `/services/notify/${service}`, { title, message });
}

async function sendDailyReminders() {
  if (!SUPERVISOR_TOKEN) return;
  const now = new Date();
  const [h, m] = NOTIFY_TIME.split(':').map(Number);
  const minutesSince = now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
  if (minutesSince < 0 || minutesSince > 120) return; // niet te laat alsnog sturen na een herstart

  const state = readJson(STATE_FILE, {});
  const today = todayISO();
  if (state.lastNotified === today) return;
  state.lastNotified = today; // eerst opslaan: liever één herinnering te weinig dan dubbel
  writeJsonAtomic(STATE_FILE, JSON.stringify(state));

  const data = readJson(DATA_FILE, { users: [], rooms: [], tasks: [] });
  const { todays, overdue, room, user } = summarize(data);
  const open = todays.filter((t) => t.status !== 'done');
  const line = (t) => `• ${t.time ? t.time + ' ' : ''}${t.title}${room(t.roomId) ? ` (${room(t.roomId).name})` : ''}`;

  // groepeer per ontvanger; taken zonder (bereikbare) gebruiker gaan naar de standaardservice
  const groups = new Map();
  const add = (service, task, late) => {
    if (!service) return;
    if (!groups.has(service)) groups.set(service, { today: [], late: [] });
    groups.get(service)[late ? 'late' : 'today'].push(task);
  };
  for (const t of open) add(user(t.userId)?.notifyService || NOTIFY_DEFAULT, t, false);
  for (const t of overdue) add(user(t.userId)?.notifyService || NOTIFY_DEFAULT, t, true);

  for (const [service, g] of groups) {
    const parts = [];
    if (g.today.length) parts.push(g.today.sort(byTime).map(line).join('\n'));
    if (g.late.length) parts.push(`Achterstallig (${g.late.length}):\n` + g.late.map(line).join('\n'));
    try {
      await notify(service, `Huishouden: ${g.today.length} taken vandaag`, parts.join('\n\n'));
    } catch (e) {
      console.warn(`Melding naar notify.${service} mislukt:`, e.message);
    }
  }
}

// ---------- HTTP ----------

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
        writeJsonAtomic(DATA_FILE, body);
        res.end('{"ok":true}');
        schedulePublish();
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

await initTimezone();
publishStates();
setInterval(publishStates, 5 * 60 * 1000); // houdt sensoren actueel (datumwissel, HA-herstart)
setInterval(() => sendDailyReminders().catch((e) => console.warn('Herinneringen mislukt:', e.message)), 30 * 1000);
