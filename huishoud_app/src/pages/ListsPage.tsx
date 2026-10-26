import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Modal from '../components/Modal';
import { LIST_ICONS, LIST_TEMPLATES } from '../lib/storage';
import type { List } from '../types';

function ListModal({ list, onClose, onDeleted }: { list: Partial<List>; onClose: () => void; onDeleted: () => void }) {
  const { saveList, deleteList, listItems } = useStore();
  const [name, setName] = useState(list.name ?? '');
  const [icon, setIcon] = useState(list.icon ?? LIST_ICONS[0]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveList({ id: list.id, name: name.trim(), icon });
    onClose();
  };

  return (
    <Modal title={list.id ? 'Lijst bewerken' : 'Nieuwe lijst'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="l-name">Naam</label>
          <input id="l-name" className="input" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Inpaklijst zomervakantie" />
        </div>
        <div>
          <span className="label">Icoon</span>
          <div className="flex flex-wrap gap-1.5">
            {LIST_ICONS.map((i) => (
              <button type="button" key={i} onClick={() => setIcon(i)} className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ring-1 ${icon === i ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          {list.id ? (
            <button
              type="button"
              className="btn-ghost text-danger hover:!bg-danger/10"
              onClick={() => {
                const n = listItems.filter((i) => i.listId === list.id).length;
                if (confirm(`Lijst “${list.name}” verwijderen${n ? ` met ${n} items` : ''}?`)) {
                  deleteList(list.id!);
                  onDeleted();
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

export default function ListsPage() {
  const { lists, listItems, saveList, saveListItem, toggleListItem, deleteListItem, clearDoneListItems } = useStore();
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState<Partial<List> | null>(null);
  const [text, setText] = useState('');

  // houd een geldige lijst geselecteerd (ook als die op een ander apparaat is verwijderd)
  useEffect(() => {
    if (!lists.some((l) => l.id === selected)) setSelected(lists[0]?.id ?? '');
  }, [lists, selected]);

  const current = lists.find((l) => l.id === selected);
  const items = listItems.filter((i) => i.listId === selected).sort((a, b) => a.createdAt - b.createdAt);
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !current) return;
    saveListItem({ listId: current.id, text: text.trim(), done: false, createdAt: Date.now() });
    setText('');
  };

  const row = (i: (typeof items)[number]) => (
    <li key={i.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 hover:bg-fg/5">
      <button
        onClick={() => toggleListItem(i.id)}
        aria-label={i.done ? 'Terugzetten' : 'Afvinken'}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${i.done ? 'border-ok bg-ok text-white' : 'border-muted text-transparent hover:border-ok hover:text-ok'}`}
      >
        <Check size={14} />
      </button>
      <span className={`min-w-0 flex-1 break-words ${i.done ? 'text-muted line-through' : ''}`}>{i.text}</span>
      <button className="btn-ghost !p-1.5 text-danger hover:!bg-danger/10" onClick={() => deleteListItem(i.id)} aria-label={`${i.text} verwijderen`}>
        <Trash2 size={16} />
      </button>
    </li>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lijsten</h1>
          <p className="text-sm text-muted">Gedeelde lijstjes naast de boodschappen: inpakken, klusjes, cadeau-ideeën…</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Nieuwe lijst
        </button>
      </header>

      {lists.length === 0 ? (
        <div className="card space-y-3 py-8 text-center">
          <p className="text-muted">Nog geen lijsten. Begin met een voorbeeld:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {LIST_TEMPLATES.map((t) => (
              <button key={t.name} className="btn-secondary" onClick={() => saveList(t)}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const n = listItems.filter((i) => i.listId === l.id && !i.done).length;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelected(l.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${selected === l.id ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'}`}
                >
                  <span>{l.icon}</span> {l.name}
                  {n > 0 && <span className="rounded-full bg-fg/10 px-2 text-xs text-muted">{n}</span>}
                </button>
              );
            })}
          </div>

          {current && (
            <section className="card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  {current.icon} {current.name}
                  <span className="ml-2 text-sm font-normal text-muted">{open.length} te doen{done.length ? ` · ${done.length} klaar` : ''}</span>
                </h2>
                <button className="btn-ghost !p-1.5" onClick={() => setEditing(current)} aria-label="Lijst bewerken"><Pencil size={16} /></button>
              </div>

              <form onSubmit={add} className="flex gap-2">
                <input className="input" aria-label="Nieuw item" placeholder="Item toevoegen…" value={text} onChange={(e) => setText(e.target.value)} />
                <button type="submit" className="btn-primary"><Plus size={16} /> Toevoegen</button>
              </form>

              {items.length === 0 && <p className="py-4 text-center text-sm text-muted">Deze lijst is nog leeg.</p>}
              {open.length > 0 && <ul className="space-y-2">{open.map(row)}</ul>}
              {done.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Klaar</h3>
                    <button className="btn-ghost text-danger hover:!bg-danger/10" onClick={() => clearDoneListItems(current.id)}>
                      <Trash2 size={16} /> Klare items verwijderen
                    </button>
                  </div>
                  <ul className="space-y-2">{done.map(row)}</ul>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {editing && <ListModal list={editing} onClose={() => setEditing(null)} onDeleted={() => setSelected('')} />}
    </div>
  );
}
