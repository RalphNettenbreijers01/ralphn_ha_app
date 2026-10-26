import { useState } from 'react';
import { AlertTriangle, CalendarClock, Cart, CheckCircle2, Check, Meal, Note, Plus, Sun, Trophy } from '../components/icons';
import StickyNote from '../components/StickyNote';
import { useStore } from '../store/AppContext';
import TaskRow from '../components/TaskRow';
import TaskModal from '../components/TaskModal';
import Avatar from '../components/Avatar';
import { addDays, formatLong, toISO, todayISO } from '../lib/dates';
import type { TaskInstance } from '../types';
import { expandAll } from '../lib/recurrence';
import { balanceOf, totalEarned } from '../lib/points';
import type { AppData } from '../types';

const byTime = (a: TaskInstance, b: TaskInstance) => (a.time || '99:99').localeCompare(b.time || '99:99');

export default function Dashboard() {
  const store = useStore();
  const { tasks, users, notes, shopping, toggleShoppingItem, meals } = store;
  const mealToday = meals.find((m) => m.date === todayISO());
  const mealTomorrow = meals.find((m) => m.date === toISO(addDays(new Date(), 1)));
  const cookToday = users.find((u) => u.id === mealToday?.cookId);
  const board = users
    .map((u) => ({ u, earned: totalEarned(store as unknown as AppData, u.id), balance: balanceOf(store as unknown as AppData, u.id) }))
    .sort((a, b) => b.earned - a.earned)
    .slice(0, 3);
  const toBuy = shopping.filter((i) => !i.done);
  const pinned = notes.filter((n) => n.pinned).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const [editing, setEditing] = useState<Partial<TaskInstance> | null>(null);

  const today = todayISO();
  const todays = expandAll(tasks, today, today).sort(byTime);
  const todayDone = todays.filter((t) => t.status === 'done').length;
  // terugkerende taken tellen maximaal 7 dagen terug mee als achterstallig
  const overdue = expandAll(tasks, toISO(addDays(new Date(), -7)), toISO(addDays(new Date(), -1)), true)
    .filter((t) => t.date < today && t.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date));
  const weekEnd = toISO(addDays(new Date(), 7));
  const upcoming = expandAll(tasks, toISO(addDays(new Date(), 1)), weekEnd)
    .filter((t) => t.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const pct = todays.length ? Math.round((todayDone / todays.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm capitalize text-muted">{formatLong(new Date())}</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ date: today })}>
          <Plus size={16} /> Nieuwe taak
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vandaag-widget */}
        <section className="card self-start lg:col-span-2">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Sun size={20} className="text-warn" /> Vandaag</h2>
              <span className="text-sm text-muted">{todayDone} van {todays.length} voltooid</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-fg/10">
              <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div>
            {todays.length === 0 ? (
              <div className="py-8 text-center text-muted">
                <CheckCircle2 className="mx-auto mb-2 text-ok" size={32} />
                Geen taken voor vandaag. Geniet van de rust! 🎉
              </div>
            ) : (
              <ul className="space-y-2">
                {todays.map((t) => (
                  <TaskRow key={`${t.id}-${t.date}`} task={t} onEdit={setEditing} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Huisgenoten</h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted">Voeg gebruikers toe onder “Gebruikers”.</p>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => {
                  const open = todays.filter((t) => t.userId === u.id && t.status !== 'done').length;
                  return (
                    <li key={u.id} className="flex items-center gap-3">
                      <Avatar user={u} size={32} />
                      <span className="flex-1 text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-muted">{open} open vandaag</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {overdue.length > 0 && (
            <section className="card border-danger/40">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-danger">
                <AlertTriangle size={16} /> Achterstallig ({overdue.length})
              </h2>
              <ul className="space-y-2">
                {overdue.slice(0, 5).map((t) => (
                  <TaskRow key={`${t.id}-${t.date}`} task={t} onEdit={setEditing} showDate />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Meal size={16} /> Avondeten
            </h2>
            <a href="#/maaltijden" className="text-sm text-primary hover:underline">Weekmenu</a>
          </div>
          {mealToday ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold leading-tight">{mealToday.title}</p>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Avatar user={cookToday} size={20} /> {cookToday ? `${cookToday.name} kookt` : 'Nog geen kok'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Vandaag nog niets gepland.</p>
          )}
          {mealTomorrow && <p className="mt-3 text-xs text-muted">Morgen: {mealTomorrow.title}</p>}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Trophy size={16} /> Scorebord
            </h2>
            <a href="#/punten" className="text-sm text-primary hover:underline">Punten & badges</a>
          </div>
          {board.length === 0 ? (
            <p className="text-sm text-muted">Voeg gebruikers toe om punten te verdienen.</p>
          ) : (
            <ol className="space-y-2">
              {board.map(({ u, balance, earned }, i) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm">{['🥇', '🥈', '🥉'][i]}</span>
                  <Avatar user={u} size={28} />
                  <span className="flex-1 truncate text-sm font-medium">{u.name}</span>
                  <span className="text-sm font-semibold" title={`${earned} verdiend in totaal`}>{balance}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Cart size={16} /> Boodschappen ({toBuy.length})
            </h2>
            <a href="#/boodschappen" className="text-sm text-primary hover:underline">Alles bekijken</a>
          </div>
          {toBuy.length === 0 ? (
            <p className="text-sm text-muted">Niets op de lijst.</p>
          ) : (
            <ul className="space-y-1">
              {toBuy.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleShoppingItem(i.id)}
                    aria-label={`${i.name} afvinken`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted text-transparent hover:border-ok hover:text-ok"
                  >
                    <Check size={14} />
                  </button>
                  <span className="truncate">{i.name}{i.quantity && <span className="ml-2 text-sm text-muted">{i.quantity}</span>}</span>
                </li>
              ))}
              {toBuy.length > 6 && <li className="text-sm text-muted">+{toBuy.length - 6} meer…</li>}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Note size={16} /> Prikbord
            </h2>
            <a href="#/notities" className="text-sm text-primary hover:underline">Alle notities</a>
          </div>
          {pinned.length === 0 ? (
            <p className="text-sm text-muted">Pin een notitie vast om hem hier te tonen.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1">
              {pinned.map((n) => (
                <StickyNote key={n.id} note={n} compact />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
          <CalendarClock size={16} /> Komende 7 dagen
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Niets gepland in de komende week.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {upcoming.map((t) => (
              <TaskRow key={`${t.id}-${t.date}`} task={t} onEdit={setEditing} showDate />
            ))}
          </ul>
        )}
      </section>

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
