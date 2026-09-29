#!/usr/bin/env node
// Remove every texture (and image) from a glTF, keeping geometry, materials' factors, nodes and animation. Used by
// gltf/pipeline.mjs for the 'geo-only' variants, so Draco and meshopt decode can be timed without texture decode.
//
//   node gltf/strip-textures.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!input || !output) { console.error('usage: node gltf/strip-textures.mjs in.glb out.glb'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
for (const t of doc.getRoot().listTextures()) t.dispose();
// Texture-only extensions would now be declared but unused.
for (const e of doc.getRoot().listExtensionsUsed()) if (/texture_(webp|avif|basisu)/i.test(e.extensionName)) e.dispose();
await io.write(output, doc);
