import * as esbuild from "esbuild";
import fs from "node:fs"; import zlib from "node:zlib"; import path from "node:path";
const files = fs.readdirSync("entries").filter(f=>/\.jsx?$/.test(f)).sort();
const rows=[];
for (const f of files) {
  try {
    const r = await esbuild.build({ entryPoints:["entries/"+f], bundle:true, minify:true, format:"esm", platform:"browser", target:"es2020", write:false, jsx:"automatic",
      define:{"process.env.NODE_ENV":'"production"'}, external:["react","react-dom","react/jsx-runtime","react-dom/client","scheduler"], logLevel:"silent",
      loader:{".wasm":"file",".css":"empty",".svg":"dataurl",".png":"dataurl",".woff":"dataurl",".woff2":"dataurl"}, outdir:"out", metafile:false });
    const js = r.outputFiles.filter(o=>o.path.endsWith(".js")).map(o=>o.contents).reduce((a,b)=>Buffer.concat([a,Buffer.from(b)]),Buffer.alloc(0));
    const gz = zlib.gzipSync(js,{level:9}).length; const br = zlib.brotliCompressSync(js,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).length;
    rows.push([f.replace(/\.jsx?$/,""), js.length, gz, br]);
  } catch(e){ rows.push([f, "ERR "+(e.errors?.[0]?.text||e.message).slice(0,120)]); }
}
const k=n=>typeof n==="number"?(n/1024).toFixed(1):n;
console.log("entry".padEnd(34),"min KB".padStart(8),"gzip KB".padStart(8),"br KB".padStart(8));
for (const r of rows) console.log(String(r[0]).padEnd(34), String(k(r[1])).padStart(8), String(k(r[2]??"")).padStart(8), String(k(r[3]??"")).padStart(8));
fs.writeFileSync("sizes.json", JSON.stringify(rows,null,1));
