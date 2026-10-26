import { useMemo, useState, type FormEvent } from 'react';
import { Cart, ChevronLeft, ChevronRight, Plus, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import { SHOPPING_CATEGORIES } from '../lib/storage';
import { addDays, toISO, todayISO, weekDays } from '../lib/dates';
import type { Ingredient, Meal } from '../types';

const short = (d: Date) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
const WEEKDAY = (d: Date) => d.toLocaleDateString('nl-NL', { weekday: 'long' });

function MealModal({ meal, onClose }: { meal: Partial<Meal>; onClose: () => void }) {
  const { users, meals, saveMeal, deleteMeal, addToShopping, toast } = useStore();
  const [title, setTitle] = useState(meal.title ?? '');
  const [date, setDate] = useState(meal.date ?? todayISO());
  const [cookId, setCookId] = useState(meal.cookId ?? '');
  const [notes, setNotes] = useState(meal.notes ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(meal.ingredients ?? []);

  // eerder gebruikte gerechten als suggestie
  const previous = useMemo(() => {
    const map = new Map<string, Meal>();
    for (const m of [...meals].sort((a, b) => a.date.localeCompare(b.date))) map.set(m.title.trim().toLowerCase(), m);
    return map;
  }, [meals]);

  const onTitle = (v: string) => {
    setTitle(v);
    const prev = previous.get(v.trim().toLowerCase());
    // bekend gerecht en nog geen ingrediënten ingevuld: neem ze over
    if (prev && ingredients.length === 0 && prev.id !== meal.id) {
      setIngredients(prev.ingredients.map((i) => ({ ...i })));
      if (!cookId && prev.cookId) setCookId(prev.cookId);
    }
  };

  const setIng = (i: number, patch: Partial<Ingredient>) =>
    setIngredients((list) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const clean = () => ingredients.map((i) => ({ ...i, name: i.name.trim(), quantity: i.quantity.trim() })).filter((i) => i.name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveMeal({ id: meal.id, title: title.trim(), date, cookId: cookId || null, notes: notes.trim(), ingredients: clean() });
    onClose();
  };

  const toList = () => {
    const n = addToShopping(clean());
    toast(n ? `${n} product${n === 1 ? '' : 'en'} op de boodschappenlijst gezet` : 'Alles staat al op de boodschappenlijst');
  };

  return (
    <Modal title={meal.id ? 'Maaltijd bewerken' : 'Maaltijd plannen'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="m-title">Gerecht</label>
          <input id="m-title" className="input" autoFocus required list="meal-titles" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Bijv. Spaghetti bolognese" />
          <datalist id="meal-titles">
            {[...previous.values()].map((m) => (
              <option key={m.id} value={m.title} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="m-date">Datum</label>
            <input id="m-date" type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="m-cook">Wie kookt?</label>
            <select id="m-cook" className="input" value={cookId} onChange={(e) => setCookId(e.target.value)}>
              <option value="">— Nog niemand —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="label">Ingrediënten</span>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-2">
                <input className="input" aria-label="Ingrediënt" placeholder="Ingrediënt" value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} />
                <input className="input !w-24" aria-label="Hoeveelheid" placeholder="Aantal" value={ing.quantity} onChange={(e) => setIng(i, { quantity: e.target.value })} />
                <select className="input !w-auto" aria-label="Categorie" value={ing.category} onChange={(e) => setIng(i, { category: e.target.value })}>
                  {Object.entries(SHOPPING_CATEGORIES).map(([k, c]) => (
                    <option key={k} value={k}>{c.icon}</option>
                  ))}
                </select>
                <button type="button" className="btn-ghost !p-1.5 text-danger" aria-label="Ingrediënt verwijderen" onClick={() => setIngredients((l) => l.filter((_, idx) => idx !== i))}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost mt-2" onClick={() => setIngredients((l) => [...l, { name: '', quantity: '', category: 'other' }])}>
            <Plus size={16} /> Ingrediënt toevoegen
          </button>
        </div>
        <div>
          <label className="label" htmlFor="m-notes">Notities (optioneel)</label>
          <textarea id="m-notes" className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recept-link, bijzonderheden…" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex gap-1">
            {meal.id && (
              <button
                type="button"
                className="btn-ghost text-danger hover:!bg-danger/10"
                onClick={() => {
                  if (confirm('Deze maaltijd verwijderen?')) {
                    deleteMeal(meal.id!);
                    onClose();
                  }
                }}
              >
                <Trash2 size={16} /> Verwijderen
              </button>
            )}
            {clean().length > 0 && (
              <button type="button" className="btn-secondary" onClick={toList}>
                <Cart size={16} /> Naar lijst
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn-primary">Opslaan</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function MealsPage() {
  const { meals, users, addToShopping, toast } = useStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [editing, setEditing] = useState<Partial<Meal> | null>(null);

  const days = weekDays(cursor);
  const today = todayISO();
  const weekMeals = meals.filter((m) => m.date >= toISO(days[0]) && m.date <= toISO(days[6]));

  const weekToList = () => {
    const n = addToShopping(weekMeals.flatMap((m) => m.ingredients));
    toast(n ? `${n} product${n === 1 ? '' : 'en'} op de boodschappenlijst gezet` : 'Niets toegevoegd: geen ingrediënten of alles staat al op de lijst');
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maaltijden</h1>
          <p className="text-sm capitalize text-muted">{short(days[0])} t/m {short(days[6])}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary !p-2" onClick={() => setCursor((c) => addDays(c, -7))} aria-label="Vorige week"><ChevronLeft size={18} /></button>
          <button className="btn-secondary" onClick={() => setCursor(new Date())}>Deze week</button>
          <button className="btn-secondary !p-2" onClick={() => setCursor((c) => addDays(c, 7))} aria-label="Volgende week"><ChevronRight size={18} /></button>
          <button className="btn-primary" onClick={weekToList} disabled={!weekMeals.some((m) => m.ingredients.length)}>
            <Cart size={16} /> Week naar boodschappenlijst
          </button>
        </div>
      </header>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const iso = toISO(d);
          const meal = meals.find((m) => m.date === iso);
          const cook = users.find((u) => u.id === meal?.cookId);
          return (
            <li key={iso} className={`card flex min-h-[130px] flex-col !p-4 ${iso === today ? 'border-primary' : ''}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-semibold capitalize">{WEEKDAY(d)}</span>
                <span className="text-xs text-muted">{d.getDate()}/{d.getMonth() + 1}</span>
              </div>
              {meal ? (
                <button className="flex flex-1 flex-col items-start gap-2 text-left" onClick={() => setEditing(meal)}>
                  <span className="text-lg font-medium leading-tight">{meal.title}</span>
                  {meal.ingredients.length > 0 && <span className="text-xs text-muted">{meal.ingredients.length} ingrediënten</span>}
                  <span className="mt-auto flex items-center gap-2 text-xs text-muted">
                    <Avatar user={cook} size={22} /> {cook ? `${cook.name} kookt` : 'Nog geen kok'}
                  </span>
                </button>
              ) : (
                <button className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted hover:bg-fg/5" onClick={() => setEditing({ date: iso })}>
                  <Plus size={16} /> Plan maaltijd
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">Tip: kies een eerder gerecht uit de suggesties, dan worden de ingrediënten automatisch overgenomen.</p>

      {editing && <MealModal meal={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
