# Real-time 3D and signature interactive experiences

Read this when a site includes (or becomes) a real-time 3D experience: a configurator, a builder, a product viewer, anything the business wants people to *play with*. Whether it is a signature experience is decided in `SKILL.md` Phase 0 and `framing.md` §1 (posture: signature); this file is how to make it look and run like a product. For 3D on an ordinary page, the checklist and budgets are in `motion.md` §9; they apply here too and are not repeated. Direct manipulation on the canvas (selection, orbit, drag, one undo per gesture) is `ui-ux.md` §7b. Evidence: the 2026-09-27 Cake Junction rows in `lessons.md`.

## 1. Change hats

A signature 3D experience needs the mindset of a small real-time graphics team, not only a front-end developer's: graphics engineer, technical artist, 3D artist, game-UI designer, performance engineer. Budgets are in milliseconds per frame, triangles, draw calls and megabytes, and every visual idea is weighed against its cost.

## 2. Two passes, in this order

1. **Interaction first.** Get the product right: direct manipulation, selection, placement, camera, undo, saving, the finish moment. Prove it with one vertical slice before adding breadth (`discovery.md` §5b).
2. **Then a dedicated fidelity pass.** Once people like using it, the gap between "it works" and "this looks beautiful" is its own R&D project: materials, lighting, shadows, anti-aliasing, surface detail, composition. Don't mix the two, and don't declare the product finished after pass 1.

## 3. Measure before and after, always

- Build a **benchmark harness first**: fixed scenes (plain, typical, heavy), fixed quality tiers, several device profiles, and fixed camera angles for screenshots. Record frame time (mean, p95), draw calls, triangles, texture memory, JS per frame, load time and transfer size.
- Benchmark a **production build**, never the dev server (`visual-qa.md` "Capturing reliably").
- Judge on a **real GPU in a focused browser** (`visual-qa.md` "3D and WebGL experiences"). Capture with `scripts/capture.mjs --gpu`, which prints the renderer, so a software-rendered run can't pass for a real one.
- Keep a **log of failed experiments** next to the numbers. It stops the next session repeating them.
- **Isolate costs with experiment flags** (e.g. `?msaa=0&ao=0`) rather than guessing which effect is expensive. One run of four combinations beats an afternoon of intuition.

## 4. Perceived quality is not polygon count

The big jumps usually come from these, roughly in order of value per millisecond:

- **Accumulate while the camera rests.** Jitter the projection sub-pixel and average frames (and wander the key light for soft shadows); then stop rendering. Supersampled edges and soft shadows for free, because most of the time the user is looking, not orbiting.
- **Bake occlusion.** Procedural geometry knows its grooves and contacts; write occlusion per vertex at generation time, or bake it offline. It lifts every tier, phones included, at ~zero runtime cost.
- **Art-directed light.** Light like a photographer shoots that subject (for product/food: a large soft key from the side, a bounce card, a rim), mostly as image-based softboxes so reflections are window-shaped.
- **Materials that differ by physics, not by colour.** Different substances need different specular lobes, sheen, translucency, anisotropy and edge profiles. Cap near-white albedos so lit whites keep form.
- **Cache what doesn't move.** If the object and lights are static while the camera orbits, shadow maps and environment maps render on change, not every frame.
- **Render on demand** (`frameloop="demand"`, `motion.md` §9). A still frame costs nothing; battery and thermals stay healthy on phones.

Geometry detail comes last, and usually goes *down*: shading (baked occlusion, normals) carries fine detail far more cheaply than vertices.

## 5. Offline preprocessing

If a minute of preparation saves milliseconds on every frame for every visitor, spend the minute: bake in a DCC tool (Blender, headless), decimate LODs, and compress (Meshopt for geometry; textures as below).

- **Budgets per asset, enforced.** The defaults are `motion.md` §9's (≤ ~1.5 MB GLB for a product model, textures ≤ 2048², 1024² on mobile). Enforce them per asset in a build script that **fails** when an asset is over.
- **Texture format by what is scarce.** In a real-time scene, GPU memory and upload time are the limit: use KTX2 (Basis Universal), which stays compressed on the GPU, where a WebP or JPEG is decoded to full RGBA (16 MB for one 2048² texture, before mipmaps). In a page viewer with a few textures, transfer size is the limit: use WebP (`motion.md` §9).
- **A repeatable pipeline before the second asset** (source → bake → LODs → validate → compress → budgets → hashed files → manifest → loader), never one-off exports.

## 6. Adaptive quality instead of a smaller design

- Tiers change **resolution, effects and tessellation, never the look**: the same lights, materials and composition on every tier, so the lowest tier still looks intentional.
- Start from a device guess (touch, memory), then **judge dropped frames against the display's own refresh**, only over runs of continuous frames, never in the first seconds after load or a tier change; step down, rarely up.
- Don't let a frame-rate monitor judge an on-demand renderer: idle gaps aren't slow frames.

## 7. After the product improves, the marketing must catch up

When the real product becomes better than the pages advertising it, replace old screenshots, demos and copy with captures from the **real** product (its own hero renders, same camera angles). Never fake the product in marketing images when the real thing is better (`imagery.md` "Other visual assets", `implementation.md` "Showing the product"). The same applies when a prototype replaces the original (`discovery.md` §5c).

### Hand-over from a page into the live 3D product

When a live 3D product exists, the marketing pages around it carry no WebGL (`motion.md` §9): they use stills rendered by the product and hand over to it. The strongest website → product moment is continuity: the picture they clicked becomes the thing they use. The principle is in `art-direction.md` §4 (Motion language); the recipe:

- Let the product's own content open from the page (a template, a saved design) and render each one from the **exact view the product opens on**. At capture time, also record where the subject sits in the still (project its framing points), so the still can later be laid over the live scene precisely.
- Give the page's still and the product's loading poster the same shared-element name (React `<ViewTransition name share>` or `view-transition-name`, `motion.md` §5), and use the **same image file** on both sides, warmed on hover/focus/touch together with the 3D code chunk, so the morph lands on a decoded image.
- **Don't start the 3D engine during the morph.** A shared-element morph animates width/height on the main thread, and engine start-up (module evaluation, context creation, shader compiles) blocks it: measured, a 0.56 s morph stretched to 3.8 s. Mount the canvas when the morph's animation finishes.
- When the live scene is built and steady, move/scale the poster onto the live subject's projected box (FLIP), then dissolve it. Hold the camera still at the poster's view until then, and start idle motion (none under reduced motion, `motion.md` §6) and bring in the tool panels only after (opacity only if panel boxes drive the camera framing).
- Replacing someone's work with a template must be undoable (push it through the same undo history), and the entry URL is rewritten so a reload reopens their work, not the template.
- Verify with a filmstrip from a compositor screencast (CDP `Page.startScreencast`, `motion.md` §7); ordinary screenshots don't capture view transitions. Time it on a production build from the navigation commit.

## 8. Pick motion and 3D tools per effect

The tool for each effect, with its size and licence, is in `motion.md` §8–§9. Don't turn a site into one canvas to prove it can be done.

## 9. Parallelise the R&D

A graphics pass contains several independent questions (rendering techniques, materials, mobile limits, asset pipeline, next-generation renderer, a code audit, competitor teardown). Give each to a side agent with a distinct mission, a findings file to write and a short reply to return; keep conclusions and decisions in the main thread, and raw research in the project's `discovery/raw/` (listed in `.gitignore`, never shipped). Stagger the agents if the plan has usage limits: several heavy agents at once can exhaust a session window.
