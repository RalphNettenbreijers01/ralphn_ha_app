export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface User {
  id: string;
  updatedAt?: number; // tijdstip laatste wijziging (voor samenvoegen tussen apparaten)
  name: string;
  role: string;
  color: string; // hex
  avatar: string; // emoji, or data-URL for an uploaded image
  notifyService?: string; // HA notify-service voor herinneringen, bijv. mobile_app_telefoon_ralph
}

export interface Room {
  id: string;
  updatedAt?: number; // tijdstip laatste wijziging (voor samenvoegen tussen apparaten)
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
  updatedAt?: number; // tijdstip laatste wijziging (voor samenvoegen tussen apparaten)
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
  points?: number; // punten bij afronden (standaard 10)
  sourceKey?: string; // automatisch aangemaakt (bijv. afvalophaling): 'afval:<soort>|<ophaaldag>'
}

/** Eén voorkomen van een taak; bij terugkerende taken is 'date' de datum van dit voorkomen. */
export type TaskInstance = Task & { occurrence?: string };

export interface Note {
  id: string;
  updatedAt?: number; // tijdstip laatste wijziging (voor samenvoegen tussen apparaten)
  text: string;
  color: string; // sleutel uit NOTE_COLORS
  userId: string | null; // wie schreef de notitie
  pinned: boolean;
  createdAt: number;
}

export interface ShoppingItem {
  id: string;
  updatedAt?: number; // tijdstip laatste wijziging (voor samenvoegen tussen apparaten)
  name: string;
  quantity: string; // vrije tekst, bijv. "2x" of "500 g"
  category: string; // sleutel uit SHOPPING_CATEGORIES
  done: boolean;
  createdAt: number;
}

export interface Ingredient {
  name: string;
  quantity: string;
  category: string; // sleutel uit SHOPPING_CATEGORIES
}

export interface Meal {
  id: string;
  updatedAt?: number;
  date: string; // YYYY-MM-DD, avondeten
  title: string;
  cookId: string | null; // wie kookt
  notes: string;
  ingredients: Ingredient[];
}

export interface PointEntry {
  id: string; // earn: 'earn|<taak>|<voorkomen>' (deterministisch)
  updatedAt?: number;
  userId: string;
  points: number; // negatief bij inwisselen
  reason: string;
  ts: number;
  kind: 'earn' | 'spend' | 'bonus';
  roomId?: string | null;
  tag?: string; // bijv. 'afval'
}

export interface Reward {
  id: string;
  updatedAt?: number;
  title: string;
  icon: string;
  cost: number;
}

export interface EarnedBadge {
  id: string; // '<userId>|<badgeId>'
  updatedAt?: number;
  userId: string;
  badgeId: string;
  earnedAt: number;
}

export interface AfvalType {
  enabled: boolean;
  userId: string | null;
  roomId: string | null;
}

export interface AfvalSettings {
  types: Record<string, AfvalType>; // per containersoort
  time: string; // tijdstip van de taak op de avond voor de ophaaldag
  ignored: string[]; // sourceKeys van taken die de gebruiker verwijderde
  updatedAt?: number;
}

export interface AppData {
  users: User[];
  rooms: Room[];
  tasks: Task[];
  notes: Note[];
  shopping: ShoppingItem[];
  shoppingNames: string[]; // eerder gebruikte productnamen, voor suggesties
  afval: AfvalSettings;
  meals: Meal[];
  points: PointEntry[];
  rewards: Reward[];
  badges: EarnedBadge[];
  deleted: Record<string, number>; // verwijderde record-id's → tijdstip
  rev?: number; // versienummer van de server (alleen informatief)
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In behandeling',
  done: 'Voltooid',
};
