import {
  mdiAlert,
  mdiCalendarMonth,
  mdiCalendarClock,
  mdiCheck,
  mdiCheckCircle,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClockOutline,
  mdiClose,
  mdiDelete,
  mdiDoorOpen,
  mdiHome,
  mdiImagePlus,
  mdiAccountGroup,
  mdiFormatListChecks,
  mdiMagnify,
  mdiPencil,
  mdiPlus,
  mdiRepeat,
  mdiWhiteBalanceSunny,
} from '@mdi/js';

// Home Assistant gebruikt Material Design Icons (mdi); dezelfde set als hier.
interface IconProps {
  size?: number;
  strokeWidth?: number; // genegeerd, alleen voor compatibiliteit
  className?: string;
}

const make = (path: string) =>
  function Icon({ size = 24, className }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
        <path d={path} />
      </svg>
    );
  };

export const AlertTriangle = make(mdiAlert);
export const CalendarClock = make(mdiCalendarClock);
export const CalendarDays = make(mdiCalendarMonth);
export const Check = make(mdiCheck);
export const CheckCircle2 = make(mdiCheckCircle);
export const ChevronLeft = make(mdiChevronLeft);
export const ChevronRight = make(mdiChevronRight);
export const Clock = make(mdiClockOutline);
export const DoorOpen = make(mdiDoorOpen);
export const Home = make(mdiHome);
export const ImagePlus = make(mdiImagePlus);
export const ListChecks = make(mdiFormatListChecks);
export const Pencil = make(mdiPencil);
export const Plus = make(mdiPlus);
export const RepeatIcon = make(mdiRepeat);
export const Search = make(mdiMagnify);
export const Sun = make(mdiWhiteBalanceSunny);
export const Trash2 = make(mdiDelete);
export const Users = make(mdiAccountGroup);
export const X = make(mdiClose);
