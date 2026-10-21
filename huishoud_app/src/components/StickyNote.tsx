import { PinOutline, Pin } from './icons';
import Avatar from './Avatar';
import { useStore } from '../store/AppContext';
import { NOTE_COLORS } from '../lib/storage';
import type { Note } from '../types';

/** Kleine, vaste kanteling per notitie, afgeleid van het id (zodat die niet bij elke render verandert). */
const tilt = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 41) - 20) / 10; // -2.0 .. +2.0 graden
};

interface Props {
  note: Note;
  onEdit?: (n: Note) => void;
  compact?: boolean;
}

export default function StickyNote({ note, onEdit, compact }: Props) {
  const { users, saveNote } = useStore();
  const user = users.find((u) => u.id === note.userId);

  return (
    <div
      className={`group relative break-inside-avoid rounded-sm shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${
        compact ? 'p-3 text-sm' : 'mb-4 p-4'
      } ${onEdit ? 'cursor-pointer' : ''}`}
      style={{ backgroundColor: NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow, color: '#333', transform: `rotate(${tilt(note.id)}deg)` }}
      onClick={() => onEdit?.(note)}
    >
      <button
        className={`absolute right-1.5 top-1.5 rounded p-1 hover:bg-black/10 ${note.pinned ? '' : 'opacity-0 focus:opacity-100 group-hover:opacity-100'}`}
        onClick={(e) => {
          e.stopPropagation();
          saveNote({ ...note, pinned: !note.pinned });
        }}
        aria-label={note.pinned ? 'Losmaken' : 'Vastpinnen'}
        title={note.pinned ? 'Losmaken van dashboard' : 'Vastpinnen op dashboard'}
      >
        {note.pinned ? <Pin size={16} /> : <PinOutline size={16} />}
      </button>
      <p className="whitespace-pre-wrap break-words pr-6 font-medium" style={{ fontFamily: '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive' }}>
        {note.text}
      </p>
      {user && (
        <div className="mt-3 flex items-center gap-1.5 text-xs opacity-75">
          <Avatar user={user} size={18} /> {user.name}
        </div>
      )}
    </div>
  );
}
