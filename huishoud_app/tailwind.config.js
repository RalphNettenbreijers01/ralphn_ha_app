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
      keyframes: {
        wiggle: { '0%,100%': { transform: 'rotate(-10deg)' }, '50%': { transform: 'rotate(10deg) scale(1.15)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        floaty: { '0%,100%': { transform: 'translateY(0) rotate(0)' }, '50%': { transform: 'translateY(-4px) rotate(-5deg)' } },
        shine: { '0%,100%': { filter: 'brightness(1)' }, '50%': { filter: 'brightness(1.25) saturate(1.3)' } },
      },
      animation: {
        wiggle: 'wiggle .5s ease-in-out',
        pop: 'pop .35s ease-out',
        floaty: 'floaty 3s ease-in-out infinite',
        shine: 'shine 2.4s ease-in-out infinite',
      },
      fontFamily: { sans: ['var(--font-body)', 'Roboto', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
