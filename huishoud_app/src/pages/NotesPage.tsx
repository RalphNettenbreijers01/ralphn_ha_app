import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Modal from '../components/Modal';
import StickyNote from '../components/StickyNote';
import { NOTE_COLORS } from '../lib/storage';
import type { Note } from '../types';

function NoteModal({ note, onClose }: { note: Partial<Note>; onClose: () => void }) {
  const { users, saveNote, deleteNote } = useStore();
  const [text, setText] = useState(note.text ?? '');
  const [color, setColor] = useState(note.color ?? 'yellow');
  const [userId, setUserId] = useState(note.userId ?? '');
  const [pinned, setPinned] = useState(note.pinned ?? false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    saveNote({ id: note.id, text: text.trim(), color, userId: userId || null, pinned, createdAt: note.createdAt ?? Date.now() });
    onClose();
  };

  return (
    <Modal title={note.id ? 'Notitie bewerken' : 'Nieuwe notitie'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <textarea
          className="min-h-[140px] w-full rounded-sm p-3 text-base shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40"
          style={{ backgroundColor: NOTE_COLORS[color], color: '#333' }}
          autoFocus
          required
          aria-label="Tekst"
          placeholder="Schrijf je notitie…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div>
          <span className="label">Kleur</span>
          <div className="flex gap-2">
            {Object.entries(NOTE_COLORS).map(([key, hex]) => (
              <button
                type="button"
                key={key}
                onClick={() => setColor(key)}
                aria-label={`Kleur ${key}`}
                className={`h-8 w-8 rounded-sm ring-offset-2 ring-offset-card ${color === key ? 'ring-2 ring-fg' : ''}`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label className="label" htmlFor="n-user">Van</label>
            <select id="n-user" className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">— Niemand —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Vastpinnen op dashboard
          </label>
        </div>
        <div className="flex items-center justify-between pt-2">
          {note.id ? (
            <button
              type="button"
              className="btn-ghost text-danger hover:!bg-danger/10"
              onClick={() => {
                if (confirm('Deze notitie verwijderen?')) {
                  deleteNote(note.id!);
                  onClose();
                }
              }}
            >
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

export default function NotesPage() {
  const { notes } = useStore();
  const [editing, setEditing] = useState<Partial<Note> | null>(null);
  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notities</h1>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Nieuwe notitie
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="card py-12 text-center text-muted">Nog geen notities. Plak de eerste post-it op het prikbord!</div>
      ) : (
        <div className="columns-2 gap-4 p-2 md:columns-3 lg:columns-4">
          {sorted.map((n) => (
            <StickyNote key={n.id} note={n} onEdit={setEditing} />
          ))}
        </div>
      )}

      {editing && <NoteModal note={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
