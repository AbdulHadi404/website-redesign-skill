<!-- Stream S3, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S3-assets-and-3d-pipeline/. The skeptical review is in S3-assets-and-3d-pipeline.review.json. -->

# S3: Asset sources and licensing, sprite pipelines, glTF/3D optimisation

## What the skill already knew (one short paragraph)

This stream builds on the skill's licence method and leaves it unchanged. That method uses classes A–D. The shipped LICENSE outranks the package's licence field. A wrapper's licence is not the artwork's licence. Every asset goes in `CREDITS.md` (`resources/README.md`, `imagery.md`).

For 3D, `motion.md` §9 and `realtime-3d.md` §3–§6 already cover:
- poster first, load late;
- gltf-transform, with textures making up most of the weight (3.7 MB → 532 KB with 1K WebP);
- "Meshopt by default" (7 KB decoder against Draco's 73 KB);
- a product GLB of about 1.5 MB or less, with textures ≤ 2048² (1024² on phones);
- KTX2 when GPU memory is scarce, WebP when transfer is;
- baked occlusion and budgets enforced in the build.

The licence line names only Poly Haven, Kenney, Sketchfab, Khronos and Shadertoy.

Nothing below was in the skill or the stage-2 baseline unless it says "confirms":
- sprites (DOM frame animation, 9-slice, atlases);
- game-asset sources;
- gltf-transform commands and KTX2 settings;
- instancing, LOD and Blender export practice;
- a script that inspects a model.

## Findings (tagged; numbers where they exist)

**Source of the numbers.** `[L]` means `research/stage2/experiments/S3-assets-and-3d-pipeline/results.json`, printed by `node tables.mjs <section>`.

**Environment.** Headless Chromium 141, three.js 0.186.1, gltf-transform 4.5.1, KTX-Software 4.4.2, PixiJS 8.21 and bpy 4.5.14, on 4 CPUs shared with other agents (load average 5–12 during the glTF run).

**Timing protocol (revised after review).**
- All variants of a model are measured in one session. The 5 runs are interleaved, and the order rotates each run.
- Timings are given as median (min–max), and the per-run samples are stored.
- Absolute times move with machine load. The reviewer's re-run halved some absolute times, so only comparisons inside one table are meaningful.

**Rendering.**
- WebGL runs on SwiftShader, which is the CPU. GPU-bound frame times are pessimistic and can only be compared with each other.
- The WebGL context reports EXT_texture_compression_bptc as present and WEBGL_multisampled_render_to_texture as absent [L `gltf.env.webgl`].
- Canvas 2D was forced to CPU raster.

### A. Licensing matrix (item 1)

The reviewer re-ran this and it matched. It is unchanged.

| Source | Licence (unit) | Commercial | Attribution (form) | Redistribute / public repo | Modify | Client project | AI clause | Risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Kenney** | CC0 per pack; starter-kit *code* is MIT | yes | not required | yes | yes | yes | none | low | [V] pack `License.txt` (in excaliburjs/Excalibur @760a28a); KenneyNL/Starter-Kit-3D-Platformer README @3fa8a04 |
| **Quaternius** | CC0; paid tiers add files under the same CC0 | yes | not required | yes | yes | yes | none | low | [V] pack `License.txt` (arn0ld87/Luther-Game @c9a068d); [S] itch.io/FAQ for the paid tiers |
| **Poly Haven** | CC0 | yes | not required | yes | yes | yes | none | low | [V] Poly-Haven/polyhaven.com @b1a6aa1 `license.json`; the site's code is AGPL, which does not cover the assets |
| **ambientCG** | CC0 | yes | not required | yes | yes | yes | none | low | [S] docs.ambientcg.com/license |
| **OpenGameArt** | **per asset**: CC0, CC BY 3/4, **OGA-BY 3.0**, CC BY-SA, GPL 2/3; often multi-licensed | yes (never NC) | BY/OGA-BY/SA/GPL: credit **every** author; LPC-style packs ship a credits file per asset | CC0/BY/OGA-BY yes; SA/GPL only under the same licence | SA/GPL: the modified file stays SA/GPL | CC0/BY yes; SA/GPL only unmodified, with a recorded decision | none | CC0/BY low · long credit chains medium · SA/GPL **high** | [V] ElizaWy/LPC README @f07f7f5; [S] OGA-BY FAQ, forum |
| **itch.io** | **per creator** (dropdown or custom text) | usually | per text | custom texts often **forbid redistributing raw files** | usually | per text | often **no AI** | medium–high | [S] itch.io forum; itch.io/blog/929708 |
| **Sketchfab** | **per model**: CC0, BY, BY-SA, BY-ND, BY-NC(-SA/-ND), Free Standard, Standard, Editorial | CC0/BY/SA/Standard yes; NC/Editorial no | CC BY: author, link, licence | **Standard: no access "as a stand-alone file"** (a public web viewer is a grey zone) | ND: technical changes only | CC0/BY yes; Standard only with the seller's OK | **NoAI tag** | CC0/BY low · Standard/ND medium · NC/Editorial class D | [S] sketchfab.com/licenses; Sketchfab blog; Download API guidelines |
| **Poly Pizza** (incl. the Google Poly archive) | CC0 or CC BY 3.0 | yes | BY: author, link, licence | yes | yes | yes | none | low–medium | [S] poly.pizza |
| **Mixamo** | Adobe terms, Adobe ID | yes | not required | **no raw redistribution** | yes | yes | no bulk ML download | medium | [S] Adobe Mixamo FAQ |
| **Smithsonian 3D** | CC0 **only where marked** | yes | no | yes | yes | yes | none | low; watch trademarks and cultural sensitivity | [V] Smithsonian/OpenAccess README @c2ac3e2; [S] FAQ |
| **NASA 3D Resources** | "free and without copyright"; **no LICENSE file**; 257 GLBs | yes | no; **no insignia or implied endorsement** | yes | yes | yes, without insignia | none | low–medium | [V] nasa/NASA-3D-Resources @11ebb4e (`licences.mjs`) |
| **Khronos glTF-Sample-Assets** | per model: 150 models = 80 CC0, 57 CC BY 4.0, 4 mixed, **9 restricted**; 30 carry trademark notices | per model | per model | per model | per model | **no**: recognisable test assets, lab use only | none | low for lab use | [V] census @f36bfda (`licences.mjs`) |
| **Blender** | GPL program; outputs belong to the user | yes | n/a | n/a | n/a | yes | n/a | none (distributed add-ons are GPL) | [V] blender @0ae04d3 `copyright.txt` |
| **Rive community files** | CC BY; runtime MIT | yes | author + link | yes | yes | yes | none known | low–medium | [V] rive-wasm LICENSE; [S] marketplace docs |
| **LottieFiles free** | Lottie Simple License | yes | no | yes, **same terms, no added restrictions** | yes | yes | not stated | low–medium | [S] lottiefiles.com/page/license |
| **Freesound** | per sound: CC0, BY 4.0, **BY-NC 4.0**, Sampling+ | CC0/BY | "'title' by user (URL), licence" | per licence | yes | CC0/BY | none | BY-NC class D; Sampling+ class C | [V] MTG/freesound @327cefd `licenses.json` |
| **Spine example art** (spineboy) | **none stated** | — | — | — | — | **no** (lab only) | — | class D | [V] spine-runtimes @7ce5d0d `examples/readme.txt` |

The nine restricted Khronos models are DamagedHelmet (CC BY-NC), Sponza (CRYENGINE), Duck (SCEA), BrainStem (Poser EULA), EnvironmentTest (Adobe Stock), PlaysetLightTest (BY-NC-SA), VirtualCity (3DRT) and two Stanford Dragons.

Further licence findings (unchanged):
- **Web delivery exposes the raw file.** A web viewer sends the GLB or sprite sheet to every visitor. "No stand-alone redistribution" terms (Sketchfab Standard, many itch.io texts, Mixamo) were written for compiled games, so on the web they must be cleared with the seller. [S + K]
- **CC BY 4.0.** §2(a)(4) allows "technical modifications necessary" without creating Adapted Material. §3(a)(1)(B) requires stating that the work was modified. §3(a)(2) accepts a link to a credits page. [V] `LICENSES/CC-BY-4.0.txt` in the Khronos repository
- **Spine.** "Each user of the Products must obtain their own Spine Editor license." [V] spine-runtimes LICENSE
- **DragonBones and Rive runtimes** are MIT. DragonBonesJS's last commit was in 2025-05. [V]
- **Tile editors.** The Tiled editor is GPL, while its libtiled and TMX libraries are BSD. LDtk is MIT. [V]

### B. Sprites and 2D (item 2)

All rows are [L `sprites`] from this session's re-run, as median (min–max) of 5 runs.

**CSS frame animation (12 sprites).** The table measures main-thread cost and composited-layer memory (CDP LayerTree, layer area × 4 B/px, which is an upper bound on raster memory).

| Technique | Paints/s | Main thread ms/s | Layers drawing content | Layer area |
| --- | --- | --- | --- | --- |
| `background-position`, 1280×768 grid (60 frames, 2 axes) | 100 | 23.6 (21.4–29.3) | 2 | 1.5 MB |
| `transform` on an `<img>`, the same grid | 0 | 0.7 (0.4–1.2) | 14 (12 of them 1280×768) | **48.7 MB** |
| `background-position`, 1280×128 one-row strip (10 frames) | 40 | 13.9 (12.6–16.3) | 2 | 1.5 MB |
| `transform` on an `<img>`, the one-row strip | 0 | 0 | 14 (12 of them 1280×128) | **9.3 MB** |

Each transform-animated `<img>` becomes its own composited layer the size of the **whole** image, not the size of its 128 px window. This measurement is new after review.
- `transform` removes the repaints, but costs about 3.9 MB of layer memory per sprite with a full grid.
- A one-row strip cuts that 5×.
- `background-position` costs about 2 % of one main thread for 12 sprites.

**Atlas vs separate files (60 frames of 128 px).**
- **Load, phone profile (9 Mbps / 100 ms).** Over HTTP/1.1, the 60 WebP files took 1,163 (1,150–1,183) ms and one atlas 200 (195–201) ms. Over HTTP/2 the files took 321 (301–369) ms and the atlas 202 ms, so most of the request penalty disappears.
- **Decode (warm).** Files took 25–62 ms and the atlas 3–20 ms.
- **Decoded memory.** The trimmed atlas takes 1.82 MB, against 3.93 MB for the files or an untrimmed grid.

**Drawing 300 animated sprites.** These are CPU-raster numbers only.

| Engine | Trimmed atlas | Untrimmed grid | 60 files |
| --- | --- | --- | --- |
| Canvas 2D (CPU raster), ms per frame | 7.2 (7.0–8.0) | 18.4 (17.7–20.5) | 18.6 (18.4–19.6) |
| PixiJS on SwiftShader, ms per frame | 91.6 (79–133) | 245 (225–341) | 241 (211–354) |
| PixiJS CPU submit, ms | 0.4 | 0.3 | 0.55 (7 draw calls) |

Both engines rasterise on the CPU here. The trimmed atlas is faster because it fills fewer transparent pixels, which costs little on a real GPU. This can **not** become a rule about drawing speed.

What holds:
- A trimmed atlas halves decoded memory (1.82 vs 3.93 MB).
- 1 vs 7 draw calls cost about 0.15 ms of CPU submit.
- GPU draw cost was not measured.
- Pixi's absolute times vary about 2× between sessions (this run 92/245/241 ms; earlier 115/255/248; the reviewer's 49/136/136).

**Formats for the atlas** (unchanged, deterministic):

| Format | Size | PSNR | Decode |
| --- | --- | --- | --- |
| PNG32 | 254 KB | lossless | 5.4 ms |
| PNG8 | 85 KB | 45.6 dB | 3.0 ms |
| WebP q85 | 86 KB | 36.2 dB | 12.5 ms |
| AVIF q60 | 62 KB | 41.1 dB | 20.1 ms |

WebP smears the colour of saturated edges (`shots/sprite-format-edges.jpg`).

**Atlas bleeding** (unchanged, deterministic):
- A tight atlas: 5.4–5.7 % of pixels pick up a neighbour's colour at sub-pixel positions.
- 2 px transparent padding: the same pixels go dark instead.
- Extrude by 1 px: clean without mipmaps, 17 % bleed with mipmaps.
- **Extrude by 2 px: 0 % in every case.**
- Canvas 2D bleeds exactly like WebGL. Nearest filtering at 2× never bleeds.

**Tile maps** (game-like scope):
- Canvas 2D: 16×16-tile cached chunks cost 0.5 ms per frame, against 3.6 ms for drawing each tile.
- Pixi: 65,536 culled sprites cost 13.9 ms of CPU per frame, against 0.65 ms for a pool of the 1,050 visible tiles.

**9-slice.** CSS `border-image: url(panel.png) 28 fill / 28px stretch` matched Pixi's `NineSliceSprite` pixel for pixel at 5 sizes (0 % of pixels differ).

**Skeletal (Spine) vs baked frames:**
- **Payload.** Spineboy's 11 animations (14.9 s in total) take 308 KB. **One** 0.67 s run cycle baked into frames takes 928 KB as PNG, 227 KB as WebP or 148 KB as AVIF, and decodes to 4.3 MB.
- **CPU for 200 skeletons.** The skeleton update costs 3.9 ms per frame, against 0 for frames. Loading and parsing takes 42 ms.

**Runtime payloads.** Gzip is at level 9; brotli is in brackets.

| Runtime | JS gzip | WASM gzip |
| --- | --- | --- |
| Pixi 8.21 (sprites) | 170 KB (140) | — |
| Pixi + spine-pixi-v8 | 228 KB (187) | — |
| Pixi + DragonBones | 214 KB (176) | — |
| Rive canvas 2.43.1 | 57 KB | 814 KB (628) |
| Rive canvas-lite | 50 KB | 365 KB (279) |
| Rive webgl2 | 58 KB | 918 KB (717) |
| lottie-web full / light | 79 / 49 KB | — |
| dotLottie 0.80.0 | 14 KB | 499 KB (388) |

canvas-lite drops Rive Text and Audio. [V] its README

### C. glTF/3D pipeline (item 3)

**How accurate model.mjs is (reworded after review).** The script's triangle and draw-call counts equal three.js r186 `renderer.info`. Its texture bytes equal the `texStorage2D` allocations three.js requests: the WebGL2 context is wrapped and allocations are summed per GL texture, so this is measured, not the same formula on both sides. The difference is under 0.001 %. [L `gltf.modelScriptCheck`, `modelscript`] It holds on:
- all **72** lab variants of the 4 models;
- the reviewer's 15 other Khronos models;
- **22 Khronos models picked after the fix** (glass, volume, iridescence, sheen, clearcoat, unlit, dispersion, diffuse transmission, texture transforms, negative scale);
- the 7 files model.mjs's own pipeline produced.

That is 44 of 44 files outside the lab set.

The rules come from three.js source [V]:
- **Double-sided transparent materials.** BLEND + doubleSided is drawn twice (`WebGLRenderer.js` `renderObject` L2165).
- **Transmission pass.** When a material transmits (`transmissionFactor` > 0, GLTFLoader L1176; `WebGLRenderLists` L130), the opaque objects are drawn again. Each double-sided transmissive primitive gets one more back-face draw when WEBGL_multisampled_render_to_texture is missing (L2081–2091). That condition depends on the device: the extension is absent here, and on some Android GPUs it exists.
- **Physical-material maps** load only when their factor is on (`WebGLPrograms` L141–165). Unlit materials use only the base colour.
- **Spec/gloss** is not in GLTFLoader's extension list at all.

The limits:
- "Texture memory" is the allocation three.js asks for. Driver padding is invisible to WebGL.
- KTX2 at 1 B/px assumes BC7 or ASTC; BPTC is present here.

**KTX2 GPU memory** on desktop is 1 B/px. ETC1S and UASTC transcode to BC7: allocations used formats 0x8E8C/0x8E8D, and the 1K DamagedHelmet came to 6.99 MB. [L allocation; V `KTX2Loader.js`] Phones that take ETC1S as ETC1 use 0.5 B/px, which is S11's figure. JPEG and PNG upload as RGBA8 or SRGB8_ALPHA8 at 4 B/px, JPEG included.

**Transfer, load and quality by variant.**
- **Load** is fetch + parse + geometry and texture decode, in ms, median (min–max) of 5 runs in one session.
- **Close-up PSNR** compares with the original render, over the whole view, with the camera 2.5× closer.
- [L `gltf`, `closeup`]

| Model | Variant | File | Load ms | Texture GPU | Close-up PSNR |
| --- | --- | --- | --- | --- | --- |
| DamagedHelmet (1 mesh, 5 × 2K JPEG) | original | 3.77 MB | 229 (187–364) | 112 MB | ∞ |
| | meshopt / Draco | 3.40 / 3.29 MB | 219 (187–339) / 210 (184–318) | 112 MB | 36.7 / 38.0 |
| | 1K WebP / 1K AVIF | 922 / 775 KB | 64 (51–151) / 74 (59–104) | 28 MB | 29.2 / 30.0 |
| | 1K KTX2 (UASTC normal and ORM, ETC1S colour) | 2.57 MB | 407 (328–496) | **7 MB** | 30.0 |
| | 1K KTX2, ETC1S everywhere | 1.30 MB | 278 (252–305) | 7 MB | 26.8 |
| | model.mjs pipeline (1K WebP, meshopt) | **547 KB** (505 KB brotli) | ≈ 74 (62–141) | 28 MB | 28.7 |
| | 2K KTX2 | 7.83 MB | 555 (502–818) | 28 MB | 35.6 |
| FlightHelmet (6 meshes, 15 × 2K PNG) | original | 48.4 MB | 797 (614–1,092) | 285 MB | ∞ |
| | 1K WebP / 1K AVIF / 1K KTX2 | 4.58 / 4.00 / 11.16 MB | 194 / 195 / 579 | 84 / 84 / 21 MB | 37.3 / 39.2 / 39.3 |
| | model.mjs pipeline, **512 WebP** / `--ktx2` (1K KTX2) | 1.11 / 9.44 MB | — | 21 / 21 MB | **33.1** / 37.7 |
| Fox (skinned, 3 clips) | original / clean / meshopt / Draco | 164 / 100 / **67** / 81 KB | 35–38 in every case | 5.6 MB | ∞ / 49.9 / 44.5 / 44.4 |
| A Beautiful Game (chess, 33 × 2K JPEG, glass) | original | 43.0 MB, 82 calls, 2.96 M triangles | 2,527 (929–4,047) | 738 MB | ∞ |
| | meshopt / Draco | 21.4 / 21.1 MB | 2,561 (932–5,717) / 3,966 (1,362–5,214) | 738 MB | 45.2 / 46.3 |
| | 1K WebP / 1K KTX2 | 25.8 / 37.4 MB | 496 (305–1,482) / 1,117 (882–1,751) | 185 / 46 MB | 39.2 / 39.2 |
| | `instance --min 2` | 43 MB, **28 calls** | — | — | 65.5 |
| | `optimize` 1K WebP (defaults) | 4.85 MB, 28 calls | 309 (219–643) | 185 MB | **30.7 (glass pawns wrong)** |
| | model.mjs pipeline (`--instance false`) | 5.70 MB, 42 calls | — | 185 MB | 32.8 |

Notes on the table:
- **Original vs clean.** These files hold the same content. In one session they load alike (FlightHelmet 797 vs 735 ms, with overlapping ranges). The earlier 2× gap came from measuring them in different sessions.
- **Load spread.** Loads on the chess set spread 3–6× from run to run on this machine.

**Phone quality cost of 512 WebP** (new after review). Against the original, model.mjs's 512 WebP FlightHelmet gives:
- normal framing: 39.3 dB (1K WebP: 46.7 dB; `--ktx2`: 40.5 dB);
- close-up: 33.1 dB, with 0.78 % of the view changed (1K WebP: 37.3 dB; `--ktx2`: 37.7 dB).

So halving textures is a GPU-memory choice with a visible cost at hero size. [L `closeup.pipelineOutputs`]

**Textures and geometry:**
- Textures make up 85 % of DamagedHelmet's bytes and 93 % of FlightHelmet's, while geometry makes up 56 % of the chess set's. This confirms the skill's claim and adds its exception, dense multi-mesh scenes.
- Geometry compression alone saved 10 %, 5 % and 50 % respectively.

**KTX2 trades transfer for GPU memory:**
- At the same resolution, it costs 1.4–2.8× the file size of WebP (2.3–3.6× after brotli) and saves 4× GPU memory.
- UASTC normal and ORM maps take most of the bytes.
- The Basis transcoder adds 217 KB brotli (263 KB gzip). [L `decoders`]

**`optimize --texture-compress ktx2` is impractically slow here.** It runs UASTC at quality 4. [V gltf-transform `cli.ts`] One 1K texture was still encoding after 10.5 min. The explicit `uastc --level 2 --rdo --zstd 18`, then `etc1s --quality 255`, took 35 s for 5 textures. [L]

**The ktx2-encoder README defaults tag data maps as sRGB.** The defaults are `isInputSRGB: true` and `isSetKTX2SRGBTransferFunc: true`. [V `dist/utils.js`] three.js trusts the header. [V `KTX2Loader.parseColorSpace`, `GLTFLoader.assignTexture`] The result is 13.9 dB close-up and 43 % of pixels changed. [L] Set both flags to false for data slots. model.mjs detects this from the KTX2 DFD.

**Draco vs meshopt (reworded after review; decode newly measured without textures)** [L `gltf` geo-only, `modelcheck.otherCodec`, `decoders`]:
- **Transfer size is mixed.** Geometry only, brotli:
  - Draco / meshopt: DamagedHelmet 76 / 143 KB, FlightHelmet 511 / 478 KB, chess 1,050 / 1,168 KB, Fox (with animation) 31 / 17 KB.
  - Whole pipeline outputs, brotli: DamagedHelmet 437 / 505 KB, FlightHelmet 936 / 912 KB, chess 4.21 / 4.23 MB.
  - Draco wins on a dense single mesh by about the size of its extra decoder (52 KB).
- **Decode speed, geometry only.** Draco was slower on all 4 models with no overlap between ranges:
  - cold (first load on a page, including worker start and WASM compile): 30–423 ms vs 18–61 ms;
  - warm (second load): 22–215 ms vs 8–45 ms.
- **Decode, full models.** With textures, the difference was inside the run-to-run spread. The earlier claim "Draco slower in every model", made from full-model loads, is withdrawn.
- **Threads.** Draco decodes in a worker pool (`DRACOLoader` workerLimit 4). Meshopt decodes on the main thread unless `MeshoptDecoder.useWorkers(n)` is called. [V `meshopt_decoder.module.js` L182–190] On the chess set that is a 45–61 ms main-thread task. Using workers was not measured.
- **Animation.** Meshopt compresses animation (Fox animation data 28 KB → 8.6 KB); Draco does not.
- **What "meshopt by default" rests on:** a decoder of 7 vs 59 KB brotli, faster decode, and animation compression. It does not rest on transfer size.

**Re-encoding already-compressed input (new after review).** gltf-transform decodes Draco on read and re-encodes it at its own defaults on write: 14-bit positions, 10-bit normals, 12-bit UVs, speed 5. [V `@gltf-transform/extensions` DEFAULT_QUANTIZATION_BITS] On the Khronos KTX2 + Draco chess set, model.mjs's pipeline gave: [L `modelcheck`]
- with `--compress draco`: 12.11 MB → 12.88 MB (geometry 0.73 → 1.51 MB, even though simplify cut triangles 68 %);
- with meshopt: 13.79 MB.

Separately, **any** CLI step after meshopt drops it. `copy` alone took Fox from 73 KB to 84 KB, and the extension was gone. [L, confirms the reviewer]

**`optimize` defaults can break a scene visibly** (unchanged: isolate, deterministic). On the chess set, `optimize` gave close-up PSNR 30.7 with the glass pawns darkened. Turning each default off in turn (textures untouched) gives:

| Variant | % of view | PSNR |
| --- | --- | --- |
| everything on | 0.307 | 35.6 |
| Draco instead of meshopt | 0.093 | 40.3 |
| no instancing | 0.11 | 39.8 |
| no instancing, no simplify | 0.008 | 48.2 |

The cause:
- Quantization moves each mesh's scale into the instance SCALE attribute. [V `quantize.ts`]
- three.js scales transmission thickness by `modelMatrix` only. [V `transmission_pars_fragment` L121–133]
- With model.mjs's `--instance false`, the close-up improves to 32.8 dB; the rest of the gap is simplify.

**Other `optimize` defaults:**
- Instancing starts at 5 copies. `--instance-min 2` cut chess geometry from 3.01 MB to 1.85 MB.
- Simplify at error 1e-4 is harmless on dense meshes but hurts low-poly ones (Fox 576 → 486 triangles, close-up 32.6 dB).
- Join, flatten and palette break code that addresses parts by name. [L; V `--help`]

**Three more pipeline facts:**
- LOD is in neither the Blender exporter's extension list nor GLTFLoader's (no MSFT_lod), so use separate files plus `THREE.LOD`. [V]
- three.js r186 reads KHR_meshopt_compression, but gltf-transform 4.5.1 writes only EXT_meshopt_compression. [V]
- Spec/gloss materials render untextured in three.js; `gltf-transform metalrough` fixes them. On SpecGlossVsMetalRough: 9.98 MB → 171 KB, and the model counts match three.js. [L `modelcheck`, `modelscript`]

### D. Blender pipeline (item 5; bpy 4.5.14, exporter 4.5.51)

This section is unchanged: the reviewer's exports were identical.
- **Instancing.** 24 cups exported as copies: 168 KB and 24 draw calls. Linked duplicates: 10 KB and still 24 calls. With GPU Instances on (EXT_mesh_gpu_instancing): 10 KB and 1 call. Requirements: mesh children of one parent, shared mesh data, no per-instance material. [L; V glTF-Blender-IO docs @093ad93]
- **Baked AO.** Cycles on the CPU at 1024 px and 32 samples took 13–18 s across two runs (stream vs reviewer). The image goes to the `Occlusion` socket of a "glTF Material Output" group; glTF reads the R channel.
- **Baked lighting.** 36.8 s. It exports as KHR_materials_unlit, which is the cheapest runtime shading but static. Grain is visible at 32 samples.
- **Images.** Export PNG and compress later: AO was 879 KB as PNG, 366 KB with the exporter's WebP, 398 KB as JPEG and 158 KB after `optimize --texture-compress webp`. The exporter's WebP has no fallback unless you tick it.
- **Geometry.** The exporter's Draco gave 32 KB. From the 232 KB plain export, gltf-transform gave 27 KB with Draco and 58 KB with meshopt (brotli 23.5 vs 29.6 KB). Blender 4.5 has no meshopt export.
- **LOD.** Decimate with Apply Modifiers: 125 KB / 4,438 triangles at 0.5, and 54 KB / 1,774 at 0.2.
- **Animation.** Sampling is on by default: a linear orbit exported 121 keys, and `resample` cut it to 5. Only active or NLA-stashed actions export.
- **Lights and data.** Use Lighting Mode "Standard" to match three.js. Custom properties export as `extras`. The format is +Y up.

### E. When polished 2D/2.5D beats poor 3D

- **Bytes** (FlightHelmet turntable) [L `turntable`]:
  - 36 frames at 480×360 cost 180 KB as AVIF, or 160 KB as one sheet (24.9 MB decoded).
  - At 2× they cost 466 KB, but holding all 36 frames decoded takes 99.5 MB, so decode lazily.
  - The live alternative costs 169 KB of gzip JS, a 1.1–2.0 MB GLB and 21–84 MB of GPU memory.
- **Risk.** Offline renders need no shader compile. The first live frame here took 2.0–17.4 s on SwiftShader [L `gltf` firstFrameMs; pessimistic].
- **Examples** [S]: Apple scrubs image sequences on a canvas (CSS-Tricks: 65 frames, 15.2 MB of PNG, which is the weight trap). Duolingo uses Rive state machines with files under 1 MB.
- **When live 3D wins** [reasoning]: two or more degrees of freedom, or combinatorial configurations (36 angles × 12 colours × 3 materials = 1,296 frames).

## Experiments (what you built, how to re-run, results tables)

**Folder:** `research/stage2/experiments/S3-assets-and-3d-pipeline/`. It is 1.5 MB without node_modules; `shots/` is 744 KB.

**How to re-run:**
- Everything: `npm install && node run.mjs`. It takes about 3 h and writes `results.json`.
- Tables: `node tables.mjs [sprites|gltf|decode|modelscript|closeup|isolate|modelcheck|turntable|blender|licences]` prints every table in this report, with median (min–max).

**Runners:**
- **`fetch-assets.mjs`**: 74 pinned third-party files (SHA-256 in `fetch-pins.json`) go to `/tmp/s2-S3/cache`: the 31 original files, 21 files for the reviewer's model set, and 22 held-out Khronos models. New pins are added without rewriting old ones.
- **`licences.mjs`**: unchanged.
- **`run-sprites.mjs`**: every summary now stores per-run samples and min–max. The CSS test adds one-row-strip variants and the CDP LayerTree measurement.
- **`run-gltf.mjs`**, with `gltf/pipeline.mjs`, `gltf/viewer.js` and the new `gltf/strip-textures.mjs`:
  - Variants per model: 16–19, including 3 new texture-free ones (`geo-only`, `geo-only draco`, `geo-only meshopt`).
  - Protocol: all variants measured in one session, order rotated per run, samples kept. `--only-variants` and `--build-only` affect building only.
  - The viewer wraps the WebGL2 context to record texture allocations. `repeat` times a warm second load.
- **`run-modelscript.mjs`** (new): model.mjs vs three.js on 44 files it was not built on.
- **`run-modelcheck.mjs`**: runs model.mjs's pipeline exactly as printed. New inputs: KTX2 + Draco chess and SpecGlossVsMetalRough. Each case also runs with the other codec and records brotli and geometry bytes.
- **`run-closeup.mjs`**: also renders the pipeline outputs next to the lab variants, at both framings.
- **`run-isolate.mjs`, `run-turntable.mjs`, `run-blender.mjs`**: unchanged.

**The pipeline model.mjs prints, run as printed** [L `modelcheck`]:

| Model / flags | Bytes (brotli after) | Geometry stored | Texture GPU | Triangles drawn | Draw calls | Still over |
| --- | --- | --- | --- | --- | --- | --- |
| DamagedHelmet | 3.77 MB → 547 KB (505) | 559 → 182 KB | 112 → 28 MB | 15,452 | 1 → 1 | none |
| FlightHelmet | 48.4 MB → 1.11 MB (912) | 3.23 MB → 660 KB | 285 → 21 MB | 188,708 → 175,778 | 11 → 11 | triangles (glass pass) |
| FlightHelmet `--ktx2` | → 9.44 MB | → 660 KB | → 21 MB | → 175,778 | 11 → 11 | transfer, triangles |
| Chess `--tier scene` | 43.0 MB → 5.70 MB (4.23) | 24.0 → 3.86 MB | 738 → 185 MB | 2.96 M → 1.07 M | 82 → 42 | triangles |
| Chess KTX2 + Draco `--tier scene` | 12.11 → **12.88 MB** | 0.73 → 1.51 MB | 185 MB | 2.96 M → 0.94 M | 82 → 42 | transfer (textures; fix at source) |
| SpecGlossVsMetalRough | 9.98 MB → 171 KB (149) | 150 → 33 KB | 112 → 45 MB | 9,028 | 4 → 4 | none |

**Geometry decode without textures** [L `decode`], in ms:

| Model | Draco cold / warm | Meshopt cold / warm | Uncompressed cold |
| --- | --- | --- | --- |
| DamagedHelmet | 64 (43–84) / 34 (31–44) | 18 (13–33) / 9 (9–12) | 22 |
| FlightHelmet | 100 (86–158) / 45 (29–73) | 22 (21–32) / 16 (11–24) | 34 |
| Fox | 30 (25–33) / 23 (19–26) | 20 (14–21) / 8 (8–9) | 21 |
| Chess | 423 (289–548) / 215 (198–394) | 61 (55–163) / 45 (33–119) | 172 |

## Decision guidance for the skill (concrete rules, trees, checklists, script usage — and which skill file/section each belongs in; say "replaces", "extends" or "new")

**G1. `references/resources/assets.md`: NEW section "3D models, PBR textures, HDRIs, sprites, 2D animation, sound"**, holding the matrix above in condensed form.

Order of preference:
1. The brand's own geometry: SVG drawn into frames, or Blender primitives baked into a GLB.
2. CC0 libraries: Poly Haven, ambientCG, Kenney, Quaternius, CC0-marked Smithsonian items, NASA models without insignia.
3. CC BY sources, with a credits page.
4. Store licences, only with the seller's written OK for a public web viewer, and never in a public repository.

**Avoid a source when:**
- you cannot link the asset's own page showing its licence;
- it is NC, ND (and you will adapt it), Editorial, "personal use only", or states no licence;
- it is SA or GPL and you will modify it or make it part of the brand's identity;
- it carries "no stand-alone redistribution" terms and will be served publicly or committed to a public repository;
- it depicts a trademark or a real person, or it is a recognisable demo asset.

**G2. `references/resources/README.md`, licence classes: EXTENDS.**
- A: Poly Haven, ambientCG, Kenney, Quaternius, NASA 3D (minus insignia), CC0-marked Smithsonian 3D, LottieFiles free (note its same-terms clause).
- B: CC BY models (Poly Pizza, the Google Poly archive, Sketchfab CC BY), OGA-BY, Rive community files, Freesound CC BY.
- C: OpenGameArt BY-SA and GPL; Sketchfab Standard, itch.io custom licences and Mixamo when the file will be public; the Spine runtimes (every user needs an Editor licence).
- D: Sketchfab Editorial and NC, Freesound BY-NC, anything with no stated licence.
- Add one line: a gltf-transform output is "modified" under CC BY 4.0 §3(a)(1)(B), so the credit must say so.

**G3. `imagery.md` "Localise and process", the CREDITS bullet: EXTENDS** with this template (columns and two examples unchanged).

```markdown
| Asset (path) | Title — author(s) | Asset page (not a mirror) | Licence + version | Class | Changes made | Credit shown to visitors | Public repo OK? | AI / other clauses |
| public/models/fox.glb | "Fox" — PixelMannen (model); tomkranis (rig, animation) | github.com/KhronosGroup/glTF-Sample-Assets/tree/<commit>/Models/Fox | CC0 1.0 + CC BY 4.0 | B | gltf-transform optimize (meshopt, WebP 1024) | "Fox" by PixelMannen (CC0), rigged and animated by tomkranis (CC BY 4.0), modified | yes | none |
| public/models/chair.glb | "Chair" — <seller> | sketchfab.com/3d-models/<slug> | Sketchfab Standard | C | none | — | no (no stand-alone access) | NoAI tag |
```

**G4. `motion.md` §5 Techniques: NEW block "Frame (sprite) animation in the DOM"**, for a mascot, badge or loader. It is DOM-only; tile maps and runtimes are in G4b.
- **Use an `<img>` strip.** Put one row per element in an `overflow:hidden` box and animate `transform: translateX()` with `steps(n)`. That gives 0 paints, against 23.6 ms/s of main thread for `background-position` [L].
- **Keep each strip small** (one row, ≤ about 1–2K px wide). Every animated `<img>` becomes a composited layer the size of the whole image. For 12 sprites: 48.7 MB of layers with a 1280×768 grid, 9.3 MB with 1280×128 strips, 1.5 MB with `background-position` [L]. Check memory in DevTools Layers.
- **`background-position` + `steps()`** repaints every frame: 40–100 paints/s and 14–24 ms/s for 12 sprites, about 2 % of one thread [L]. It is acceptable for a few small sprites and costs no layer memory.
- **Reduced motion:** hold a representative frame (§6).
- **9-slice panels:** CSS `border-image: url(panel.png) <slice> fill / <width> stretch`. It is pixel-identical to a canvas 9-slice [L], so no library is needed.
- **Formats:** PNG8 for flat art (85 KB at 45.6 dB [L]); AVIF, or WebP (which smears saturated edges), for painted art with alpha; lossless PNG at integer scales for pixel art [K for `image-rendering: pixelated`, untested].
- **Separate frame files vs one sheet:** over HTTP/2 it barely matters (321 vs 202 ms); over HTTP/1.1 use one sheet (1,163 vs 200 ms) [L].

**G4b. Game-like scope: `realtime-3d.md` NEW §5c "2D sprite scenes inside a canvas"** and `resources/libraries.md` **EXTENDS** with a gated "2D canvas" line. Both open with the gate: *"only when the brief is a game-like signature experience; never for page decoration"*.
- **Atlas:** a trimmed atlas halves decoded memory (1.82 vs 3.93 MB) [L]. Extrude 2 px: padding alone makes dark seams, and 1 px still bleeds under mipmaps [L]. Use power-of-two sizes only if you mipmap. Step frames by elapsed time [K].
- **Tile maps:** cache chunks (0.5 vs 3.6 ms, Canvas 2D) or pool the visible tiles (0.65 vs 13.9 ms of CPU, Pixi) [L]. Author them in Tiled (editor GPL, libraries BSD) or LDtk (MIT) [V].
- **Runtime choice (gzip):**
  - Canvas 2D: 0 KB; 300 sprites drew in 7 ms on the CPU [L].
  - Pixi: 170 KB, for filters, blend modes or thousands of sprites. That Pixi is faster than Canvas on a real GPU is **[K]**: here it was slower on SwiftShader.
  - Spine: +58 KB over Pixi, a per-user Editor licence, 3.9 ms per 200 skeletons [L]. Worth it for a character with many animations.
  - DragonBones: avoid for new work (editor unmaintained [S]).

**G5. `motion.md` §8 table: EXTENDS; keep its min+gzip unit.**
- Add a row: "Rive without Text/Audio: `@rive-app/canvas-lite` 50 KB JS + 365 KB WASM (gzip -9, 2.43.1)" [L].
- The existing Rive (56 + 787 KB) and dotLottie (13.5 + 485 KB) figures are gzip. The lab's gzip -9 of the current versions is 57 + 814 KB (Rive canvas 2.43.1) and 14 + 499 KB (dotLottie 0.80.0). This is a version drift, not a correction; update the figures only with a version stamp. Brotli values, if added, go in their own labelled column.
- Pixi and Spine stay out of §8 (see G4b).

**G6. `motion.md` §9: EXTENDS with a degrees-of-freedom tree.**
- 0 DOF: video or frames.
- 1 DOF (turntable, scroll-scrub): pre-rendered frames, decoded lazily at 2×.
- 2 or more DOF, or combinatorial configuration: live 3D.
- Characters with states: Rive or Spine.

The "Assets" checkbox's numbers are **replaced** by "`realtime-3d.md` §5 and `scripts/model.mjs`". Its decoder figure becomes "meshopt 8 KB vs Draco 75 KB gzip (7 vs 59 brotli)". The "Licences" checkbox points to G1.

**G7. `realtime-3d.md` §5: EXTENDS with a recipe table and rules.**

| Asset | Run | Expect | Watch |
| --- | --- | --- | --- |
| Product or hero model, few PBR textures, on a phone | `node scripts/model.mjs hero.glb`, then the printed pipeline (e.g. `optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false`) | 3.77 MB → 547 KB (505 KB brotli); GPU 112 → 28 MB; close-up PSNR 28.7 dB | for a full-viewport hero on desktop, run `--tier desktop` or `--max-texture 2048`: the mobile tier flags any texture over 1024 px, and `--fail` fails the build |
| Many large textures, on a phone | the printed pipeline picks 512 WebP when 1K RGBA would exceed the GPU budget | 48.4 MB → 1.11 MB, 21 MB GPU; **PSNR 39.3 dB normal framing / 33.1 dB close-up** (1K WebP: 46.7 / 37.3) | halving is a phone GPU-memory choice with a visible cost at hero size. `--ktx2` keeps 1K detail at the same GPU memory (37.7 dB close-up) for 9.44 MB (8.5× the bytes) |
| KTX2 (GPU memory scarce, detail needed) | `resize` → `uastc --slots '{normalTexture,occlusionTexture,metallicRoughnessTexture}' --level 2 --rdo --zstd 18` → `etc1s --quality 255` → **then** `optimize --compress meshopt --texture-compress false` | 1 B/px on the GPU (BC7/ASTC) | 1.4–2.8× the file of WebP (2.3–3.6× after brotli); +217 KB transcoder; never `optimize --texture-compress ktx2`; with ktx2-encoder, set data slots linear |
| Skinned or animated character | `optimize --compress meshopt --simplify false` | 164 → 67–73 KB (animation compressed too) | never simplify low-poly models |
| Scene with repeated meshes | `--instance-min 2` | 82 → 28 draw calls; geometry 3.0 → 1.85 MB | **glass (transmission/volume): `--instance false`** (a three.js limitation with instanced glass) |
| Configurator (parts addressed by name) | `model.mjs --interactive` → `--join false --flatten false --palette false` | names kept | smaller savings |
| **File already Draco/meshopt (+ KTX2)** | optimise from the **uncompressed source**; model.mjs keeps `--compress draco` and warns | re-encoding grew the Khronos KTX2 + Draco chess set 12.11 → 12.88 MB (13.79 with meshopt) | any gltf-transform step re-encodes (14-bit defaults) or drops meshopt; compare the output's size with the input's |
| Spec/gloss model | the pipeline starts with `gltf-transform metalrough` (model.mjs flags spec/gloss as over budget) | 9.98 MB → 171 KB, renders textured | three.js ignores spec/gloss, so without conversion the model renders untextured |

Rules:
- **Meshopt by default**, because its decoder is 7 vs 59 KB brotli, geometry decode was 2.4–7× faster (texture-free copies), and it compresses animation. Draco can be smaller on a dense single mesh by about its extra decoder (52 KB), so it pays when several models share the decoder. Meshopt decodes on the main thread; for multi-MB geometry, consider `MeshoptDecoder.useWorkers(2)` [V API; benefit not measured].
- **`optimize` runs last**: a later CLI step drops meshopt.
- **Check every result**: every pipeline ends with `model.mjs out.glb` and a render diff at the page's camera, at hero size.
- **Self-host the decoders.**
- **LOD** = separate files + `THREE.LOD`.

**G8. `realtime-3d.md`: NEW §5b "Blender → glTF export checklist"**, the points in Finding D.

**G9. `resources/tools.md` scripts table and `performance.md` §1 "3D models and textures": EXTENDS.**
- `model.mjs` has no dependencies and needs no install step.
- It estimates what **three.js r186** will draw and allocate. It matched on 72 lab variants and 44 other files.
- In the build: `node scripts/model.mjs public/models/*.glb --fail [--tier mobile|desktop|scene] [--max-*] [--interactive] [--ktx2] [--json]`. Exit code 1 means over budget; 2 means a file could not be read.
- Tools: `npx @gltf-transform/cli@4.5.1`; KTX-Software ≥ 4.4.0, or `ktx2-encoder` with linear data slots.

**Script: `skills/website-redesign/scripts/model.mjs`** (498 lines; revised after review).
- **Reports:** sizes, requests, meshes, triangles (stored and drawn, including instances, two-pass double-sided BLEND and the transmission pass), draw calls, materials, the textures three.js will upload (per-image format, KTX2 codec and transfer, GPU bytes), animations, skins, morphs, compression, unused and duplicate data, and the decoders the page's loader needs.
- **Flags** each budget line with a fix.
- **Prints one pipeline**, in order, for the whole file.
- **Catches silent breakages:**
  - KTX2 data maps tagged sRGB;
  - glass on GPU instances;
  - missing `.gltf` files;
  - spec/gloss materials (new; flagged as over, converted first);
  - images three.js never reads (new);
  - already-compressed input (new; Draco kept, with a warning).
- **New JSON fields:** `doubleSidedBlendPrimitives`, `transmissionPassDraws`, `transmissionBackfaceDraws`, `specGloss`.

## Rejected ideas and why

- **`optimize --texture-compress ktx2`.** UASTC at quality 4 was still on one texture after 10.5 min.
- **ktx2-encoder with its README defaults.** Data maps come out sRGB, giving 13.9 dB.
- **KTX2 as the default for page models.** It costs 1.4–2.8× the bytes of WebP plus a 217 KB transcoder, and a smaller WebP reaches the same GPU memory.
- **Draco as the default.** Its decoder is 8× heavier, geometry decode was 2.4–7× slower, and it does not compress animation. Keep it for instanced glass, for Draco inputs, or where several dense models share the decoder. The earlier reason, "decode slower in every full model", is withdrawn: it was inside the noise.
- **Re-optimising an already-compressed file.** It grew in both codecs, so go back to the source.
- **`optimize` defaults on low-poly models and on instanced glass.** Both are measured regressions.
- **`background-position` as the only sprite method**, and a full grid sheet under `transform` (48.7 MB of layers). One sprite per tile. Separate frame files over HTTP/1.1.
- **One 2× sprite sheet for a turntable** (about 100 MB decoded).
- **Pixi for a handful of sprites** (170 KB gzip), and **any Pixi-vs-Canvas speed claim from this lab**: SwiftShader inverts it, and absolute times varied 2× between sessions.
- **Trimming as a GPU draw-speed rule.** It is a CPU-raster effect here; only the memory saving holds.
- **DragonBones for new work; Spine for a single loop.**
- **Treating SwiftShader or loaded-machine times as absolute.**
- **Committing third-party assets.** They are fetched and pinned instead; DamagedHelmet and spineboy renders stay out of the repository.
- **Testing Blender meshopt export and particles.** Not done.

## Open questions and limits of this evidence

- **No real GPU.** Not measured: upload stalls, KTX2's upload advantage, ETC1 at 0.5 B/px on phones, GPU fill rates (Canvas vs Pixi, trimmed vs untrimmed), and driver padding beyond what three.js allocates.
- **Layer memory is layer area × 4 B/px.** Chromium rasterises tiles only within its interest rect, so real raster memory can be lower. Phone GPU memory for these layers was not measured.
- **The double-sided-glass back-face draw depends on the device** (WEBGL_multisampled_render_to_texture). model.mjs counts the desktop case.
- **Meshopt with workers** was not measured. Neither was Draco's worker start-up on a phone CPU.
- **Draco quantization of third-party files.** The quantization is not recoverable from the decoded file, so model.mjs cannot re-encode at matching precision; hence the rule to go back to the source.
- **Timing noise.** Timings on this shared machine still spread 1.5–6× within a session on the chess set. Only in-session comparisons with non-overlapping ranges support conclusions: the texture-free decode table, the sprite load, and CSS paint/layer counts.
- **Vendor licence pages** were read through snippets only [S] (Sketchfab, itch.io, Mixamo, LottieFiles, Rive, ambientCG, OpenGameArt, Blender FAQ). The legal readings of "stand-alone redistribution" and CC 4.0 §2(a)(4) are [K].
- **Instanced glass** was tested only in three.js r186 (model-viewer uses three.js). AVIF-in-glTF fallbacks on old Safari, and Blender 5.x meshopt export, are untested.
- **Hero-size texture needs** (1K up to about 500 CSS px, 2K for full-viewport heroes) are derived from two models.

## Changes after review

1. **model.mjs accuracy claim (should-fix; agreed).**
   - Texture memory is no longer circular. The viewer now wraps the WebGL2 context and sums the `texStorage2D`/`texImage2D` allocations behind each material texture.
   - model.mjs now counts BLEND + doubleSided twice, adds a back-face draw per double-sided transmissive primitive (device-dependent, documented), gates transmission on `transmissionFactor` > 0, gates physical maps on their factors, and counts only the base colour for unlit.
   - Spec/gloss is now an **over** flag, its images are not counted, and the pipeline starts with `metalrough`.
   - All rules are cited to three.js source lines.
   - AlphaBlendModeTest (65/11), TransmissionTest (257,550/44) and SpecGlossVsMetalRough (6 images) now match. So do 22 held-out models chosen afterwards and 7 pipeline outputs: 44/44 (`run-modelscript.mjs`). The lab set is 72/72 on all three measures.
   - The row count is now stated: 72.
   - The report says what "match" means (the allocation three.js requests, desktop BPTC, MSRTT absent).
2. **Draco input (should-fix; agreed, with a correction).**
   - Added the KTX2 + Draco chess set to `run-modelcheck.mjs`, with the other codec run for every case.
   - Keeping Draco, as proposed, still grew the file: 12.11 → 12.88 MB, against 13.79 with meshopt. gltf-transform re-encodes at its 14-bit defaults [V].
   - model.mjs now keeps Draco for Draco input, adds `--texture-compress false` for all-KTX2 input, and warns to optimise from the source. The report adds that rule.
3. **Timing protocol (should-fix; agreed).**
   - `run-gltf.mjs` measures every variant of a model in one session, rotates the order and stores samples and min–max. `--only-variants` affects building only.
   - All 72 variants were re-measured, and every timing in this report comes from `tables.mjs`, with ranges.
   - The original-vs-clean "2×" disappeared in one session (FlightHelmet 797 vs 735 ms).
   - For the record, FlightHelmet's "original" is a GLB made by `copy`.
4. **Draco decode claim (should-fix; agreed).**
   - Withdrawn for full models: now 210 vs 219, 1,227 vs 916 and 3,966 vs 2,561 ms, with overlapping ranges.
   - Measured geometry decode on new texture-free variants instead: Draco was slower on all 4 with no range overlap (cold 30–423 vs 18–61 ms; warm 22–215 vs 8–45 ms).
   - Added that Draco runs in workers and meshopt on the main thread [V].
   - The meshopt default now rests on decoder size, decode speed and animation. Transfer is mixed (brotli table).
5. **Trimming claim (should-fix; agreed).** Restated as a memory and CPU-raster effect (1.82 vs 3.93 MB; about 0.15 ms of CPU submit for 1 vs 7 calls). Pixi ms/frame is removed from the guidance. GPU draw cost is marked as not measured. Re-run numbers are given with ranges (Pixi this time 92/245/241 ms).
6. **`background-position` (should-fix; agreed).** Added CDP LayerTree measurement and one-row-strip variants: 48.7 MB (grid, transform), 9.3 MB (strip, transform), 1.5 MB (background-position); 23.6 and 13.9 ms/s of main thread for background-position. G4 now uses the reviewer's wording, with these numbers.
7. **512 WebP quality and tier conflict (should-fix; agreed).** `run-closeup.mjs` now renders model.mjs's outputs. It reproduced the reviewer: 39.3 / 33.1 dB (512 WebP) vs 46.7 / 37.3 (1K WebP) and 40.5 / 37.7 (`--ktx2`). These are in G7's Expect column. The hero row now says `--tier desktop` or `--max-texture 2048`.
8. **Scope (should-fix; agreed).** `motion.md` §5 keeps only DOM frame animation, 9-slice, formats and reduced motion (G4). Tile maps, atlas extrusion and 2D runtime choice moved to `realtime-3d.md` §5c and `resources/libraries.md`, gated to game-like signature experiences (G4b). The Pixi claim is tagged [K].
9. **Units in §8 (should-fix; agreed).** G5 keeps gzip. The runtime table now has WASM gzip. The existing Rive and dotLottie figures are explained as version drift (814 and 499 KB gzip in the current versions), to update only with a version stamp.

Also from the reviewer's extra checks:
- **"Any step after optimize drops meshopt"**: re-verified (`copy`: 73 → 84 KB) and added to C and G7.
- **The 16-model check**: extended into `run-modelscript.mjs`.
- **The Codrops skyscraper** was not re-tested: it is not pinned here and its licence is unknown.
- **Blender AO bake time**: now given as 13–18 s across the two runs.
