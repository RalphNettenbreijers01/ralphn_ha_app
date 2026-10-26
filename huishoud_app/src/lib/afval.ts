import type { AppData, Task } from '../types';
import { addDays, formatLong, parseISO, toISO, todayISO } from './dates';

export interface Pickup {
  type: string; // bijv. "GFT", "Restafval"
  date: string; // YYYY-MM-DD, de ophaaldag
}

export interface AfvalInfo {
  configured: boolean;
  pickups: Pickup[];
  updatedAt: string | null;
  errors: string[];
}

export const AFVAL_PREFIX = 'afval:';
export const afvalKey = (p: Pickup) => `${AFVAL_PREFIX}${p.type}|${p.date}`;
const isOfType = (t: Task, type: string) => !!t.sourceKey?.startsWith(`${AFVAL_PREFIX}${type}|`);

/**
 * Zet ophaaldagen om in taken op de avond ervoor. Bestaande taken blijven onaangeroerd;
 * door de gebruiker verwijderde taken (`ignored`) komen niet terug.
 */
export function mergePickups(data: AppData, pickups: Pickup[]): AppData {
  const today = todayISO();
  const types = { ...data.afval.types };
  const known = new Set(data.tasks.map((t) => t.sourceKey).filter(Boolean));
  const ignored = new Set(data.afval.ignored);
  const created: Task[] = [];

  for (const p of pickups) {
    if (!types[p.type]) types[p.type] = { enabled: true, userId: null, roomId: null };
    const cfg = types[p.type];
    const key = afvalKey(p);
    const taskDate = toISO(addDays(parseISO(p.date), -1));
    if (!cfg.enabled || known.has(key) || ignored.has(key) || taskDate < today) continue;
    known.add(key);
    created.push({
      id: key, // deterministisch: twee apparaten maken zo nooit dubbele taken
      title: `${p.type} buiten zetten`,
      description: `Ophaaldag: ${formatLong(parseISO(p.date))}`,
      userId: cfg.userId,
      roomId: cfg.roomId,
      date: taskDate,
      time: data.afval.time,
      status: 'open',
      sourceKey: key,
    });
  }

  const typesChanged = Object.keys(types).length !== Object.keys(data.afval.types).length;
  if (!created.length && !typesChanged) return data;
  return { ...data, tasks: [...data.tasks, ...created], afval: { ...data.afval, types } };
}

/** Pas een wijziging in de instellingen van één containersoort toe op nog komende, open taken. */
export function applyTypeSettings(data: AppData, type: string): AppData {
  const cfg = data.afval.types[type];
  const today = todayISO();
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      isOfType(t, type) && t.status !== 'done' && t.date >= today
        ? { ...t, userId: cfg.userId, roomId: cfg.roomId }
        : t,
    ),
  };
}

/** Verwijder nog niet uitgevoerde, komende taken van een soort (bij uitzetten). */
export function removeUpcoming(data: AppData, type: string): AppData {
  const today = todayISO();
  return { ...data, tasks: data.tasks.filter((t) => !(isOfType(t, type) && t.status === 'open' && t.date >= today)) };
}
