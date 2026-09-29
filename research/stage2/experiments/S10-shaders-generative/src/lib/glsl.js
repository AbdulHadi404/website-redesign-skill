// Shared GLSL for the fragment-shader variants (e1–e5, and the posters of a/e).
// One shader, five hosts: vanilla WebGL, OGL, regl, twgl, three — so the host is the only variable.
//
// snoise(): 3D simplex noise by Ashima Arts and Stefan Gustavson, MIT licence
// (https://github.com/stegu/webgl-noise, LICENSE: "Copyright (C) 2011 by Ashima Arts (Simplex noise)
//  Copyright (C) 2011-2016 by Stefan Gustavson (Classic noise and others)" — MIT). Keep this notice.
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// Brand palette (Halcyon, a fictional water-monitoring company): deep navy → teal → aqua, a coral glint.
export const PALETTE = { navy: [0.035, 0.07, 0.16], teal: [0.03, 0.36, 0.43], aqua: [0.46, 0.86, 0.84], coral: [0.98, 0.52, 0.42] };
const v3 = (c) => `vec3(${c.map((x) => x.toFixed(3)).join(', ')})`;

// Domain-warped simplex flow (Quilez-style warping, written here from the idea, not copied):
// five noise evaluations per pixel — a typical cost for a hero shader. Output is dithered (±0.5/255)
// so the smooth gradient does not band in 8-bit output or in the poster encoded from it.
export const FRAG_BODY = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
${NOISE}
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.06;
  vec2 q = vec2(snoise(vec3(p * 0.8, t)), snoise(vec3(p * 0.8 + 5.2, t)));
  vec2 r = vec2(snoise(vec3(p * 1.0 + 1.1 * q + vec2(1.7, 9.2), t * 1.3)), snoise(vec3(p * 1.0 + 1.1 * q + vec2(8.3, 2.8), t * 1.3)));
  float n = snoise(vec3(p * 0.7 + r, t * 0.7)) * 0.5 + 0.5;
  vec3 col = mix(${v3(PALETTE.navy)}, ${v3(PALETTE.teal)}, smoothstep(0.2, 0.85, n));
  col = mix(col, ${v3(PALETTE.aqua)}, smoothstep(0.7, 1.0, n) * 0.5);
  col = mix(col, ${v3(PALETTE.coral)}, smoothstep(0.75, 1.1, length(r)) * 0.25);
  vec2 uv = gl_FragCoord.xy / uRes;
  // A scrim inside the shader: the copy side (left, lower half) stays dark in every frame, so white text
  // keeps its contrast whatever the noise does. Designed with the layout, not added after.
  float open = clamp(smoothstep(0.05, 0.8, uv.x) * 0.65 + smoothstep(0.2, 1.0, uv.y) * 0.35, 0.0, 1.0);
  col *= mix(0.42, 1.0, open);
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 71.0) - 0.5) / 255.0;          // dither: no 8-bit banding
  gl_FragColor = vec4(col, 1.0);
}
`;
export const FRAG = `precision highp float;\n${FRAG_BODY}`;
export const VERT = /* glsl */ `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;
