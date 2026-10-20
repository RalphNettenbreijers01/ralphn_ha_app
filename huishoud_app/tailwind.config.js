/** @type {import('tailwindcss').Config} */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Semantische kleuren, gevoed door het Home Assistant-thema (zie src/lib/haTheme.ts)
      colors: {
        primary: c('primary'),
        fg: c('fg'),
        muted: c('muted'),
        card: c('card'),
        app: c('app'),
        line: c('line'),
        danger: c('danger'),
        ok: c('ok'),
        warn: c('warn'),
        side: c('side'),
        'side-sel': c('side-sel'),
        'side-sel-fg': c('side-sel-fg'),
      },
      fontFamily: { sans: ['var(--font-body)', 'Roboto', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
