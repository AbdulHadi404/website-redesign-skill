import * as esbuild from "esbuild"; import fs from "node:fs";
const pick = ["react-dom-baseline","motion-js-mini","motion-js-animate","motion-react-full","motion-react-lazy-domAnimation","gsap-core","gsap-scrolltrigger","animejs-animate","lottie-web-full","dotlottie-web","three-all","r3f-canvas","ogl-basic","model-viewer","spline-runtime","recharts-line","echarts-full","echarts-core-line-canvas","uplot","chartjs-auto","observable-plot","highcharts-core","apexcharts","ag-charts-community","tremor-react-area","vega-embed-lite","nivo-line","visx-xychart","d3-line-chart-subset","lenis"];
for (const n of pick) {
  const f = fs.existsSync(`entries/${n}.jsx`)?`entries/${n}.jsx`:`entries/${n}.js`;
  await esbuild.build({entryPoints:[f],bundle:true,minify:true,format:"esm",platform:"browser",target:"es2020",jsx:"automatic",outfile:`www/${n}.js`,define:{"process.env.NODE_ENV":'"production"'},loader:{".wasm":"file",".css":"empty"},logLevel:"silent"});
}
console.log("built", pick.length);
