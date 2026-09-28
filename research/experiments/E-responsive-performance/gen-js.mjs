// Generates a deliberately heavy "bundle" (~450 KB of JS that also burns CPU at evaluation),
// standing in for an unsplit SPA bundle / big component library.
import { writeFile } from 'node:fs/promises';
let s = '(function(){var registry={};\n';
for (let i = 0; i < 4000; i++) s += `registry.c${i}=function(p){var o={id:${i},name:"component-${i}",props:p||{}};for(var k=0;k<3;k++){o["k"+k]=(o.id*k)%7}return o};\n`;
s += 'var t=performance.now();var acc=0;for(var i=0;i<4000;i++){acc+=registry["c"+i]({}).k2}\n';
s += 'while(performance.now()-t<250){acc++}\nwindow.__bundle=acc;})();\n';
await writeFile('site/app-bad.js', s);
console.log('bundle KB', (s.length/1024).toFixed(0));
