export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface User {
  id: string;
  name: string;
  role: string;
  color: string; // hex
  avatar: string; // emoji, or data-URL for an uploaded image
  notifyService?: string; // HA notify-service voor herinneringen, bijv. mobile_app_telefoon_ralph
}

export interface Room {
  id: string;
  name: string;
  icon: string; // emoji
}

export type RepeatUnit = 'day' | 'week' | 'month' | 'year';

export interface Repeat {
  unit: RepeatUnit;
  interval: number; // elke N dagen/weken/maanden/jaren
  until?: string; // YYYY-MM-DD, optioneel einddatum (inclusief)
}

export interface Task {
  id: string;
  title: string;
  description: string;
  userId: string | null;
  roomId: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or ''
  status: TaskStatus;
  repeat?: Repeat; // terugkerende taak: 'date' is de startdatum
  skipped?: string[]; // overgeslagen voorkomens (datums)
  occStatus?: Record<string, TaskStatus>; // status per voorkomen (datum), alleen bij terugkerende taken
}

/** Eén voorkomen van een taak; bij terugkerende taken is 'date' de datum van dit voorkomen. */
export type TaskInstance = Task & { occurrence?: string };

export interface Note {
  id: string;
  text: string;
  color: string; // sleutel uit NOTE_COLORS
  userId: string | null; // wie schreef de notitie
  pinned: boolean;
  createdAt: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string; // vrije tekst, bijv. "2x" of "500 g"
  category: string; // sleutel uit SHOPPING_CATEGORIES
  done: boolean;
  createdAt: number;
}

export interface AppData {
  users: User[];
  rooms: Room[];
  tasks: Task[];
  notes: Note[];
  shopping: ShoppingItem[];
  shoppingNames: string[]; // eerder gebruikte productnamen, voor suggesties
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In behandeling',
  done: 'Voltooid',
};
