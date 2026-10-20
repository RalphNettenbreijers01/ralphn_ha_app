import { useState } from 'react';
import { Plus, Search } from '../components/icons';
import { useStore } from '../store/AppContext';
import FilterBar, { applyFilters, type Filters } from '../components/FilterBar';
import TaskRow from '../components/TaskRow';
import TaskModal from '../components/TaskModal';
import { STATUS_LABELS, type TaskInstance, type TaskStatus } from '../types';
import { expandAll } from '../lib/recurrence';
import { addDays, toISO, todayISO } from '../lib/dates';

export default function TasksPage() {
  const { tasks } = useStore();
  const [filters, setFilters] = useState<Filters>({ userId: '', roomId: '' });
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<TaskInstance> | null>(null);

  // losse taken: allemaal; terugkerende taken: 30 dagen terug tot 90 dagen vooruit
  const list = expandAll(applyFilters(tasks, filters), toISO(addDays(new Date(), -30)), toISO(addDays(new Date(), 90)), true)
    .filter((t) => !status || t.status === status)
    .filter((t) => !q || (t.title + ' ' + t.description).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99'));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Taken</h1>
        <button className="btn-primary" onClick={() => setEditing({ date: todayISO() })}>
          <Plus size={16} /> Nieuwe taak
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !w-56 !pl-9" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <FilterBar value={filters} onChange={setFilters} />
        <select aria-label="Filter op status" className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | '')}>
          <option value="">Alle statussen</option>
          {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="card py-12 text-center text-muted">Geen taken gevonden.</div>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <TaskRow key={`${t.id}-${t.date}`} task={t} onEdit={setEditing} showDate />
          ))}
        </ul>
      )}

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
