// Sound as optional feedback: off by default, a visible toggle with aria-pressed,
// the AudioContext created only inside the gesture that turns sound on, the
// choice remembered, and silence while the tab is hidden. Synthesised, so no
// audio files are downloaded.
export function createSound(button) {
  let ctx = null;
  let on = false;
  try { on = localStorage.getItem('toy-sound') === 'on'; } catch { /* storage blocked */ }
  // A remembered "on" still waits for a gesture before creating the context.
  const sync = () => {
    button.setAttribute('aria-pressed', String(on));
    button.querySelector('[data-state]').textContent = on ? 'on' : 'off';
  };
  sync();
  button.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem('toy-sound', on ? 'on' : 'off'); } catch { /* ignore */ }
    if (on && !ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (on && ctx.state === 'suspended') ctx.resume();
    sync();
  });
  return {
    get on() { return on; },
    play(kind) {
      if (!on || !ctx || document.hidden) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      const [f0, f1] = kind === 'remove' ? [420, 180] : [520, 880];
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.13);
    },
  };
}
