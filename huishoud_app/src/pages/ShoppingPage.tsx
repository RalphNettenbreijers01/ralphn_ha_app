import { useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Modal from '../components/Modal';
import { SHOPPING_CATEGORIES } from '../lib/storage';
import type { ShoppingItem } from '../types';

function ItemModal({ item, onClose }: { item: ShoppingItem; onClose: () => void }) {
  const { saveShoppingItem } = useStore();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveShoppingItem({ ...item, name: name.trim(), quantity: quantity.trim(), category });
    onClose();
  };

  return (
    <Modal title="Product bewerken" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="s-name">Product</label>
          <input id="s-name" className="input" autoFocus required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="s-qty">Hoeveelheid</label>
            <input id="s-qty" className="input" placeholder="2x, 500 g…" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-cat">Categorie</label>
            <select id="s-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(SHOPPING_CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>{c.icon} {c.label}</option>
              ))}
            </select>
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

function ItemRow({ item, onEdit }: { item: ShoppingItem; onEdit: (i: ShoppingItem) => void }) {
  const { toggleShoppingItem, deleteShoppingItem } = useStore();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 transition hover:bg-fg/5">
      <button
        onClick={() => toggleShoppingItem(item.id)}
        aria-label={item.done ? 'Terugzetten op de lijst' : 'Afvinken'}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          item.done ? 'border-ok bg-ok text-white' : 'border-muted text-transparent hover:border-ok hover:text-ok'
        }`}
      >
        <Check size={14} />
      </button>
      <span className={`min-w-0 flex-1 truncate ${item.done ? 'text-muted line-through' : ''}`}>
        {item.name}
        {item.quantity && <span className="ml-2 text-sm text-muted">{item.quantity}</span>}
      </span>
      <button className="btn-ghost !p-1.5" onClick={() => onEdit(item)} aria-label={`${item.name} bewerken`}>
        <Pencil size={16} />
      </button>
      <button className="btn-ghost !p-1.5 text-danger hover:!bg-danger/10" onClick={() => deleteShoppingItem(item.id)} aria-label={`${item.name} verwijderen`}>
        <Trash2 size={16} />
      </button>
    </li>
  );
}

export default function ShoppingPage() {
  const { shopping, shoppingNames, saveShoppingItem, clearDoneShopping } = useStore();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('other');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    saveShoppingItem({ name: n, quantity: quantity.trim(), category, done: false, createdAt: Date.now() });
    setName('');
    setQuantity('');
  };

  // een eerder gekocht product? Neem dan de categorie van de laatste keer over
  const onNameChange = (v: string) => {
    setName(v);
    const prev = shopping.find((i) => i.name.toLowerCase() === v.trim().toLowerCase());
    if (prev) setCategory(prev.category);
  };

  const open = shopping.filter((i) => !i.done);
  const done = shopping.filter((i) => i.done);
  const groups = Object.entries(SHOPPING_CATEGORIES)
    .map(([key, c]) => ({ key, ...c, items: open.filter((i) => (SHOPPING_CATEGORIES[i.category] ? i.category : 'other') === key) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Boodschappen</h1>
        <p className="text-sm text-muted">{open.length} te halen{done.length ? ` · ${done.length} in het mandje` : ''}</p>
      </header>

      <form onSubmit={add} className="card flex flex-wrap items-center gap-2 !p-3">
        <input
          className="input !w-auto min-w-[160px] flex-1"
          placeholder="Product toevoegen…"
          aria-label="Product"
          list="shopping-names"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <datalist id="shopping-names">
          {shoppingNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <input className="input !w-28" placeholder="Aantal" aria-label="Hoeveelheid" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <select className="input !w-auto" aria-label="Categorie" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(SHOPPING_CATEGORIES).map(([k, c]) => (
            <option key={k} value={k}>{c.icon} {c.label}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          <Plus size={16} /> Toevoegen
        </button>
      </form>

      {shopping.length === 0 && <div className="card py-12 text-center text-muted">De lijst is leeg. Wat hebben jullie nodig? 🛒</div>}

      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{g.icon} {g.label}</h2>
          <ul className="space-y-2">
            {g.items.map((i) => (
              <ItemRow key={i.id} item={i} onEdit={setEditing} />
            ))}
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">In het mandje</h2>
            <button className="btn-ghost text-danger hover:!bg-danger/10" onClick={clearDoneShopping}>
              <Trash2 size={16} /> Voltooide verwijderen
            </button>
          </div>
          <ul className="space-y-2">
            {done.map((i) => (
              <ItemRow key={i.id} item={i} onEdit={setEditing} />
            ))}
          </ul>
        </section>
      )}

      {editing && <ItemModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
