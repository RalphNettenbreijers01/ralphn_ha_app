import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, Room, Task, TaskStatus, User } from '../types';
import { STORAGE_KEY, loadData, pushRemote, saveData, uid } from '../lib/storage';

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
    (id: string) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
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

  const value = useMemo<Store>(
    () => ({ ...data, saveUser, deleteUser, saveRoom, deleteRoom, saveTask, deleteTask, setTaskStatus, skipOccurrence, moveTask }),
    [data, saveUser, deleteUser, saveRoom, deleteRoom, saveTask, deleteTask, setTaskStatus, skipOccurrence, moveTask],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore buiten AppProvider');
  return s;
}
