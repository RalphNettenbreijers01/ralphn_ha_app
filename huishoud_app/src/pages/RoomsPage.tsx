import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Modal from '../components/Modal';
import { ROOM_ICONS } from '../lib/storage';
import type { Room } from '../types';

function RoomModal({ room, onClose }: { room: Partial<Room>; onClose: () => void }) {
  const { saveRoom } = useStore();
  const [name, setName] = useState(room.name ?? '');
  const [icon, setIcon] = useState(room.icon ?? ROOM_ICONS[0]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveRoom({ id: room.id, name: name.trim(), icon });
    onClose();
  };

  return (
    <Modal title={room.id ? 'Ruimte bewerken' : 'Nieuwe ruimte'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="r-name">Naam</label>
          <input id="r-name" className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span className="label">Icoon</span>
          <div className="flex flex-wrap gap-1.5">
            {ROOM_ICONS.map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setIcon(i)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ring-1 ${
                  icon === i ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn-primary">Opslaan</button>
        </div>
      </form>
    </Modal>
  );
}

export default function RoomsPage() {
  const { rooms, tasks, deleteRoom } = useStore();
  const [editing, setEditing] = useState<Partial<Room> | null>(null);

  const remove = (r: Room) => {
    if (confirm(`“${r.name}” verwijderen? Gekoppelde taken blijven bestaan zonder ruimte.`)) deleteRoom(r.id);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ruimtes</h1>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Nieuwe ruimte
        </button>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => {
          const open = tasks.filter((t) => t.roomId === r.id && t.status !== 'done').length;
          return (
            <li key={r.id} className="card flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-fg/10 text-2xl">{r.icon}</span>
              <div className="flex-1">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted">{open} open taken</p>
              </div>
              <button className="btn-ghost !p-1.5" onClick={() => setEditing(r)} aria-label={`${r.name} bewerken`}><Pencil size={16} /></button>
              <button className="btn-ghost !p-1.5 text-danger hover:!bg-danger/10" onClick={() => remove(r)} aria-label={`${r.name} verwijderen`}><Trash2 size={16} /></button>
            </li>
          );
        })}
      </ul>
      {editing && <RoomModal room={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
