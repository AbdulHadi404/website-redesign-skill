// Font-swap CLS experiment: same page, four fallback strategies.
import { writeFile } from 'node:fs/promises';
const variants = {
  'font-none':     { display: 'swap', fallback: '' , stack: '"Playfair Display", serif' },
  'font-matched':  { display: 'swap', stack: '"Playfair Display", "Playfair Fallback", serif',
    fallback: `@font-face { font-family: "Playfair Fallback"; font-weight: 700; src: local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"), local("Liberation Serif Bold"), local("LiberationSerif-Bold");
      ascent-override: 94.9379%; descent-override: 22.0235%; line-gap-override: 0%; size-adjust: 113.9692%; }` },
  'font-matched-nolocal': { display: 'swap', stack: '"Playfair Display", "Playfair Fallback", serif',
    fallback: `@font-face { font-family: "Playfair Fallback"; src: local("Times New Roman"), local("TimesNewRomanPSMT");
      ascent-override: 94.9379%; descent-override: 22.0235%; line-gap-override: 0%; size-adjust: 113.9692%; }` },
  'font-matched-bold': { display: 'swap', stack: '"Playfair Display", "Playfair Fallback", serif',
    fallback: `@font-face { font-family: "Playfair Fallback"; font-weight: 700; src: local("Liberation Serif Bold"), local("LiberationSerif-Bold");
      ascent-override: 101.0997%; descent-override: 23.4529%; line-gap-override: 0%; size-adjust: 107.023%; }` },
  'font-optional': { display: 'optional', fallback: '', stack: '"Playfair Display", serif' },
};
for (const [name, v] of Object.entries(variants)) {
  await writeFile(`site/${name}.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${name}</title>
<style>
@font-face { font-family: "Playfair Display"; font-weight: 700; font-display: ${v.display}; src: url(fonts/playfair-700-latin.woff2) format("woff2"); }
${v.fallback}
body { margin: 0; padding: 16px; font: 16px/1.5 system-ui, sans-serif; }
h1 { font-family: ${v.stack}; font-weight: 700; font-size: 44px; line-height: 1.1; margin: 0 0 16px; }
.block { height: 300px; background: #eee; margin-top: 16px; }
</style></head><body>
<h1>Groceries delivered in an hour, anywhere in town, every day of the week</h1>
<p>Order in two taps and track the rider to your door. Fresh food, fair prices, no minimum basket.</p>
<div class="block"></div><p style="height:900px">More</p>
</body></html>`);
}
console.log('wrote', Object.keys(variants));
