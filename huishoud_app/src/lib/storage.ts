import type { AppData } from '../types';
import type { AfvalInfo } from './afval';

export const STORAGE_KEY = 'huishoud-app:v1';

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const USER_COLORS = ['#6366f1', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#eab308', '#8b5cf6', '#ef4444'];
export const EMOJI_AVATARS = [
  '👩', '👨', '🧒', '👧', '👦', '👵', '👴', '🧑‍🍳', '🦸', '🧙', '🐱', '🐶', '🦊', '🐼', '🦉', '🤖',
];
export const NOTE_COLORS: Record<string, string> = {
  yellow: '#fff59d',
  pink: '#f8bbd0',
  blue: '#b3e5fc',
  green: '#c8e6c9',
  orange: '#ffe0b2',
  purple: '#e1bee7',
};

export const SHOPPING_CATEGORIES: Record<string, { label: string; icon: string }> = {
  produce: { label: 'Groente & fruit', icon: '🥦' },
  dairy: { label: 'Zuivel & eieren', icon: '🥛' },
  bakery: { label: 'Brood & gebak', icon: '🥖' },
  meat: { label: 'Vlees & vis', icon: '🍗' },
  pantry: { label: 'Houdbaar', icon: '🥫' },
  drinks: { label: 'Drinken', icon: '🧃' },
  frozen: { label: 'Diepvries', icon: '🧊' },
  household: { label: 'Huishouden & verzorging', icon: '🧻' },
  other: { label: 'Overig', icon: '🛒' },
};

export const REWARD_ICONS = ['🎬', '😴', '🍦', '🎮', '🍕', '🎁', '🛍️', '🎢', '🧸', '📱'];

export const REWARD_EXAMPLES = [
  { title: 'Filmavond kiezen', icon: '🎬', cost: 50 },
  { title: 'Uitslapen', icon: '😴', cost: 100 },
  { title: 'Ijsje halen', icon: '🍦', cost: 30 },
  { title: '30 minuten extra gamen', icon: '🎮', cost: 40 },
  { title: 'Kiezen wat we eten', icon: '🍕', cost: 60 },
];

export const ROOM_ICONS = ['🍳', '🛋️', '🛁', '🌳', '🛏️', '🚗', '🧺', '💻', '🚪', '📦'];

const defaultData = (): AppData => ({
  users: [],
  rooms: [
    { id: uid(), name: 'Keuken', icon: '🍳' },
    { id: uid(), name: 'Woonkamer', icon: '🛋️' },
    { id: uid(), name: 'Badkamer', icon: '🛁' },
    { id: uid(), name: 'Tuin', icon: '🌳' },
    { id: uid(), name: 'Slaapkamer', icon: '🛏️' },
  ],
  tasks: [],
  notes: [],
  shopping: [],
  shoppingNames: [],
  afval: { types: {}, time: '18:00', ignored: [] },
  meals: [],
  points: [],
  rewards: [],
  badges: [],
  deleted: {},
});

const normalize = (p: Partial<AppData>): AppData => ({
  users: p.users ?? [],
  rooms: p.rooms ?? [],
  tasks: p.tasks ?? [],
  notes: p.notes ?? [],
  shopping: p.shopping ?? [],
  shoppingNames: p.shoppingNames ?? [],
  afval: { types: {}, time: '18:00', ignored: [], ...p.afval },
  meals: p.meals ?? [],
  points: p.points ?? [],
  rewards: p.rewards ?? [],
  badges: p.badges ?? [],
  deleted: p.deleted ?? {},
  rev: p.rev,
});

function loadLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<AppData>);
  } catch {
    /* corrupt or unavailable storage: start fresh */
  }
  return null;
}

export const loadData = (): AppData => loadLocal() ?? defaultData();

/** Verschil tussen de klok van dit apparaat en de server, zodat tijdstempels onderling vergelijkbaar zijn. */
export const clock = { offset: 0 };
export const syncedNow = () => Date.now() + clock.offset;

const isJson = (res: Response) => res.ok && (res.headers.get('content-type') ?? '').includes('application/json');

/**
 * Server-side opslag (Home Assistant add-on): GET/PUT op het relatieve pad `api/data`.
 * - `undefined`: geen backend (bijv. tijdens `npm run dev`)
 * - `null`: backend heeft nog geen data
 * - `'unchanged'`: sinds `sinceRev` is er niets gewijzigd
 */
export async function fetchRemote(sinceRev?: number): Promise<AppData | null | undefined | 'unchanged'> {
  try {
    const res = await fetch(sinceRev === undefined ? 'api/data' : `api/data?rev=${sinceRev}`, { cache: 'no-store' });
    if (!isJson(res)) return undefined;
    const json = await res.json();
    if (typeof json.serverNow === 'number') clock.offset = json.serverNow - Date.now();
    if (json.unchanged) return 'unchanged';
    return json && typeof json === 'object' && 'tasks' in json ? normalize(json) : null;
  } catch {
    return undefined;
  }
}

export async function fetchAfval(refresh = false): Promise<AfvalInfo | undefined> {
  try {
    const res = await fetch(refresh ? 'api/afval?refresh=1' : 'api/afval', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return undefined;
    return (await res.json()) as AfvalInfo;
  } catch {
    return undefined;
  }
}

/** Stuurt de data naar de server, die hem samenvoegt met die van andere apparaten; geeft het resultaat terug. */
export async function pushRemote(data: AppData): Promise<AppData | undefined> {
  try {
    const res = await fetch('api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!isJson(res)) return undefined;
    const json = await res.json();
    if (typeof json.serverNow === 'number') clock.offset = json.serverNow - Date.now();
    return 'tasks' in json ? normalize(json) : undefined;
  } catch (e) {
    console.error('Synchroniseren met server mislukt', e);
    return undefined;
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Opslaan mislukt (opslag vol?)', e);
  }
}

/** Crop + resize an uploaded image to a small square data URL so LocalStorage stays small. */
export function imageToAvatar(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ongeldige afbeelding'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
