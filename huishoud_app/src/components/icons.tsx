import { mdiCheck, mdiChevronLeft, mdiChevronRight, mdiClose } from '@mdi/js';

interface IconProps {
  size?: number;
  strokeWidth?: number; // genegeerd, alleen voor compatibiliteit
  className?: string;
}

/** Functionele pijltjes/vinkjes blijven strakke mdi-vectoren (die moeten van kleur kunnen wisselen). */
const vector = (path: string) =>
  function Icon({ size = 24, className }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
        <path d={path} />
      </svg>
    );
  };

/** Al het andere: kleurrijke emoji, zodat de app wat vrolijker oogt. */
const emoji = (e: string) =>
  function Icon({ size = 24, className = '' }: IconProps) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 select-none text-center ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.85, lineHeight: `${size}px` }}
      >
        {e}
      </span>
    );
  };

export const Check = vector(mdiCheck);
export const ChevronLeft = vector(mdiChevronLeft);
export const ChevronRight = vector(mdiChevronRight);
export const X = vector(mdiClose);

export const AlertTriangle = emoji('🚨');
export const Bin = emoji('♻️');
export const Book = emoji('📖');
export const CalendarClock = emoji('🗓️');
export const CalendarDays = emoji('📅');
export const Cart = emoji('🛒');
export const ChartBar = emoji('📊');
export const CheckCircle2 = emoji('🎉');
export const Clock = emoji('⏰');
export const CloudOff = emoji('📡');
export const DoorOpen = emoji('🚪');
export const Gift = emoji('🎁');
export const Home = emoji('🏠');
export const ImagePlus = emoji('🖼️');
export const ListChecks = emoji('✅');
export const Lists = emoji('📋');
export const Lock = emoji('🔒');
export const Meal = emoji('🍝');
export const Note = emoji('📌');
export const Pencil = emoji('✏️');
export const Pin = emoji('📌');
export const PinOutline = emoji('📍');
export const Plus = emoji('➕');
export const RepeatIcon = emoji('🔁');
export const Search = emoji('🔍');
export const Star = emoji('⭐');
export const Sun = emoji('☀️');
export const Trash2 = emoji('🗑️');
export const Trophy = emoji('🏆');
export const Users = emoji('👨‍👩‍👧‍👦');
