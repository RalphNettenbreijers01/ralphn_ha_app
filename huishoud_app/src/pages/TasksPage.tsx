import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useStore } from '../store/AppContext';
import FilterBar, { applyFilters, type Filters } from '../components/FilterBar';
import TaskRow from '../components/TaskRow';
import TaskModal from '../components/TaskModal';
import { STATUS_LABELS, type Task, type TaskStatus } from '../types';
import { todayISO } from '../lib/dates';

export default function TasksPage() {
  const { tasks } = useStore();
  const [filters, setFilters] = useState<Filters>({ userId: '', roomId: '' });
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  const list = applyFilters(tasks, filters)
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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
        <div className="card py-12 text-center text-slate-500">Geen taken gevonden.</div>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} onEdit={setEditing} showDate />
          ))}
        </ul>
      )}

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
