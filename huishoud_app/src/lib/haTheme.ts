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

/** Zet elke CSS-kleur (hex, rgb(), naam) om naar "r g b" voor Tailwind's `<alpha-value>`. */
function toChannels(color: string): [number, number, number] | null {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.display = 'none';
    document.body.appendChild(probe);
  }
  probe.style.color = '';
  probe.style.color = color;
  if (!probe.style.color) return null;
  const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : null;
}

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
  const bg = toChannels(cs.getPropertyValue('--primary-background-color').trim());
  if (bg) root.style.colorScheme = (bg[0] * 299 + bg[1] * 587 + bg[2] * 114) / 1000 < 128 ? 'dark' : 'light';
  const font = cs.getPropertyValue('--ha-font-family-body').trim() || cs.getPropertyValue('--paper-font-body1_-_font-family').trim();
  if (font) root.style.setProperty('--font-body', font);
}

export function startHaTheme() {
  apply();
  window.setInterval(apply, 2000); // volgt wisselen van thema/donkere modus
}
