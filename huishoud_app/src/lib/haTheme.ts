/**
 * Neemt het actieve Home Assistant-thema over (licht/donker, kleuren, lettertype).
 * Achter Ingress draait de app same-origin in een iframe, dus de CSS-variabelen van HA zijn leesbaar.
 * Buiten HA (of bij cross-origin) blijven de standaardwaarden uit index.css actief.
 */
const MAP: Record<string, string> = {
  '--c-primary': '--primary-color',
  '--c-fg': '--primary-text-color',
  '--c-muted': '--secondary-text-color',
  '--c-card': '--card-background-color',
  '--c-app': '--primary-background-color',
  '--c-line': '--divider-color',
  '--c-danger': '--error-color',
  '--c-ok': '--success-color',
  '--c-warn': '--warning-color',
};

let probe: HTMLElement | null = null;

type RGBA = [number, number, number, number];

/** Zet elke CSS-kleur (hex, rgb(a), naam) om naar [r, g, b, alpha]. */
function parseColor(color: string): RGBA | null {
  if (!color) return null;
  if (!probe) {
    probe = document.createElement('div');
    probe.style.display = 'none';
    document.body.appendChild(probe);
  }
  probe.style.color = '';
  probe.style.color = color;
  if (!probe.style.color) return null;
  const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])] : null;
}

const toChannels = (color: string) => parseColor(color)?.slice(0, 3) as [number, number, number] | undefined;

/** Leg een (half)transparante kleur over een achtergrond, zoals de browser het zou tonen. */
const over = (fg: RGBA, bg: RGBA): [number, number, number] =>
  [0, 1, 2].map((i) => Math.round(fg[i] * fg[3] + bg[i] * (1 - fg[3]))) as [number, number, number];

function apply() {
  let source: HTMLElement;
  try {
    source = window.parent.document.documentElement;
    if (window.parent === window) return;
  } catch {
    return; // cross-origin
  }
  const cs = getComputedStyle(source);
  const root = document.documentElement;
  for (const [mine, ha] of Object.entries(MAP)) {
    const v = cs.getPropertyValue(ha).trim();
    const ch = v && toChannels(v);
    if (ch) root.style.setProperty(mine, ch.join(' '));
  }
  // Menu: kleuren uit het thema. Achtergrond = secundaire achtergrond (loskomend van kaarten),
  // geselecteerd item = de sidebar-selectiekleuren van het thema (vaak transparant, dus over de menu-achtergrond gelegd).
  const sideBg = parseColor(cs.getPropertyValue('--secondary-background-color').trim());
  if (sideBg) {
    root.style.setProperty('--c-side', sideBg.slice(0, 3).join(' '));
    const primary = parseColor(cs.getPropertyValue('--primary-color').trim());
    const selBg = parseColor(cs.getPropertyValue('--sidebar-selected-background-color').trim());
    const sel = selBg ?? (primary && ([primary[0], primary[1], primary[2], 0.12] as RGBA));
    if (sel) root.style.setProperty('--c-side-sel', over(sel, sideBg).join(' '));
    const selFg = toChannels(cs.getPropertyValue('--sidebar-selected-text-color').trim());
    if (selFg) root.style.setProperty('--c-side-sel-fg', selFg.join(' '));
    else if (primary) root.style.setProperty('--c-side-sel-fg', primary.slice(0, 3).join(' '));
  }
  const bg = toChannels(cs.getPropertyValue('--primary-background-color').trim());
  if (bg) root.style.colorScheme = (bg[0] * 299 + bg[1] * 587 + bg[2] * 114) / 1000 < 128 ? 'dark' : 'light';
  const font = cs.getPropertyValue('--ha-font-family-body').trim() || cs.getPropertyValue('--paper-font-body1_-_font-family').trim();
  if (font) root.style.setProperty('--font-body', font);
}

export function startHaTheme() {
  apply();
  window.setInterval(apply, 2000); // volgt wisselen van thema/donkere modus
}
