import type { AppData, PointEntry, Task } from '../types';
import { newBadges } from './badges';

export const DEFAULT_POINTS = 10;
export const taskPoints = (t: Task) => t.points ?? DEFAULT_POINTS;

/** Sleutels van afgeronde voorkomens van een taak (bij terugkerende taken: per datum). */
function doneKeys(t: Task): string[] {
  if (t.repeat) {
    return Object.entries(t.occStatus ?? {})
      .filter(([, s]) => s === 'done')
      .map(([date]) => `${t.id}|${date}`);
  }
  return t.status === 'done' ? [`${t.id}|once`] : [];
}

export const balanceOf = (data: AppData, userId: string) =>
  data.points.filter((e) => e.userId === userId).reduce((s, e) => s + e.points, 0);

export const totalEarned = (data: AppData, userId: string) =>
  data.points.filter((e) => e.userId === userId && e.points > 0).reduce((s, e) => s + e.points, 0);

/** Level: elke 100 verdiende punten een level erbij. */
export const levelOf = (earned: number) => ({
  level: Math.floor(earned / 100) + 1,
  progress: earned % 100,
});

/**
 * Houdt punten en badges in lijn met de taken. Wordt na elke lokale wijziging uitgevoerd:
 * - taak afgerond → punten voor de toegewezen gebruiker (deterministisch id, dus nooit dubbel, ook niet over apparaten)
 * - taak weer geopend → die punten worden ingetrokken
 * - verwijderde taken laten verdiende punten met rust
 * - nieuwe badges worden toegekend en nooit ingetrokken
 */
export function reconcile(prev: AppData, next: AppData): AppData {
  let out = next;

  if (prev.tasks !== next.tasks) {
    const before = new Map(prev.tasks.map((t) => [t.id, t]));
    const remove = new Set<string>();
    const add: PointEntry[] = [];
    for (const t of next.tasks) {
      const p = before.get(t.id);
      if (p === t) continue;
      const was = new Set(p ? doneKeys(p) : []);
      const now = new Set(doneKeys(t));
      for (const k of now) {
        if (!was.has(k) && t.userId && taskPoints(t) > 0) {
          add.push({
            id: `earn|${k}`,
            userId: t.userId,
            points: taskPoints(t),
            reason: t.title,
            ts: Date.now(),
            kind: 'earn',
            roomId: t.roomId,
            tag: t.sourceKey?.startsWith('afval:') ? 'afval' : undefined,
          });
        }
      }
      for (const k of was) if (!now.has(k)) remove.add(`earn|${k}`);
    }
    if (remove.size || add.length) {
      const have = new Set(next.points.map((e) => e.id));
      out = {
        ...out,
        points: [...next.points.filter((e) => !remove.has(e.id)), ...add.filter((e) => !have.has(e.id))],
      };
    }
  }

  if (out.points !== prev.points || out.meals !== prev.meals || out.users !== prev.users) {
    const fresh = newBadges(out);
    if (fresh.length) out = { ...out, badges: [...out.badges, ...fresh] };
  }
  return out;
}
