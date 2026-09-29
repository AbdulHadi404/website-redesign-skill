// Damped harmonic oscillator, mass 1, from 0 to 1, zero initial velocity.
function spring(k, zeta) {
  const w0 = Math.sqrt(k);
  return t => {
    if (zeta < 1) { const wd = w0 * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t)); }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t); // critically damped
  };
}
function settle(f, eps = 0.001) { let last = 0; for (let t = 0; t < 5; t += 0.001) if (Math.abs(1 - f(t)) > eps) last = t; return last + 0.001; }
function linear(f, T, n) { const pts = []; for (let i = 0; i <= n; i++) pts.push(+f(T * i / n).toFixed(3)); pts[n] = 1; return `linear(${pts.join(", ")})`; }
const specs = [
  ["M3 fast spatial (k1400, ζ0.9)", 1400, 0.9], ["M3 default spatial (k700, ζ0.9)", 700, 0.9], ["M3 slow spatial (k300, ζ0.9)", 300, 0.9],
  ["M3 fast effects (k3800, ζ1)", 3800, 1], ["M3 default effects (k1600, ζ1)", 1600, 1],
  ["expressive spring (k340, ζ0.7)", 340, 0.7], ["playful spring (k300, ζ0.5)", 300, 0.5],
];
for (const [name, k, z] of specs) {
  const f = spring(k, z); const T = settle(f); let peak = 0; for (let t = 0; t < T; t += 0.001) peak = Math.max(peak, f(t));
  const dMotion = (2 * z * Math.sqrt(k)).toFixed(1);
  console.log(`${name}: settle(0.1%)=${Math.round(T * 1000)}ms overshoot=${((peak - 1) * 100).toFixed(1)}%  Motion:{type:"spring",stiffness:${k},damping:${dMotion},mass:1}`);
  if (/default spatial|expressive|playful/.test(name)) console.log("   ", linear(f, T, 20));
}
