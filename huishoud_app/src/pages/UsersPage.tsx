import { useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Pencil, Plus, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Avatar, { isImageAvatar } from '../components/Avatar';
import Modal from '../components/Modal';
import { EMOJI_AVATARS, USER_COLORS, imageToAvatar } from '../lib/storage';
import type { User } from '../types';

function UserModal({ user, onClose }: { user: Partial<User> | null; onClose: () => void }) {
  const { saveUser, users } = useStore();
  const [name, setName] = useState(user?.name ?? '');
  const [role, setRole] = useState(user?.role ?? '');
  const [color, setColor] = useState(user?.color ?? USER_COLORS[users.length % USER_COLORS.length]);
  const [avatar, setAvatar] = useState(user?.avatar ?? EMOJI_AVATARS[0]);
  const [notifyService, setNotifyService] = useState(user?.notifyService ?? '');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      setAvatar(await imageToAvatar(f));
      setError('');
    } catch {
      setError('Deze afbeelding kon niet worden gelezen.');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveUser({ id: user?.id, name: name.trim(), role: role.trim(), color, avatar, notifyService: notifyService.trim().replace(/^notify\./, '') });
    onClose();
  };

  return (
    <Modal title={user?.id ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar user={{ name, color, avatar }} size={64} />
          <div className="flex-1 space-y-3">
            <div>
              <label className="label" htmlFor="u-name">Naam</label>
              <input id="u-name" className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="u-role">Rol (optioneel)</label>
          <input id="u-role" className="input" placeholder="Bijv. Ouder, Kind, Huisgenoot" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="u-notify">Meldingsservice Home Assistant (optioneel)</label>
          <input id="u-notify" className="input" placeholder="mobile_app_jouw_telefoon" value={notifyService} onChange={(e) => setNotifyService(e.target.value)} />
          <p className="mt-1 text-xs text-muted">Voor de dagelijkse taakherinnering. Zie Instellingen → Apparaten → Mobiele app voor de naam.</p>
        </div>
        <div>
          <span className="label">Kleur</span>
          <div className="flex flex-wrap items-center gap-2">
            {USER_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Kleur ${c}`}
                className={`h-8 w-8 rounded-full ring-offset-2 transition ${color === c ? 'ring-2 ring-fg' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="Eigen kleur" />
          </div>
        </div>
        <div>
          <span className="label">Avatar</span>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_AVATARS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setAvatar(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ring-1 transition ${
                  avatar === e ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'
                }`}
              >
                {e}
              </button>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm ring-1 ${
                isImageAvatar(avatar) ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'
              }`}
            >
              <ImagePlus size={16} /> Upload
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn-primary">Opslaan</button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { users, tasks, deleteUser } = useStore();
  const [editing, setEditing] = useState<Partial<User> | null>(null);

  const remove = (u: User) => {
    const n = tasks.filter((t) => t.userId === u.id).length;
    const extra = n ? `\n${n} taak/taken worden niet meer toegewezen.` : '';
    if (confirm(`“${u.name}” verwijderen?${extra}`)) deleteUser(u.id);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Gebruikers</h1>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Nieuwe gebruiker
        </button>
      </header>

      {users.length === 0 ? (
        <div className="card py-12 text-center text-muted">
          Nog geen gebruikers. Voeg de eerste huisgenoot toe om taken toe te wijzen.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const mine = tasks.filter((t) => t.userId === u.id);
            const open = mine.filter((t) => t.status !== 'done').length;
            return (
              <li key={u.id} className="card flex items-center gap-4" style={{ borderTop: `4px solid ${u.color}` }}>
                <Avatar user={u} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="truncate text-sm text-muted">{u.role || 'Geen rol'}</p>
                  <p className="mt-1 text-xs text-muted">{open} open · {mine.length} totaal</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="btn-ghost !p-1.5" onClick={() => setEditing(u)} aria-label={`${u.name} bewerken`}><Pencil size={16} /></button>
                  <button className="btn-ghost !p-1.5 text-danger hover:!bg-danger/10" onClick={() => remove(u)} aria-label={`${u.name} verwijderen`}><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <UserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
