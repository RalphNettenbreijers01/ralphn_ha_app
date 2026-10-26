import { useState, type FormEvent } from 'react';
import { Cart, Plus, Search, Trash2, Pencil, CalendarDays } from '../components/icons';
import { useStore } from '../store/AppContext';
import Modal from '../components/Modal';
import IngredientsEditor, { cleanIngredients } from '../components/IngredientsEditor';
import { todayISO } from '../lib/dates';
import type { Ingredient, Recipe } from '../types';

function RecipeModal({ recipe, onClose }: { recipe: Partial<Recipe>; onClose: () => void }) {
  const { saveRecipe, deleteRecipe, addToShopping, toast } = useStore();
  const [title, setTitle] = useState(recipe.title ?? '');
  const [notes, setNotes] = useState(recipe.notes ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(recipe.ingredients ?? []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveRecipe({ id: recipe.id, title: title.trim(), notes: notes.trim(), ingredients: cleanIngredients(ingredients) });
    onClose();
  };

  return (
    <Modal title={recipe.id ? 'Recept bewerken' : 'Nieuw recept'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="rc-title">Naam</label>
          <input id="rc-title" className="input" autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. Lasagne" />
        </div>
        <IngredientsEditor value={ingredients} onChange={setIngredients} />
        <div>
          <label className="label" htmlFor="rc-notes">Bereiding / notities (optioneel)</label>
          <textarea id="rc-notes" className="input min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Stappen, oventemperatuur, link naar het recept…" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex gap-1">
            {recipe.id && (
              <button
                type="button"
                className="btn-ghost text-danger hover:!bg-danger/10"
                onClick={() => {
                  if (confirm('Dit recept verwijderen?')) {
                    deleteRecipe(recipe.id!);
                    onClose();
                  }
                }}
              >
                <Trash2 size={16} /> Verwijderen
              </button>
            )}
            {cleanIngredients(ingredients).length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const n = addToShopping(cleanIngredients(ingredients));
                  toast(n ? `${n} product${n === 1 ? '' : 'en'} op de boodschappenlijst gezet` : 'Alles staat al op de boodschappenlijst');
                }}
              >
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

function PlanModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { users, saveMeal, addToShopping, toast } = useStore();
  const [date, setDate] = useState(todayISO());
  const [cookId, setCookId] = useState('');
  const [toList, setToList] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    saveMeal({
      date,
      title: recipe.title,
      cookId: cookId || null,
      notes: recipe.notes,
      ingredients: recipe.ingredients.map((i) => ({ ...i })),
      recipeId: recipe.id,
    });
    const n = toList ? addToShopping(recipe.ingredients) : 0;
    toast(`“${recipe.title}” ingepland${toList ? ` · ${n} product${n === 1 ? '' : 'en'} op de lijst` : ''}`);
    onClose();
  };

  return (
    <Modal title={`Inplannen: ${recipe.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="p-date">Datum</label>
            <input id="p-date" type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-cook">Wie kookt?</label>
            <select id="p-cook" className="input" value={cookId} onChange={(e) => setCookId(e.target.value)}>
              <option value="">— Nog niemand —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={toList} onChange={(e) => setToList(e.target.checked)} /> Ingrediënten ook op de boodschappenlijst zetten
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn-primary">Inplannen</button>
        </div>
      </form>
    </Modal>
  );
}

export default function RecipesPage() {
  const { recipes, meals, addToShopping, toast } = useStore();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null);
  const [planning, setPlanning] = useState<Recipe | null>(null);

  const list = recipes
    .filter((r) => !q || (r.title + ' ' + r.ingredients.map((i) => i.name).join(' ')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title, 'nl'));

  const timesCooked = (r: Recipe) => meals.filter((m) => m.recipeId === r.id || m.title.trim().toLowerCase() === r.title.trim().toLowerCase()).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold"><span className="mr-2 inline-block animate-floaty">👩‍🍳</span>Recepten</h1>
          <p className="text-sm text-muted">Gerechten die jullie vaker maken. Eén klik zet de ingrediënten op de boodschappenlijst.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Nieuw recept
        </button>
      </header>

      {recipes.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Zoek op naam of ingrediënt…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="card py-12 text-center text-muted">
          Nog geen recepten. Voeg een gerecht toe dat jullie vaker maken, of sla een maaltijd uit het weekmenu op als recept.
        </div>
      ) : list.length === 0 ? (
        <div className="card py-8 text-center text-muted">Geen recepten gevonden.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const n = timesCooked(r);
            return (
              <li key={r.id} className="card flex flex-col gap-3 !p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">{r.title}</p>
                    <p className="text-xs text-muted">
                      {r.ingredients.length} ingrediënten{n > 0 ? ` · ${n}× gemaakt` : ''}
                    </p>
                  </div>
                  <button className="btn-ghost !p-1.5" onClick={() => setEditing(r)} aria-label={`${r.title} bewerken`}><Pencil size={16} /></button>
                </div>
                {r.ingredients.length > 0 && (
                  <p className="line-clamp-2 text-sm text-muted">{r.ingredients.map((i) => i.name).join(', ')}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    className="btn-primary !px-3 !py-1.5"
                    disabled={r.ingredients.length === 0}
                    onClick={() => {
                      const added = addToShopping(r.ingredients);
                      toast(added ? `${added} product${added === 1 ? '' : 'en'} van “${r.title}” op de boodschappenlijst gezet` : 'Alles staat al op de boodschappenlijst');
                    }}
                  >
                    <Cart size={16} /> Naar lijst
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5" onClick={() => setPlanning(r)}>
                    <CalendarDays size={16} /> Inplannen
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <RecipeModal recipe={editing} onClose={() => setEditing(null)} />}
      {planning && <PlanModal recipe={planning} onClose={() => setPlanning(null)} />}
    </div>
  );
}
