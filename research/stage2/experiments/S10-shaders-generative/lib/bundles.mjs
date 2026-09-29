// Import-only bundle sizes of the libraries a designer is offered for "a moving background".
// esbuild --bundle --minify (ESM, es2020, production); gzip -9 and brotli 11 via zlib. Each entry uses what a
// real integration imports (so tree-shaking reflects practice), plus the licence read from the installed package.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const TMP = path.join(ROOT, 'dist/_bundles');

const ENTRIES = {
  'ogl (Renderer, Program, Mesh, Triangle)': ['ogl', `import { Renderer, Program, Mesh, Triangle } from 'ogl'; window.x = { Renderer, Program, Mesh, Triangle };`],
  'twgl.js (5 named functions)': ['twgl.js', `import { createProgramInfo, createBufferInfoFromArrays, setBuffersAndAttributes, setUniforms, drawBufferInfo } from 'twgl.js'; window.x = { createProgramInfo, createBufferInfoFromArrays, setBuffersAndAttributes, setUniforms, drawBufferInfo };`],
  'regl': ['regl', `import createREGL from 'regl'; window.x = createREGL;`],
  'three (fullscreen shader plane)': ['three', `import { WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, RawShaderMaterial, Vector2 } from 'three'; window.x = { WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, RawShaderMaterial, Vector2 };`],
  'three + postprocessing (composer, bloom, noise, CA, vignette)': ['postprocessing', `import { WebGLRenderer, Scene, PerspectiveCamera, Points, ShaderMaterial } from 'three'; import { EffectComposer, RenderPass, EffectPass, BloomEffect, NoiseEffect, ChromaticAberrationEffect, VignetteEffect } from 'postprocessing'; window.x = { WebGLRenderer, Scene, PerspectiveCamera, Points, ShaderMaterial, EffectComposer, RenderPass, EffectPass, BloomEffect, NoiseEffect, ChromaticAberrationEffect, VignetteEffect };`],
  '@paper-design/shaders (ShaderMount + mesh gradient)': ['@paper-design/shaders', `import { ShaderMount, meshGradientFragmentShader, getShaderColorFromString } from '@paper-design/shaders'; window.x = { ShaderMount, meshGradientFragmentShader, getShaderColorFromString };`],
  '@firecms/neat (NeatGradient)': ['@firecms/neat', `import { NeatGradient } from '@firecms/neat'; window.x = NeatGradient;`],
  'vanta FOG + three (all of three: Vanta reads THREE.*)': ['vanta', `import * as THREE from 'three'; import FOG from 'vanta/src/vanta.fog.js'; window.x = { THREE, FOG };`],
  '@tsparticles/engine + slim preset': ['@tsparticles/slim', `import { tsParticles } from '@tsparticles/engine'; import { loadSlim } from '@tsparticles/slim'; window.x = { tsParticles, loadSlim };`],
  'granim (canvas gradient animation)': ['granim', `import Granim from 'granim'; window.x = Granim;`],
  'curtainsjs (Curtains, Plane)': ['curtainsjs', `import { Curtains, Plane } from 'curtainsjs'; window.x = { Curtains, Plane };`],
  'p5 (whole library)': ['p5', `import p5 from 'p5'; window.x = p5;`],
};

export async function bundleSizes() {
  await mkdir(TMP, { recursive: true });
  const out = {};
  for (const [name, [pkg, code]] of Object.entries(ENTRIES)) {
    const entry = path.join(TMP, `${name.replace(/\W+/g, '_')}.js`);
    await writeFile(entry, code);
    try {
      const r = await build({ entryPoints: [entry], bundle: true, minify: true, format: 'esm', target: 'es2020', write: false, logLevel: 'silent', legalComments: 'none', define: { 'process.env.NODE_ENV': '"production"' }, nodePaths: [path.join(ROOT, 'node_modules')], absWorkingDir: ROOT });
      const buf = Buffer.from(r.outputFiles[0].contents);
      const pj = JSON.parse(await readFile(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8'));
      out[name] = {
        package: pkg, version: pj.version, licence: pj.license || null, lastPublish: null,
        raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length,
        brotli: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
      };
    } catch (e) { out[name] = { package: pkg, error: e.message.split('\n')[0] }; }
  }
  return out;
}
