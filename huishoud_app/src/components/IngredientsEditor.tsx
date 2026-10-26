import { Plus, Trash2 } from './icons';
import { SHOPPING_CATEGORIES } from '../lib/storage';
import type { Ingredient } from '../types';

interface Props {
  value: Ingredient[];
  onChange: (v: Ingredient[]) => void;
}

/** Lijst met ingrediënten (naam, hoeveelheid, categorie) om toe te voegen, te wijzigen en te verwijderen. */
export default function IngredientsEditor({ value, onChange }: Props) {
  const set = (i: number, patch: Partial<Ingredient>) => onChange(value.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <div>
      <span className="label">Ingrediënten</span>
      <ul className="space-y-2">
        {value.map((ing, i) => (
          <li key={i} className="flex items-center gap-2">
            <input className="input" aria-label="Ingrediënt" placeholder="Ingrediënt" value={ing.name} onChange={(e) => set(i, { name: e.target.value })} />
            <input className="input !w-24" aria-label="Hoeveelheid" placeholder="Aantal" value={ing.quantity} onChange={(e) => set(i, { quantity: e.target.value })} />
            <select className="input !w-auto" aria-label="Categorie" value={ing.category} onChange={(e) => set(i, { category: e.target.value })}>
              {Object.entries(SHOPPING_CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>{c.icon}</option>
              ))}
            </select>
            <button type="button" className="btn-ghost !p-1.5 text-danger" aria-label="Ingrediënt verwijderen" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-ghost mt-2" onClick={() => onChange([...value, { name: '', quantity: '', category: 'other' }])}>
        <Plus size={16} /> Ingrediënt toevoegen
      </button>
    </div>
  );
}

export const cleanIngredients = (list: Ingredient[]): Ingredient[] =>
  list.map((i) => ({ ...i, name: i.name.trim(), quantity: i.quantity.trim() })).filter((i) => i.name);
