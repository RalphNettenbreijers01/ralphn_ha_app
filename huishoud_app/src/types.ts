export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface User {
  id: string;
  name: string;
  role: string;
  color: string; // hex
  avatar: string; // emoji, or data-URL for an uploaded image
}

export interface Room {
  id: string;
  name: string;
  icon: string; // emoji
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
}

export interface AppData {
  users: User[];
  rooms: Room[];
  tasks: Task[];
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In behandeling',
  done: 'Voltooid',
};
