import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mergeData } from '../../merge.js';
import type { AfvalType, AppData, Ingredient, List, ListItem, Meal, Note, PointEntry, Recipe, Reward, Room, ShoppingItem, Task, TaskStatus, User } from '../types';
import { STORAGE_KEY, fetchAfval, fetchRemote, loadData, pushRemote, saveData, syncedNow, uid } from '../lib/storage';
import { todayISO } from '../lib/dates';
import { balanceOf, reconcile } from '../lib/points';
import { BADGES } from '../lib/badges';
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
  saveMeal: (m: Draft<Meal>) => void;
  saveList: (l: Draft<List>) => void;
  deleteList: (id: string) => void;
  saveListItem: (i: Draft<ListItem>) => void;
  toggleListItem: (id: string) => void;
  deleteListItem: (id: string) => void;
  clearDoneListItems: (listId: string) => void;
  offline: boolean;
  saveRecipe: (r: Draft<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  deleteMeal: (id: string) => void;
  addToShopping: (items: Ingredient[]) => number;
  saveReward: (r: Draft<Reward>) => void;
  deleteReward: (id: string) => void;
  redeemReward: (userId: string, rewardId: string) => boolean;
  awardBonus: (userId: string, points: number, reason: string) => void;
  toast: (msg: string) => void;
  toasts: { id: number; msg: string }[];
}

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: Draft<T>): T[] {
  if (item.id && list.some((x) => x.id === item.id)) {
    return list.map((x) => (x.id === item.id ? ({ ...x, ...item } as T) : x));
  }
  return [...list, { ...item, id: uid() } as T];
}

const COLLECTIONS = ['users', 'rooms', 'tasks', 'notes', 'shopping', 'meals', 'recipes', 'lists', 'listItems', 'points', 'rewards', 'badges'] as const;

/**
 * Geeft gewijzigde records een tijdstempel en onthoudt verwijderde records, zodat de server de data
 * van meerdere apparaten per record kan samenvoegen. Records die niet van object-identiteit veranderden zijn ongewijzigd.
 */
function stamp(prev: AppData, next: AppData): AppData {
  if (prev === next) return next;
  const now = syncedNow();
  let out = next;
  let deleted = next.deleted;
  for (const key of COLLECTIONS) {
    if (prev[key] === next[key]) continue;
    const before = new Map<string, { id: string }>((prev[key] as { id: string }[]).map((x) => [x.id, x]));
    const ids = new Set((next[key] as { id: string }[]).map((x) => x.id));
    const items = (next[key] as { id: string }[]).map((x) => (before.get(x.id) === x ? x : { ...x, updatedAt: now }));
    for (const id of before.keys()) if (!ids.has(id)) deleted = { ...deleted, [id]: now };
    out = { ...out, [key]: items };
  }
  if (prev.afval !== next.afval) out = { ...out, afval: { ...next.afval, updatedAt: now } };
  return deleted === out.deleted ? out : { ...out, deleted };
}

export function AppProvider({ children, initial, remote }: { children: ReactNode; initial: AppData; remote: boolean }) {
  const [data, rawSetData] = useState<AppData>(initial);
  // alle lokale wijzigingen gaan hierdoor, zodat ze een tijdstempel krijgen
  const setData = useCallback((fn: (d: AppData) => AppData) => rawSetData((prev) => stamp(prev, reconcile(prev, fn(prev)))), []);

  const dataRef = useRef(data);
  dataRef.current = data;
  const rev = useRef(initial.rev ?? 0);
  const lastSent = useRef(''); // laatste versie die de server bevestigde
  const [offline, setOffline] = useState(false);
  const failed = useRef(false); // er staan lokale wijzigingen die nog niet naar de server zijn
  const [retry, setRetry] = useState(0);

  /** Voeg data van de server samen met de lokale staat (lokaal nieuwere wijzigingen blijven behouden). */
  const applyRemote = useCallback((server: AppData) => {
    rev.current = server.rev ?? rev.current;
    rawSetData((cur) => {
      const merged = mergeData(server, cur) as AppData;
      return JSON.stringify(merged) === JSON.stringify(cur) ? cur : { ...merged, rev: server.rev };
    });
  }, []);

  useEffect(() => {
    saveData(data);
    if (!remote) return;
    const json = JSON.stringify(data);
    if (json === lastSent.current) return;
    const t = setTimeout(async () => {
      const server = await pushRemote(data);
      if (server) {
        lastSent.current = json;
        failed.current = false;
        setOffline(false);
        applyRemote(server);
      } else {
        // geen verbinding: wijzigingen blijven lokaal bewaard en worden opnieuw geprobeerd (zie poll hieronder)
        failed.current = true;
        setOffline(true);
      }
    }, 300); // debounce
    return () => clearTimeout(t);
  }, [data, remote, applyRemote, retry]);

  // Wijzigingen van andere apparaten ophalen: elke 3 seconden (alleen als de app zichtbaar is) en bij terugkeren naar de app
  useEffect(() => {
    if (!remote) return;
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        if (failed.current) setRetry((n) => n + 1); // eerst proberen openstaande wijzigingen te versturen
        const r = await fetchRemote(rev.current);
        if (r === 'offline') setOffline(true);
        else if (r !== undefined) {
          if (!failed.current) setOffline(false);
          if (r && r !== 'unchanged') applyRemote(r);
        }
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(tick, 3000);
    const goOffline = () => setOffline(true);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', tick);
      window.removeEventListener('offline', goOffline);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [remote, applyRemote]);

  // keep multiple browser tabs in sync (LocalStorage-modus)
  useEffect(() => {
    if (remote) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) rawSetData(loadData());
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

  const saveList = useCallback((l: Draft<List>) => setData((d) => ({ ...d, lists: upsert(d.lists, l) })), []);
  const deleteList = useCallback(
    (id: string) => setData((d) => ({ ...d, lists: d.lists.filter((l) => l.id !== id), listItems: d.listItems.filter((i) => i.listId !== id) })),
    [],
  );
  const saveListItem = useCallback((i: Draft<ListItem>) => setData((d) => ({ ...d, listItems: upsert(d.listItems, i) })), []);
  const toggleListItem = useCallback(
    (id: string) => setData((d) => ({ ...d, listItems: d.listItems.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
    [],
  );
  const deleteListItem = useCallback((id: string) => setData((d) => ({ ...d, listItems: d.listItems.filter((i) => i.id !== id) })), []);
  const clearDoneListItems = useCallback(
    (listId: string) => setData((d) => ({ ...d, listItems: d.listItems.filter((i) => !(i.listId === listId && i.done)) })),
    [],
  );
  const saveRecipe = useCallback((r: Draft<Recipe>) => setData((d) => ({ ...d, recipes: upsert(d.recipes, r) })), []);
  const deleteRecipe = useCallback((id: string) => setData((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id) })), []);
  const saveMeal = useCallback((m: Draft<Meal>) => setData((d) => ({ ...d, meals: upsert(d.meals, m) })), []);
  const deleteMeal = useCallback((id: string) => setData((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) })), []);

  // ingrediënten op de boodschappenlijst zetten, zonder dubbelen van wat er al open staat
  const addToShopping = useCallback(
    (items: Ingredient[]) => {
      const open = new Set(dataRef.current.shopping.filter((i) => !i.done).map((i) => i.name.trim().toLowerCase()));
      const fresh: Ingredient[] = [];
      for (const i of items) {
        const key = i.name.trim().toLowerCase();
        if (key && !open.has(key)) {
          open.add(key);
          fresh.push(i);
        }
      }
      if (fresh.length) {
        setData((d) => {
          const have = new Set(d.shopping.filter((i) => !i.done).map((i) => i.name.trim().toLowerCase()));
          const add = fresh
            .filter((i) => !have.has(i.name.trim().toLowerCase()))
            .map((i) => ({ id: uid(), name: i.name.trim(), quantity: i.quantity, category: i.category, done: false, createdAt: Date.now() }));
          const names = [...add.map((a) => a.name), ...d.shoppingNames.filter((n) => !add.some((a) => a.name.toLowerCase() === n.toLowerCase()))];
          return { ...d, shopping: [...d.shopping, ...add], shoppingNames: names.slice(0, 200) };
        });
      }
      return fresh.length;
    },
    [setData],
  );

  const saveReward = useCallback((r: Draft<Reward>) => setData((d) => ({ ...d, rewards: upsert(d.rewards, r) })), []);
  const deleteReward = useCallback((id: string) => setData((d) => ({ ...d, rewards: d.rewards.filter((r) => r.id !== id) })), []);
  const addPoints = (d: AppData, e: Omit<PointEntry, 'id' | 'ts'>): AppData => ({
    ...d,
    points: [...d.points, { ...e, id: uid(), ts: Date.now() }],
  });
  const redeemReward = useCallback(
    (userId: string, rewardId: string) => {
      const d = dataRef.current;
      const reward = d.rewards.find((r) => r.id === rewardId);
      if (!reward || balanceOf(d, userId) < reward.cost) return false;
      setData((cur) => addPoints(cur, { userId, points: -reward.cost, reason: `Beloning: ${reward.title}`, kind: 'spend' }));
      return true;
    },
    [setData],
  );
  const awardBonus = useCallback(
    (userId: string, points: number, reason: string) =>
      setData((d) => addPoints(d, { userId, points, reason: reason || 'Bonus', kind: 'bonus' })),
    [setData],
  );

  // meldingen in beeld (bijv. nieuwe badge)
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  // nieuwe badges vieren, ook als ze door een ander apparaat zijn behaald
  const seenBadges = useRef(new Set(initial.badges.map((b) => b.id)));
  useEffect(() => {
    for (const b of data.badges) {
      if (seenBadges.current.has(b.id)) continue;
      seenBadges.current.add(b.id);
      const def = BADGES.find((x) => x.id === b.badgeId);
      const user = data.users.find((u) => u.id === b.userId);
      if (def && user && Date.now() - b.earnedAt < 60_000) toast(`${def.icon} ${user.name} heeft de badge “${def.name}” behaald!`);
    }
  }, [data.badges, data.users, toast]);

  const value = useMemo<Store>(
    () => ({ ...data, offline, saveList, deleteList, saveListItem, toggleListItem, deleteListItem, clearDoneListItems, saveRecipe, deleteRecipe, saveMeal, deleteMeal, addToShopping, saveReward, deleteReward, redeemReward, awardBonus, toast, toasts, syncAfval, setAfvalType, setAfvalTime, saveNote, deleteNote, saveShoppingItem, toggleShoppingItem, deleteShoppingItem, clearDoneShopping, saveUser, deleteUser, saveRoom, deleteRoom, saveTask, deleteTask, setTaskStatus, skipOccurrence, moveTask }),
    [data, offline, saveList, deleteList, saveListItem, toggleListItem, deleteListItem, clearDoneListItems, saveRecipe, deleteRecipe, saveMeal, deleteMeal, addToShopping, saveReward, deleteReward, redeemReward, awardBonus, toast, toasts, syncAfval, setAfvalType, setAfvalTime, saveNote, deleteNote, saveShoppingItem, toggleShoppingItem, deleteShoppingItem, clearDoneShopping, saveUser, deleteUser, saveRoom, deleteRoom, saveTask, deleteTask, setTaskStatus, skipOccurrence, moveTask],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore buiten AppProvider');
  return s;
}
