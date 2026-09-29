#!/usr/bin/env node
// KTX2 without installing KTX-Software: the ktx2-encoder package (Basis Universal compiled to WASM, MIT) as a
// gltf-transform transform. Same split as the CLI recipe: UASTC (+ RDO + Zstandard) for normal / occlusion /
// metallic-roughness, ETC1S for colour and emissive. Used by gltf/pipeline.mjs as the 'tex1k-ktx2-wasm' variant.
//
//   node gltf/ktx2-wasm.mjs in.glb out.glb                  # data textures flagged linear (correct)
//   node gltf/ktx2-wasm.mjs in.glb out.glb --readme-defaults # the package's defaults: every texture tagged sRGB
//
// ktx2-encoder 0.6.0 defaults to isInputSRGB: true and isSetKTX2SRGBTransferFunc: true for every texture; setting
// isPerceptual: false does not change the transfer function written to the KTX2 header. three.js's KTX2Loader
// trusts that header, so normal / occlusion / metallic-roughness maps get decoded as sRGB and the shading breaks
// (measured: 43 % of a close-up's pixels changed, PSNR 13.9 dB). Linear slots need both flags set to false.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import sharp from 'sharp';

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const readmeDefaults = process.argv.includes('--readme-defaults');
const linear = readmeDefaults ? {} : { isInputSRGB: false, isSetKTX2SRGBTransferFunc: false };
if (!input || !output) { console.error('usage: node gltf/ktx2-wasm.mjs in.glb out.glb'); process.exit(1); }

const imageDecoder = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const t0 = performance.now();
await doc.transform(
  ktx2({ slots: /^(normalTexture|occlusionTexture|metallicRoughnessTexture)$/, enableDebug: false, isUASTC: true, uastcLDRQualityLevel: 2, enableRDO: true, rdoQualityLevel: 4, needSupercompression: true, isPerceptual: false, ...linear, generateMipmap: true, imageDecoder }),
  ktx2({ slots: /^(baseColorTexture|emissiveTexture)$/, enableDebug: false, isUASTC: false, qualityLevel: 255, compressionLevel: 2, isPerceptual: true, generateMipmap: true, imageDecoder }),
);
await io.write(output, doc);
console.error(`ktx2-wasm: ${Math.round(performance.now() - t0)} ms`);
