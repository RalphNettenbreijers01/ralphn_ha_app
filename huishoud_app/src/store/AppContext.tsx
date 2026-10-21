import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AfvalType, AppData, Note, Room, ShoppingItem, Task, TaskStatus, User } from '../types';
import { STORAGE_KEY, fetchAfval, loadData, pushRemote, saveData, uid } from '../lib/storage';
import { todayISO } from '../lib/dates';
import { applyTypeSettings, mergePickups, removeUpcoming, type Pickup } from '../lib/afval';

type Draft<T extends { id: string }> = Omit<T, 'id'> & { id?: string };

interface Store extends AppData {
  saveUser: (u: Draft<User>) => void;
  deleteUser: (id: string) => void;
  saveRoom: (r: Draft<Room>) => void;
  deleteRoom: (id: string) => void;
  saveTask: (t: Draft<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus, occurrence?: string) => void;
  skipOccurrence: (id: string, date: string) => void;
  moveTask: (id: string, date: string) => void;
  saveNote: (n: Draft<Note>) => void;
  deleteNote: (id: string) => void;
  saveShoppingItem: (i: Draft<ShoppingItem>) => void;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  clearDoneShopping: () => void;
  syncAfval: (pickups: Pickup[]) => void;
  setAfvalType: (type: string, patch: Partial<AfvalType>) => void;
  setAfvalTime: (time: string) => void;
}

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: Draft<T>): T[] {
  if (item.id && list.some((x) => x.id === item.id)) {
    return list.map((x) => (x.id === item.id ? ({ ...x, ...item } as T) : x));
  }
  return [...list, { ...item, id: uid() } as T];
}

export function AppProvider({ children, initial, remote }: { children: ReactNode; initial: AppData; remote: boolean }) {
  const [data, setData] = useState<AppData>(initial);

  useEffect(() => {
    saveData(data);
    if (!remote) return;
    const t = setTimeout(() => pushRemote(data), 400); // debounce
    return () => clearTimeout(t);
  }, [data, remote]);

  // keep multiple browser tabs in sync (LocalStorage-modus)
  useEffect(() => {
    if (remote) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setData(loadData());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [remote]);

  const saveUser = useCallback((u: Draft<User>) => setData((d) => ({ ...d, users: upsert(d.users, u) })), []);
  const deleteUser = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        users: d.users.filter((u) => u.id !== id),
        tasks: d.tasks.map((t) => (t.userId === id ? { ...t, userId: null } : t)),
      })),
    [],
  );
  const saveRoom = useCallback((r: Draft<Room>) => setData((d) => ({ ...d, rooms: upsert(d.rooms, r) })), []);
  const deleteRoom = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        rooms: d.rooms.filter((r) => r.id !== id),
        tasks: d.tasks.map((t) => (t.roomId === id ? { ...t, roomId: null } : t)),
      })),
    [],
  );
  const saveTask = useCallback((t: Draft<Task>) => setData((d) => ({ ...d, tasks: upsert(d.tasks, t) })), []);
  const deleteTask = useCallback(
    (id: string) =>
      setData((d) => {
        const gone = d.tasks.find((t) => t.id === id);
        // automatisch aangemaakte taken (afval) niet opnieuw aanmaken na verwijderen
        const ignored = gone?.sourceKey ? [...d.afval.ignored, gone.sourceKey] : d.afval.ignored;
        return { ...d, tasks: d.tasks.filter((t) => t.id !== id), afval: { ...d.afval, ignored } };
      }),
    [],
  );
  const setTaskStatus = useCallback(
    (id: string, status: TaskStatus, occurrence?: string) =>
      setData((d) => ({
        ...d,
        tasks: d.tasks.map((t) => {
          if (t.id !== id) return t;
          if (!t.repeat || !occurrence) return { ...t, status };
          const occStatus = { ...t.occStatus };
          if (status === 'open') delete occStatus[occurrence];
          else occStatus[occurrence] = status;
          return { ...t, occStatus };
        }),
      })),
    [],
  );
  const skipOccurrence = useCallback(
    (id: string, date: string) =>
      setData((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, skipped: [...(t.skipped ?? []), date] } : t)),
      })),
    [],
  );
  const moveTask = useCallback(
    (id: string, date: string) =>
      setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, date } : t)) })),
    [],
  );

  const saveNote = useCallback((n: Draft<Note>) => setData((d) => ({ ...d, notes: upsert(d.notes, n) })), []);
  const deleteNote = useCallback((id: string) => setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) })), []);
  const saveShoppingItem = useCallback(
    (i: Draft<ShoppingItem>) =>
      setData((d) => {
        const key = i.name.trim().toLowerCase();
        const names = d.shoppingNames.some((n) => n.toLowerCase() === key)
          ? d.shoppingNames
          : [i.name.trim(), ...d.shoppingNames].slice(0, 200);
        return { ...d, shopping: upsert(d.shopping, i), shoppingNames: names };
      }),
    [],
  );
  const toggleShoppingItem = useCallback(
    (id: string) =>
      setData((d) => ({ ...d, shopping: d.shopping.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
    [],
  );
  const deleteShoppingItem = useCallback(
    (id: string) => setData((d) => ({ ...d, shopping: d.shopping.filter((i) => i.id !== id) })),
    [],
  );
  const clearDoneShopping = useCallback(
    () => setData((d) => ({ ...d, shopping: d.shopping.filter((i) => !i.done) })),
    [],
  );

  const syncAfval = useCallback((pickups: Pickup[]) => setData((d) => mergePickups(d, pickups)), []);
  const setAfvalType = useCallback(
    (type: string, patch: Partial<AfvalType>) =>
      setData((d) => {
        const cur = d.afval.types[type] ?? { enabled: true, userId: null, roomId: null };
        const next = { ...d, afval: { ...d.afval, types: { ...d.afval.types, [type]: { ...cur, ...patch } } } };
        if (patch.enabled === false) return removeUpcoming(next, type);
        return applyTypeSettings(next, type);
      }),
    [],
  );
  const setAfvalTime = useCallback(
    (time: string) =>
      setData((d) => {
        const today = todayISO();
        return {
          ...d,
          afval: { ...d.afval, time },
          tasks: d.tasks.map((t) => (t.sourceKey?.startsWith('afval:') && t.status !== 'done' && t.date >= today ? { ...t, time } : t)),
        };
      }),
    [],
  );

  // Ophaaldagen (add-on haalt ze uit Home Assistant) omzetten in taken: bij opstarten en elk uur
  useEffect(() => {
    if (!remote) return;
    let stop = false;
    const run = async () => {
      const info = await fetchAfval();
      if (!stop && info?.pickups.length) syncAfval(info.pickups);
    };
    run();
    const t = setInterval(run, 60 * 60 * 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [remote, syncAfval]);

  const value = useMemo<Store>(
    () => ({ ...data, syncAfval, setAfvalType, setAfvalTime, saveNote, deleteNote, saveShoppingItem, toggleShoppingItem, deleteShoppingItem, clearDoneShopping, saveUser, deleteUser, saveRoom, deleteRoom, saveTask, deleteTask, setTaskStatus, skipOccurrence, moveTask }),
    [data, syncAfval, setAfvalType, setAfvalTime, saveNote, deleteNote, saveShoppingItem, toggleShoppingItem, deleteShoppingItem, clearDoneShopping, saveUser, deleteUser, saveRoom, deleteRoom, saveTask, deleteTask, setTaskStatus, skipOccurrence, moveTask],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore buiten AppProvider');
  return s;
}
