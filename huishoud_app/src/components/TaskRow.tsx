import { Check, Clock, Pencil, RepeatIcon, Star } from '../components/icons';
import Avatar from './Avatar';
import { useStore } from '../store/AppContext';
import { STATUS_LABELS, type Task, type TaskInstance } from '../types';
import { describeRepeat } from '../lib/recurrence';
import { taskPoints } from '../lib/points';
import { formatShort } from '../lib/dates';
import { confetti } from '../lib/fun';

export const STATUS_STYLES: Record<Task['status'], string> = {
  open: 'bg-fg/10 text-muted',
  in_progress: 'bg-warn/15 text-warn',
  done: 'bg-ok/15 text-ok',
};

interface Props {
  task: TaskInstance;
  onEdit: (t: TaskInstance) => void;
  showDate?: boolean;
}

export default function TaskRow({ task, onEdit, showDate }: Props) {
  const { users, rooms, setTaskStatus } = useStore();
  const user = users.find((u) => u.id === task.userId);
  const room = rooms.find((r) => r.id === task.roomId);
  const done = task.status === 'done';

  return (
    <li className="flex items-center gap-3 rounded-xl p-3 border border-line transition hover:bg-fg/5">
      <button
        onClick={(e) => {
          if (!done) confetti(e.clientX, e.clientY);
          setTaskStatus(task.id, done ? 'open' : 'done', task.occurrence);
        }}
        aria-label={done ? 'Markeer als open' : 'Markeer als voltooid'}
        title={done ? 'Terug naar open' : 'Afvinken'}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
          done ? 'border-ok bg-ok text-white' : 'border-muted text-transparent hover:border-ok hover:text-ok'
        }`}
      >
        <Check size={16} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? 'text-muted line-through' : ''}`}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {showDate && <span>{formatShort(task.date)}</span>}
          {task.time && (
            <span className="inline-flex items-center gap-1"><Clock size={12} /> {task.time}</span>
          )}
          {room && <span>{room.icon} {room.name}</span>}
          {user && taskPoints(task) > 0 && (
            <span className="inline-flex items-center gap-1" title="Punten bij afronden"><Star size={12} /> {taskPoints(task)}</span>
          )}
          {task.repeat && (
            <span className="inline-flex items-center gap-1" title={describeRepeat(task.repeat)}>
              <RepeatIcon size={12} /> {describeRepeat(task.repeat)}
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[task.status]}`}>{STATUS_LABELS[task.status]}</span>
        </div>
      </div>
      <Avatar user={user} size={32} />
      <button className="btn-ghost !p-1.5" onClick={() => onEdit(task)} aria-label="Bewerken">
        <Pencil size={16} />
      </button>
    </li>
  );
}
