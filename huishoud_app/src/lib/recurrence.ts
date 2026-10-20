import type { Repeat, Task, TaskInstance } from '../types';
import { addDays, parseISO, toISO } from './dates';

// LET OP: dezelfde logica staat in server.js (expandAll) voor sensoren en meldingen.

const MS_DAY = 86_400_000;
const MAX_ITER = 3000;

/** Datum van voorkomen k, altijd berekend vanaf de startdatum (geen drift bij maandeinden). */
function nth(base: Date, r: Repeat, k: number): Date {
  const n = k * r.interval;
  switch (r.unit) {
    case 'day':
      return addDays(base, n);
    case 'week':
      return addDays(base, n * 7);
    case 'month':
    case 'year': {
      const months = r.unit === 'year' ? n * 12 : n;
      const y = base.getFullYear();
      const m = base.getMonth() + months;
      const lastDay = new Date(y, m + 1, 0).getDate();
      return new Date(y, m, Math.min(base.getDate(), lastDay)); // 31 jan + 1 maand = 28/29 feb
    }
  }
}

function expandTask(task: Task, from: string, to: string): TaskInstance[] {
  const r = task.repeat;
  if (!r) return task.date >= from && task.date <= to ? [task] : [];

  const interval = Math.max(1, Math.floor(r.interval) || 1);
  const rule: Repeat = { ...r, interval };
  const base = parseISO(task.date);
  let k = 0;
  if (rule.unit === 'day' || rule.unit === 'week') {
    const step = interval * (rule.unit === 'week' ? 7 : 1);
    const diffDays = Math.round((parseISO(from).getTime() - base.getTime()) / MS_DAY);
    k = Math.max(0, Math.ceil(diffDays / step));
  }

  const out: TaskInstance[] = [];
  for (let i = 0; i < MAX_ITER; i++, k++) {
    const d = toISO(nth(base, rule, k));
    if (d > to || (rule.until && d > rule.until)) break;
    if (d < from || task.skipped?.includes(d)) continue;
    out.push({ ...task, date: d, occurrence: d, status: task.occStatus?.[d] ?? 'open' });
  }
  return out;
}

/**
 * Alle taken (incl. voorkomens van terugkerende taken) tussen `from` en `to` (inclusief).
 * Met `allOneOff` worden losse taken buiten het bereik ook meegenomen (bijv. voor de takenlijst).
 */
export function expandAll(tasks: Task[], from: string, to: string, allOneOff = false): TaskInstance[] {
  return tasks.flatMap((t) => (!t.repeat && allOneOff ? [t] : expandTask(t, from, to)));
}

export const UNIT_LABELS: Record<Repeat['unit'], [string, string]> = {
  day: ['dag', 'dagen'],
  week: ['week', 'weken'],
  month: ['maand', 'maanden'],
  year: ['jaar', 'jaar'],
};

export function describeRepeat(r: Repeat): string {
  const [one, many] = UNIT_LABELS[r.unit];
  if (r.interval === 1) {
    return { day: 'Dagelijks', week: 'Wekelijks', month: 'Maandelijks', year: 'Jaarlijks' }[r.unit];
  }
  return `Elke ${r.interval} ${r.interval === 1 ? one : many}`;
}
