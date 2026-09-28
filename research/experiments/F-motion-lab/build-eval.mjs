import * as esbuild from "esbuild"; import fs from "node:fs";
for (const f of fs.readdirSync("eval-entries")) await esbuild.build({entryPoints:["eval-entries/"+f],bundle:true,minify:true,format:"esm",platform:"browser",target:"es2020",outfile:"www/"+f,define:{"process.env.NODE_ENV":'"production"'},loader:{".wasm":"file",".css":"empty"},logLevel:"silent"});
console.log("ok");
