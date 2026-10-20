import { useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Sun } from 'lucide-react';
import { useStore } from '../store/AppContext';
import TaskRow from '../components/TaskRow';
import TaskModal from '../components/TaskModal';
import Avatar from '../components/Avatar';
import { addDays, formatLong, toISO, todayISO } from '../lib/dates';
import type { Task } from '../types';

const byTime = (a: Task, b: Task) => (a.time || '99:99').localeCompare(b.time || '99:99');

export default function Dashboard() {
  const { tasks, users } = useStore();
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  const today = todayISO();
  const todays = tasks.filter((t) => t.date === today).sort(byTime);
  const todayDone = todays.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter((t) => t.date < today && t.status !== 'done').sort((a, b) => a.date.localeCompare(b.date));
  const weekEnd = toISO(addDays(new Date(), 7));
  const upcoming = tasks
    .filter((t) => t.date > today && t.date <= weekEnd && t.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const pct = todays.length ? Math.round((todayDone / todays.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm capitalize text-slate-500">{formatLong(new Date())}</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ date: today })}>
          <Plus size={16} /> Nieuwe taak
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vandaag-widget */}
        <section className="card lg:col-span-2 !bg-gradient-to-br from-indigo-600 to-violet-600 !p-0 text-white !ring-0">
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Sun size={20} /> Vandaag</h2>
              <span className="text-sm text-indigo-100">{todayDone} van {todays.length} voltooid</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 text-slate-800">
            {todays.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={32} />
                Geen taken voor vandaag. Geniet van de rust! 🎉
              </div>
            ) : (
              <ul className="space-y-2">
                {todays.map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={setEditing} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Huisgenoten</h2>
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">Voeg gebruikers toe onder “Gebruikers”.</p>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => {
                  const open = todays.filter((t) => t.userId === u.id && t.status !== 'done').length;
                  return (
                    <li key={u.id} className="flex items-center gap-3">
                      <Avatar user={u} size={32} />
                      <span className="flex-1 text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-slate-500">{open} open vandaag</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {overdue.length > 0 && (
            <section className="card ring-red-200">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-600">
                <AlertTriangle size={16} /> Achterstallig ({overdue.length})
              </h2>
              <ul className="space-y-2">
                {overdue.slice(0, 5).map((t) => (
                  <TaskRow key={t.id} task={t} onEdit={setEditing} showDate />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <CalendarClock size={16} /> Komende 7 dagen
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Niets gepland in de komende week.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {upcoming.map((t) => (
              <TaskRow key={t.id} task={t} onEdit={setEditing} showDate />
            ))}
          </ul>
        )}
      </section>

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
