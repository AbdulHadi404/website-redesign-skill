# Real-time 3D and signature interactive experiences

Read this when a site includes (or becomes) a real-time 3D experience: a configurator, a builder, a
product viewer, anything the business wants people to *play with*. The signature-experience rule in
`SKILL.md` decides whether it is one; this file is how to make it look and run like a product.

## 1. Change hats

A signature 3D experience needs the mindset of a small real-time graphics team, not only a front-end
developer's: graphics engineer, technical artist, 3D artist, game-UI designer, performance engineer.
Budgets are in milliseconds per frame, triangles, draw calls and megabytes, and every visual idea is
weighed against its cost.

## 2. Two passes, in this order

1. **Interaction first.** Get the product right: direct manipulation, selection, placement, camera,
   undo, saving, the finish moment. Prove it with a vertical slice.
2. **Then a dedicated fidelity pass.** Once people like using it, the gap between "it works" and "this
   looks beautiful" is its own R&D project: materials, lighting, shadows, anti-aliasing, surface detail,
   composition. Don't mix the two, and don't declare the product finished after pass 1.

## 3. Measure before and after, always

- Build a **benchmark harness first**: fixed scenes (plain, typical, heavy), fixed quality tiers,
  several device profiles, and fixed camera angles for screenshots. Record frame time (mean, p95),
  draw calls, triangles, texture memory, JS per frame, load time and transfer size.
- Benchmark a **production build**, never the dev server.
- Judge on a **real GPU in a focused browser** (see `visual-qa.md` → 3D and WebGL experiences).
- Keep a **log of failed experiments** next to the numbers. It stops the next session repeating them.
- **Isolate costs with experiment flags** (e.g. `?msaa=0&ao=0`) rather than guessing which effect is
  expensive. One run of four combinations beats an afternoon of intuition.

## 4. Perceived quality is not polygon count

The big jumps usually come from these, roughly in order of value per millisecond:

- **Accumulate while the camera rests.** Jitter the projection sub-pixel and average frames (and wander
  the key light for soft shadows); then stop rendering. Supersampled edges and soft shadows for free,
  because most of the time the user is looking, not orbiting.
- **Bake occlusion.** Procedural geometry knows its grooves and contacts; write occlusion per vertex at
  generation time, or bake it offline. It lifts every tier, phones included, at ~zero runtime cost.
- **Art-directed light.** Light like a photographer shoots that subject (for product/food: a large soft
  key from the side, a bounce card, a rim), mostly as image-based softboxes so reflections are
  window-shaped.
- **Materials that differ by physics, not by colour.** Different substances need different specular
  lobes, sheen, translucency, anisotropy and edge profiles. Cap near-white albedos so lit whites keep form.
- **Cache what doesn't move.** If the object and lights are static while the camera orbits, shadow maps
  and environment maps render on change, not every frame.
- **Render on demand.** A still frame costs nothing; battery and thermals stay healthy on phones.

Geometry detail comes last, and usually goes *down*: shading (baked occlusion, normals) carries fine
detail far more cheaply than vertices.

## 5. Offline preprocessing

If a minute of preparation saves milliseconds on every frame for every visitor, spend the minute:
bake in a DCC tool (Blender headless), decimate LODs, compress (meshopt/KTX2), and enforce per-asset
budgets in a build script that **fails** when an asset is over. Build a repeatable pipeline
(source → bake → LODs → validate → compress → budgets → hashed files → manifest → loader) before the
second asset, never one-off exports.

## 6. Adaptive quality instead of a smaller design

- Tiers change **resolution, effects and tessellation, never the look**: the same lights, materials and
  composition on every tier, so the lowest tier still looks intentional.
- Start from a device guess (touch, memory), then **judge dropped frames against the display's own
  refresh**, only over runs of continuous frames, never in the first seconds after load or a tier
  change; step down, rarely up.
- Don't let a frame-rate monitor judge an on-demand renderer: idle gaps aren't slow frames.

## 7. After the product improves, the marketing must catch up

When the real product becomes better than the pages advertising it, replace old screenshots, demos and
copy with captures from the **real** product (its own hero renders, same camera angles). Never fake the
product in marketing images when the real thing is better.

## 8. Pick motion and 3D tools per effect

Choose the tool for each interaction, not one library for the whole site: CSS (and scroll-driven
animations or View Transitions) for simple transitions, a UI motion library for component and layout
animation, a timeline library for choreographed sequences, WebGL only where depth or light is the point,
lazily loaded and rendering only while visible. Don't turn a site into one canvas to prove it can be done.

## 9. Parallelise the R&D

A graphics pass contains several independent questions (rendering techniques, materials, mobile limits,
asset pipeline, next-generation renderer, a code audit, competitor teardown). Give each to a side agent
with a distinct mission, a findings file to write and a short reply to return; keep conclusions and
decisions in the main thread and the raw research in the project's research folder. Stagger them if the
plan has usage limits: several heavy agents at once can exhaust a session window.
