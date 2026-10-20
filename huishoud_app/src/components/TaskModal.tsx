import { useState, type FormEvent } from 'react';
import { Trash2 } from './icons';
import Modal from './Modal';
import { useStore } from '../store/AppContext';
import { STATUS_LABELS, type Task, type TaskStatus } from '../types';
import { todayISO } from '../lib/dates';

interface Props {
  /** Existing task (has id) or defaults for a new one. */
  task?: Partial<Task> | null;
  onClose: () => void;
}

export default function TaskModal({ task, onClose }: Props) {
  const { users, rooms, saveTask, deleteTask } = useStore();
  const isEdit = !!task?.id;
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    userId: task?.userId ?? '',
    roomId: task?.roomId ?? '',
    date: task?.date ?? todayISO(),
    time: task?.time ?? '',
    status: (task?.status ?? 'open') as TaskStatus,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    saveTask({
      id: task?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      userId: form.userId || null,
      roomId: form.roomId || null,
      date: form.date,
      time: form.time,
      status: form.status,
    });
    onClose();
  };

  const remove = () => {
    if (task?.id && confirm('Deze taak verwijderen?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal title={isEdit ? 'Taak bewerken' : 'Nieuwe taak'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="t-title">Titel</label>
          <input id="t-title" className="input" autoFocus required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Bijv. Afwasmachine uitruimen" />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">Omschrijving</label>
          <textarea id="t-desc" className="input min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Details, tips of een checklist…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-user">Gebruiker</label>
            <select id="t-user" className="input" value={form.userId} onChange={(e) => set('userId', e.target.value)}>
              <option value="">— Niemand —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-room">Ruimte</label>
            <select id="t-room" className="input" value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
              <option value="">— Geen —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-date">Datum</label>
            <input id="t-date" type="date" required className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="t-time">Tijd (optioneel)</label>
            <input id="t-time" type="time" className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">Status</span>
          <div className="flex gap-2">
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => set('status', s)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ring-1 transition sm:text-sm ${
                  form.status === s ? 'bg-primary text-white ring-primary' : 'bg-card text-muted ring-line hover:bg-fg/5'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <button type="button" className="btn-ghost text-danger hover:!bg-danger/10" onClick={remove}>
              <Trash2 size={16} /> Verwijderen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn-primary">Opslaan</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
