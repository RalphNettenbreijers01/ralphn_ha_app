import { useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../store/AppContext';
import Avatar from '../components/Avatar';
import { addDays, parseISO, startOfWeek, toISO, todayISO } from '../lib/dates';
import { expandAll } from '../lib/recurrence';

type Range = 'week' | 'month' | '90' | 'year';
const RANGES: [Range, string][] = [['week', 'Deze week'], ['month', 'Deze maand'], ['90', 'Laatste 90 dagen'], ['year', 'Dit jaar']];

function rangeBounds(r: Range): [string, string] {
  const now = new Date();
  const end = todayISO();
  if (r === 'week') return [toISO(startOfWeek(now)), end];
  if (r === 'month') return [toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end];
  if (r === 'year') return [toISO(new Date(now.getFullYear(), 0, 1)), end];
  return [toISO(addDays(now, -89)), end];
}

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

/** Horizontale balk met label links en waarde rechts; breedte relatief aan `max`. */
function Bar({ label, value, max, color, sub }: { label: ReactNode; value: number; max: number; color: string; sub?: string }) {
  return (
    <li className="flex items-center gap-3" title={`${typeof label === 'string' ? label : ''} ${value}`}>
      <span className="flex w-28 shrink-0 items-center gap-2 truncate text-sm">{label}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-fg/10">
        <span className="block h-full rounded-r-full" style={{ width: `${max ? Math.max((value / max) * 100, value ? 3 : 0) : 0}%`, backgroundColor: color }} />
      </span>
      <span className="w-20 shrink-0 text-right text-sm font-semibold">
        {value}
        {sub && <span className="ml-1 text-xs font-normal text-muted">{sub}</span>}
      </span>
    </li>
  );
}

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const { tasks, users, rooms, points, meals } = useStore();
  const [range, setRange] = useState<Range>('month');
  const [from, to] = rangeBounds(range);
  const today = todayISO();

  const s = useMemo(() => {
    const inRange = expandAll(tasks, from, to);
    const done = inRange.filter((t) => t.status === 'done');
    const overdue = inRange.filter((t) => t.status !== 'done' && t.date < today);
    const due = done.length + overdue.length; // alles wat tot en met vandaag gepland stond

    const perUser = users.map((u) => ({
      u,
      done: done.filter((t) => t.userId === u.id).length,
      pts: points.filter((p) => p.userId === u.id && p.points > 0 && toISO(new Date(p.ts)) >= from && toISO(new Date(p.ts)) <= to).reduce((a, p) => a + p.points, 0),
    }));
    const unassigned = done.filter((t) => !t.userId).length;

    const perRoom = rooms
      .map((r) => ({ r, n: done.filter((t) => t.roomId === r.id).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);

    // laatste 8 weken: afgerond vs. niet afgerond (alleen wat al verstreken is)
    const weekStart = startOfWeek(new Date());
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const ws = addDays(weekStart, (i - 7) * 7);
      const we = addDays(ws, 6);
      const list = expandAll(tasks, toISO(ws), toISO(we < new Date() ? we : new Date()));
      const d = list.filter((t) => t.status === 'done').length;
      // wat vandaag nog open staat, telt pas morgen als gemist
      const missed = list.filter((t) => t.status !== 'done' && t.date < today).length;
      return { label: `${ws.getDate()}/${ws.getMonth() + 1}`, done: d, missed };
    });

    // op welke weekdag worden taken afgerond
    const perDay = Array(7).fill(0);
    for (const p of points) {
      const iso = toISO(new Date(p.ts));
      if (p.kind === 'earn' && iso >= from && iso <= to) perDay[(new Date(p.ts).getDay() + 6) % 7]++;
    }

    const cooked = new Map<string, number>();
    for (const m of meals) if (m.date >= from && m.date <= to) cooked.set(m.title, (cooked.get(m.title) ?? 0) + 1);
    const topMeals = [...cooked.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { done: done.length, overdue: overdue.length, due, rate: due ? Math.round((done.length / due) * 100) : null, perUser, unassigned, perRoom, weeks, perDay, topMeals, ptsTotal: perUser.reduce((a, x) => a + x.pts, 0) };
  }, [tasks, users, rooms, points, meals, from, to, today]);

  const maxUser = Math.max(1, ...s.perUser.map((x) => x.done), s.unassigned);
  const maxRoom = Math.max(1, ...s.perRoom.map((x) => x.n));
  const maxWeek = Math.max(1, ...s.weeks.map((w) => w.done + w.missed));
  const maxDay = Math.max(1, ...s.perDay);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold"><span className="mr-2 inline-block animate-floaty">📊</span>Overzicht</h1>
          <p className="text-sm text-muted">{parseISO(from).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} t/m vandaag</p>
        </div>
        <div className="flex rounded-lg bg-fg/10 p-0.5 text-sm">
          {RANGES.map(([r, label]) => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1.5 font-medium ${range === r ? 'bg-card shadow-sm' : 'text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="✅ Taken afgerond" value={s.done} sub={`van ${s.due} die klaar moesten zijn`} />
        <Kpi label="🎯 Op schema" value={s.rate === null ? '–' : `${s.rate}%`} sub="afgerond binnen de periode" />
        <Kpi label="⏳ Achterstallig" value={<span className={s.overdue ? 'text-danger' : ''}>{s.overdue}</span>} sub="nog niet gedaan" />
        <Kpi label="⭐ Punten verdiend" value={s.ptsTotal} sub="door het hele huishouden" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-label="Taken per persoon">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">🧑‍🤝‍🧑 Afgerond per persoon</h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted">Nog geen gebruikers.</p>
          ) : (
            <ul className="space-y-3">
              {s.perUser.map(({ u, done, pts }) => (
                <Bar key={u.id} label={<><Avatar user={u} size={20} /> {u.name}</>} value={done} max={maxUser} color={u.color} sub={`${pts} pt`} />
              ))}
              {s.unassigned > 0 && <Bar label="Niemand" value={s.unassigned} max={maxUser} color="rgb(var(--c-muted))" />}
            </ul>
          )}
        </section>

        <section className="card" aria-label="Taken per ruimte">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">🏠 Afgerond per ruimte</h2>
          {s.perRoom.length === 0 ? (
            <p className="text-sm text-muted">Geen afgeronde taken met een ruimte in deze periode.</p>
          ) : (
            <ul className="space-y-3">
              {s.perRoom.map(({ r, n }) => (
                <Bar key={r.id} label={`${r.icon} ${r.name}`} value={n} max={maxRoom} color="rgb(var(--c-primary))" />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" aria-label="Verloop per week">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">📈 Laatste 8 weken</h2>
          <span className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ok" /> Afgerond</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-fg/25" /> Niet afgerond</span>
          </span>
        </div>
        <ul className="flex h-44 items-end gap-3">
          {s.weeks.map((w) => (
            <li key={w.label} className="flex h-full flex-1 flex-col justify-end gap-1" title={`Week van ${w.label}: ${w.done} afgerond, ${w.missed} niet afgerond`}>
              <span className="text-center text-xs text-muted">{w.done + w.missed || ''}</span>
              <div className="flex flex-col gap-0.5" style={{ height: `${((w.done + w.missed) / maxWeek) * 85}%` }}>
                <span className="rounded-t-md bg-fg/25" style={{ flexGrow: w.missed }} />
                <span className={`bg-ok ${w.missed ? '' : 'rounded-t-md'}`} style={{ flexGrow: w.done }} />
              </div>
              <span className="text-center text-xs text-muted">{w.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-label="Afgerond per weekdag">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">🗓️ Op welke dag rond je taken af</h2>
          <ul className="flex h-32 items-end gap-3">
            {s.perDay.map((n, i) => (
              <li key={i} className="flex h-full flex-1 flex-col justify-end gap-1" title={`${WEEKDAYS[i]}: ${n}`}>
                <span className="text-center text-xs text-muted">{n || ''}</span>
                <span className="rounded-t-md bg-primary" style={{ height: `${(n / maxDay) * 80}%` }} />
                <span className="text-center text-xs text-muted">{WEEKDAYS[i]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-label="Meest gemaakte gerechten">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">🍽️ Maaltijden in deze periode</h2>
          {s.topMeals.length === 0 ? (
            <p className="text-sm text-muted">Geen maaltijden gepland in deze periode.</p>
          ) : (
            <ul className="space-y-3">
              {s.topMeals.map(([title, n]) => (
                <Bar key={title} label={title} value={n} max={s.topMeals[0][1]} color="rgb(var(--c-primary))" />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
