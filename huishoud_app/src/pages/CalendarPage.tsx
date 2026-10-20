import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from '../components/icons';
import { useStore } from '../store/AppContext';
import FilterBar, { applyFilters, type Filters } from '../components/FilterBar';
import TaskModal from '../components/TaskModal';
import Avatar from '../components/Avatar';
import { WEEKDAYS_SHORT, addDays, formatLong, formatMonth, monthGrid, toISO, todayISO, weekDays } from '../lib/dates';
import type { TaskInstance } from '../types';
import { expandAll } from '../lib/recurrence';

type View = 'month' | 'week';

export default function CalendarPage() {
  const { tasks, users, rooms, moveTask } = useStore();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [filters, setFilters] = useState<Filters>({ userId: '', roomId: '' });
  const [editing, setEditing] = useState<Partial<TaskInstance> | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const today = todayISO();
  const days = useMemo(() => (view === 'month' ? monthGrid(cursor) : weekDays(cursor)), [view, cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, TaskInstance[]>();
    for (const t of expandAll(applyFilters(tasks, filters), toISO(days[0]), toISO(days[days.length - 1]))) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    map.forEach((l) => l.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')));
    return map;
  }, [tasks, filters, days]);

  const shift = (dir: -1 | 1) =>
    setCursor((c) =>
      view === 'month' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * 7),
    );

  const title =
    view === 'month'
      ? formatMonth(cursor)
      : `${formatLong(days[0])} – ${formatLong(days[6])}`;

  const chip = (t: TaskInstance) => {
    const user = users.find((u) => u.id === t.userId);
    const room = rooms.find((r) => r.id === t.roomId);
    const color = user?.color ?? '#94a3b8';
    return (
      <button
        key={`${t.id}-${t.date}`}
        draggable={!t.repeat}
        onDragStart={(e) => e.dataTransfer.setData('text/task-id', t.id)}
        onClick={() => setEditing(t)}
        title={`${t.title}${room ? ' · ' + room.name : ''}${user ? ' · ' + user.name : ''}`}
        className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-xs transition hover:brightness-95 ${
          t.status === 'done' ? 'opacity-50 line-through' : ''
        }`}
        style={{ backgroundColor: color + '26', borderLeft: `3px solid ${color}` }}
      >
        {user && <Avatar user={user} size={16} className="!shadow-none" />}
        <span className="truncate">
          {t.repeat && '↻ '}
          {t.time && <span className="font-semibold">{t.time} </span>}
          {t.title}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <button className="btn-primary" onClick={() => setEditing({ date: today })}>
          <Plus size={16} /> Nieuwe taak
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary !p-2" onClick={() => shift(-1)} aria-label="Vorige"><ChevronLeft size={18} /></button>
          <button className="btn-secondary" onClick={() => setCursor(new Date())}>Vandaag</button>
          <button className="btn-secondary !p-2" onClick={() => shift(1)} aria-label="Volgende"><ChevronRight size={18} /></button>
          <h2 className="ml-2 text-lg font-semibold capitalize">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar value={filters} onChange={setFilters} />
          <div className="flex rounded-lg bg-fg/10 p-0.5 text-sm">
            {(['month', 'week'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 font-medium ${view === v ? 'bg-card shadow-sm' : 'text-muted'}`}
              >
                {v === 'month' ? 'Maand' : 'Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* legenda */}
      {users.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {users.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color }} /> {u.name}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[720px] overflow-hidden rounded-2xl bg-card border border-line">
          <div className="grid grid-cols-7 border-b border-line bg-fg/5 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const iso = toISO(d);
              const list = byDate.get(iso) ?? [];
              const outside = view === 'month' && d.getMonth() !== cursor.getMonth();
              const limit = view === 'month' ? 3 : 99;
              return (
                <div
                  key={iso}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(iso);
                  }}
                  onDragLeave={() => setDragOver((c) => (c === iso ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData('text/task-id');
                    if (id) moveTask(id, iso);
                  }}
                  className={`group border-b border-r border-line p-1.5 ${view === 'month' ? 'min-h-[110px]' : 'min-h-[320px]'} ${
                    outside ? 'bg-fg/5 text-muted' : ''
                  } ${dragOver === iso ? 'bg-primary/10' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        iso === today ? 'bg-primary text-white' : ''
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <button
                      className="rounded p-0.5 text-muted opacity-0 hover:bg-fg/10 hover:text-fg focus:opacity-100 group-hover:opacity-100"
                      onClick={() => setEditing({ date: iso })}
                      aria-label={`Taak toevoegen op ${iso}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, limit).map(chip)}
                    {list.length > limit && (
                      <button
                        className="w-full text-left text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setCursor(d);
                          setView('week');
                        }}
                      >
                        +{list.length - limit} meer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted">Tip: sleep een taak naar een andere dag om te herindelen (niet mogelijk voor terugkerende taken: pas die aan via bewerken).</p>

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
