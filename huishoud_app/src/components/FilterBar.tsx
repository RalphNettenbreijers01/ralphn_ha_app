import { useStore } from '../store/AppContext';

export interface Filters {
  userId: string;
  roomId: string;
}

interface Props {
  value: Filters;
  onChange: (f: Filters) => void;
}

export default function FilterBar({ value, onChange }: Props) {
  const { users, rooms } = useStore();
  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Filter op gebruiker" className="input !w-auto" value={value.userId} onChange={(e) => onChange({ ...value, userId: e.target.value })}>
        <option value="">Alle gebruikers</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <select aria-label="Filter op ruimte" className="input !w-auto" value={value.roomId} onChange={(e) => onChange({ ...value, roomId: e.target.value })}>
        <option value="">Alle ruimtes</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
        ))}
      </select>
    </div>
  );
}

export const applyFilters = <T extends { userId: string | null; roomId: string | null }>(items: T[], f: Filters) =>
  items.filter((t) => (!f.userId || t.userId === f.userId) && (!f.roomId || t.roomId === f.roomId));
