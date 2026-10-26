// Kleine dingen die de app vrolijker maken: confetti-regen en begroetingen.

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Laat emoji alle kanten op vliegen vanaf een punt op het scherm. */
export function confetti(x: number, y: number, emojis: string[] = ['🎉', '✨', '⭐', '🎊', '💫'], count = 14) {
  if (typeof document === 'undefined' || reduceMotion()) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      fontSize: `${14 + Math.random() * 16}px`,
      pointerEvents: 'none',
      zIndex: '100',
      willChange: 'transform, opacity',
    });
    document.body.appendChild(el);

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3; // vooral omhoog
    const dist = 60 + Math.random() * 140;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const fall = 90 + Math.random() * 90;
    const rot = (Math.random() - 0.5) * 540;
    el
      .animate(
        [
          { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) scale(1.1) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx * 1.25}px,${dy + fall}px) scale(.8) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.8,.3,1)' },
      )
      .addEventListener('finish', () => el.remove());
  }
}

/** Groot feest, bijvoorbeeld bij een nieuwe badge. */
export const celebrate = () =>
  confetti(window.innerWidth / 2, Math.min(180, window.innerHeight / 3), ['🎉', '🏆', '⭐', '🎊', '🥳', '✨', '🌟'], 42);

export function greeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6) return { text: 'Nachtbraker', emoji: '🌙' };
  if (h < 12) return { text: 'Goedemorgen', emoji: '☀️' };
  if (h < 18) return { text: 'Goedemiddag', emoji: '🌤️' };
  return { text: 'Goedenavond', emoji: '🌆' };
}
