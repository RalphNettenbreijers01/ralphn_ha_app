import type { AppData } from '../types';

export const STORAGE_KEY = 'huishoud-app:v1';

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const USER_COLORS = ['#6366f1', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#eab308', '#8b5cf6', '#ef4444'];
export const EMOJI_AVATARS = [
  '👩', '👨', '🧒', '👧', '👦', '👵', '👴', '🧑‍🍳', '🦸', '🧙', '🐱', '🐶', '🦊', '🐼', '🦉', '🤖',
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
});

const normalize = (p: Partial<AppData>): AppData => ({
  users: p.users ?? [],
  rooms: p.rooms ?? [],
  tasks: p.tasks ?? [],
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

/**
 * Server-side opslag (Home Assistant add-on): GET/PUT op het relatieve pad `api/data`.
 * Geeft `undefined` terug als er geen backend is (bijv. tijdens `npm run dev`),
 * `null` als de backend nog geen data heeft.
 */
export async function fetchRemote(): Promise<AppData | null | undefined> {
  try {
    const res = await fetch('api/data', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return undefined;
    const json = await res.json();
    return json && typeof json === 'object' && 'tasks' in json ? normalize(json) : null;
  } catch {
    return undefined;
  }
}

export async function pushRemote(data: AppData): Promise<void> {
  try {
    await fetch('api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Synchroniseren met server mislukt', e);
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
