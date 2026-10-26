import type { AppData, EarnedBadge } from '../types';
import { parseISO, toISO, addDays, todayISO } from './dates';

export type Metric = 'tasks' | 'points' | 'streak' | 'early' | 'late' | 'afval' | 'specialist' | 'cooked' | 'redeemed';

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  metric: Metric;
  target: number;
}

export const BADGES: BadgeDef[] = [
  { id: 'eerste-taak', name: 'Eerste stap', icon: '👣', description: 'Rond je eerste taak af', metric: 'tasks', target: 1 },
  { id: 'aanpakker', name: 'Aanpakker', icon: '💪', description: 'Rond 10 taken af', metric: 'tasks', target: 10 },
  { id: 'doorzetter', name: 'Doorzetter', icon: '🔥', description: 'Rond 50 taken af', metric: 'tasks', target: 50 },
  { id: 'held', name: 'Held van het huis', icon: '🦸', description: 'Rond 100 taken af', metric: 'tasks', target: 100 },
  { id: 'legende', name: 'Legende', icon: '🏆', description: 'Rond 500 taken af', metric: 'tasks', target: 500 },
  { id: 'puntenjager', name: 'Puntenjager', icon: '⭐', description: 'Verdien 100 punten', metric: 'points', target: 100 },
  { id: 'puntenmeester', name: 'Puntenmeester', icon: '🌟', description: 'Verdien 500 punten', metric: 'points', target: 500 },
  { id: 'puntenkoning', name: 'Puntenkoning', icon: '👑', description: 'Verdien 1000 punten', metric: 'points', target: 1000 },
  { id: 'op-dreef', name: 'Op dreef', icon: '📈', description: 'Rond 3 dagen op rij taken af', metric: 'streak', target: 3 },
  { id: 'weekstreak', name: 'Weekstreak', icon: '🗓️', description: 'Rond 7 dagen op rij taken af', metric: 'streak', target: 7 },
  { id: 'maandstreak', name: 'Maandstreak', icon: '🚀', description: 'Rond 30 dagen op rij taken af', metric: 'streak', target: 30 },
  { id: 'vroege-vogel', name: 'Vroege vogel', icon: '🐦', description: 'Rond 5 taken af vóór 09:00', metric: 'early', target: 5 },
  { id: 'nachtuil', name: 'Nachtuil', icon: '🦉', description: 'Rond 5 taken af na 22:00', metric: 'late', target: 5 },
  { id: 'afvalheld', name: 'Afvalheld', icon: '♻️', description: 'Zet 5 keer de containers buiten', metric: 'afval', target: 5 },
  { id: 'specialist', name: 'Specialist', icon: '🎯', description: 'Rond 10 taken af in dezelfde ruimte', metric: 'specialist', target: 10 },
  { id: 'chef', name: 'Chef', icon: '🧑‍🍳', description: 'Kook 5 keer volgens het weekmenu', metric: 'cooked', target: 5 },
  { id: 'sterrenkok', name: 'Sterrenkok', icon: '👨‍🍳', description: 'Kook 25 keer volgens het weekmenu', metric: 'cooked', target: 25 },
  { id: 'verwend', name: 'Verdiend!', icon: '🎁', description: 'Wissel je eerste beloning in', metric: 'redeemed', target: 1 },
];

export type Stats = Record<Metric, number>;

const localDay = (ts: number) => toISO(new Date(ts));

/** Langste reeks opeenvolgende dagen met minstens één afgeronde taak. */
function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && toISO(addDays(parseISO(prev), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Huidige reeks (telt door als je gisteren nog iets deed). */
export function currentStreak(data: AppData, userId: string): number {
  const days = new Set(data.points.filter((e) => e.userId === userId && e.kind === 'earn').map((e) => localDay(e.ts)));
  let d = parseISO(todayISO());
  if (!days.has(toISO(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(toISO(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function computeStats(data: AppData, userId: string): Stats {
  const mine = data.points.filter((e) => e.userId === userId);
  const earned = mine.filter((e) => e.kind === 'earn');
  const perRoom = new Map<string, number>();
  for (const e of earned) if (e.roomId) perRoom.set(e.roomId, (perRoom.get(e.roomId) ?? 0) + 1);
  const today = todayISO();
  return {
    tasks: earned.length,
    points: mine.filter((e) => e.points > 0).reduce((s, e) => s + e.points, 0),
    streak: longestStreak(earned.map((e) => localDay(e.ts))),
    early: earned.filter((e) => new Date(e.ts).getHours() < 9).length,
    late: earned.filter((e) => new Date(e.ts).getHours() >= 22).length,
    afval: earned.filter((e) => e.tag === 'afval').length,
    specialist: Math.max(0, ...perRoom.values()),
    cooked: data.meals.filter((m) => m.cookId === userId && m.date <= today).length,
    redeemed: mine.filter((e) => e.kind === 'spend').length,
  };
}

/** Nieuw behaalde badges (nooit ingetrokken zodra behaald). Deterministisch id: `${userId}|${badgeId}`. */
export function newBadges(data: AppData): EarnedBadge[] {
  const have = new Set(data.badges.map((b) => b.id));
  const out: EarnedBadge[] = [];
  for (const u of data.users) {
    const stats = computeStats(data, u.id);
    for (const b of BADGES) {
      const id = `${u.id}|${b.id}`;
      if (!have.has(id) && stats[b.metric] >= b.target) {
        out.push({ id, userId: u.id, badgeId: b.id, earnedAt: Date.now() });
      }
    }
  }
  return out;
}
