import { useState, type FormEvent } from 'react';
import { Trash2 } from './icons';
import Modal from './Modal';
import { useStore } from '../store/AppContext';
import { STATUS_LABELS, type Repeat, type RepeatUnit, type TaskInstance, type TaskStatus } from '../types';
import { UNIT_LABELS } from '../lib/recurrence';
import { todayISO } from '../lib/dates';

interface Props {
  /** Existing task (has id) or defaults for a new one. */
  task?: Partial<TaskInstance> | null;
  onClose: () => void;
}

const PRESETS: Record<string, Repeat | null> = {
  none: null,
  day1: { unit: 'day', interval: 1 },
  week1: { unit: 'week', interval: 1 },
  week2: { unit: 'week', interval: 2 },
  week4: { unit: 'week', interval: 4 },
  month1: { unit: 'month', interval: 1 },
  year1: { unit: 'year', interval: 1 },
};
const PRESET_LABELS: Record<string, string> = {
  none: 'Niet herhalen',
  day1: 'Dagelijks',
  week1: 'Wekelijks',
  week2: 'Om de 2 weken',
  week4: 'Elke 4 weken',
  month1: 'Maandelijks',
  year1: 'Jaarlijks',
  custom: 'Aangepast…',
};

const presetOf = (r?: Repeat) => {
  if (!r) return 'none';
  const hit = Object.entries(PRESETS).find(([, p]) => p && p.unit === r.unit && p.interval === r.interval);
  return hit ? hit[0] : 'custom';
};

export default function TaskModal({ task, onClose }: Props) {
  const { users, rooms, tasks, saveTask, deleteTask, skipOccurrence } = useStore();
  const isEdit = !!task?.id;
  // bij een voorkomen van een terugkerende taak bewerk je de hele reeks: vul het formulier met de basistaak
  const base = task?.id ? tasks.find((t) => t.id === task.id) : undefined;
  const src = base ?? task;
  const [form, setForm] = useState({
    title: src?.title ?? '',
    description: src?.description ?? '',
    userId: src?.userId ?? '',
    roomId: src?.roomId ?? '',
    date: src?.date ?? todayISO(),
    time: src?.time ?? '',
    status: (task?.status ?? 'open') as TaskStatus,
    preset: presetOf(src?.repeat),
    interval: src?.repeat?.interval ?? 1,
    unit: (src?.repeat?.unit ?? 'week') as RepeatUnit,
    until: src?.repeat?.until ?? '',
  });
  const repeat: Repeat | null =
    form.preset === 'custom'
      ? { unit: form.unit, interval: Math.max(1, Math.floor(form.interval) || 1) }
      : PRESETS[form.preset];
  const occurrence = task?.occurrence ?? form.date;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    const occStatus = { ...base?.occStatus };
    if (repeat) {
      if (form.status === 'open') delete occStatus[occurrence];
      else occStatus[occurrence] = form.status;
    }
    saveTask({
      id: task?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      userId: form.userId || null,
      roomId: form.roomId || null,
      date: form.date,
      time: form.time,
      status: repeat ? 'open' : form.status,
      repeat: repeat ? { ...repeat, ...(form.until ? { until: form.until } : {}) } : undefined,
      occStatus: repeat ? occStatus : undefined,
    });
    onClose();
  };

  const remove = () => {
    if (task?.id && confirm(base?.repeat ? 'Deze taak en alle herhalingen verwijderen?' : 'Deze taak verwijderen?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  const skip = () => {
    if (task?.id && task.occurrence) {
      skipOccurrence(task.id, task.occurrence);
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
            <label className="label" htmlFor="t-date">{repeat ? 'Startdatum' : 'Datum'}</label>
            <input id="t-date" type="date" required className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="t-time">Tijd (optioneel)</label>
            <input id="t-time" type="time" className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="t-repeat">Herhalen</label>
          <select id="t-repeat" className="input" value={form.preset} onChange={(e) => set('preset', e.target.value)}>
            {Object.entries(PRESET_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          {form.preset === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Elke</span>
              <input type="number" min={1} max={365} className="input !w-20" aria-label="Aantal" value={form.interval} onChange={(e) => set('interval', Number(e.target.value))} />
              <select className="input !w-auto" aria-label="Eenheid" value={form.unit} onChange={(e) => set('unit', e.target.value as RepeatUnit)}>
                {(Object.keys(UNIT_LABELS) as RepeatUnit[]).map((u) => (
                  <option key={u} value={u}>{UNIT_LABELS[u][1]}</option>
                ))}
              </select>
            </div>
          )}
          {repeat && (
            <div>
              <label className="label" htmlFor="t-until">Herhalen tot (optioneel)</label>
              <input id="t-until" type="date" min={form.date} className="input" value={form.until} onChange={(e) => set('until', e.target.value)} />
              <p className="mt-1 text-xs text-muted">Wijzigingen gelden voor de hele reeks, vanaf de startdatum. Status geldt alleen voor {task?.occurrence ? 'dit voorkomen' : 'de eerste keer'}.</p>
            </div>
          )}
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
            <div className="flex flex-wrap gap-1">
              <button type="button" className="btn-ghost text-danger hover:!bg-danger/10" onClick={remove}>
                <Trash2 size={16} /> {base?.repeat ? 'Reeks verwijderen' : 'Verwijderen'}
              </button>
              {base?.repeat && task?.occurrence && (
                <button type="button" className="btn-ghost" onClick={skip}>Deze keer overslaan</button>
              )}
            </div>
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
