const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Monday-based start of week. */
export const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -day);
};

/** 6x7 grid of days covering the month of `d`, Monday first. */
export const monthGrid = (d: Date) => {
  const start = startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

export const weekDays = (d: Date) => {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const WEEKDAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export const formatLong = (d: Date) =>
  d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
export const formatMonth = (d: Date) => d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
export const formatShort = (iso: string) =>
  parseISO(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
