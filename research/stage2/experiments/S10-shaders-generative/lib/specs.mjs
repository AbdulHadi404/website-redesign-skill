// Primary-source text the report's rules rest on, fetched from the specifications' own repositories
// (raw.githubusercontent.com, main branch; commit pinned with git ls-remote) and quoted, so the [V] tags can be re-checked.
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const SPECS = [
  {
    key: 'apg-button', repo: 'w3c/aria-practices', file: 'content/patterns/button/button-pattern.html',
    why: 'toggle-button label rule (pause control of a background animation)',
    quote: [/it is critical the label on a toggle does not change when its state changes/i, /if the design were to call for the button label to change[^.]*\./i],
  },
  {
    key: 'wcag-2.2.2', repo: 'w3c/wcag', file: 'guidelines/sc/20/pause-stop-hide.html',
    why: 'WCAG 2.2.2 Pause, Stop, Hide: the 5 s condition',
    quote: [/\(1\) starts automatically, \(2\)\s+lasts more than five seconds/i],
  },
  {
    key: 'webgl2-sync', repo: 'KhronosGroup/WebGL', file: 'specs/latest/2.0/index.html',
    why: 'a fence polled once per animation frame cannot signal inside the task that created it (the wrapper polls in rAF)',
    quote: [/sync objects may only transition to the signaled state when the user agent's event loop is not executing a task/i],
  },
  {
    key: 'chromium-lcp', repo: 'chromium/chromium', file: 'third_party/blink/renderer/core/paint/timing/largest_contentful_paint_calculator.cc',
    why: 'which images Chrome ignores as LCP candidates (viewport-covering; under 0.05 bits per pixel)',
    quote: [/if \(size >= viewport_area\) \{/, /is_viewport_covered = true/, /kMinimumEntropyForLCP = 0\.05/, /entropy = media_timing\.ContentSizeForEntropy\(\) \* 8\.0 \/ size/],
  },
];

export async function specs() {
  const out = {};
  for (const s of SPECS) {
    const rec = { repo: s.repo, file: s.file, why: s.why };
    try { rec.commit = execSync(`git ls-remote https://github.com/${s.repo}.git refs/heads/main`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 }).toString().split(/\s/)[0] || null; } catch { rec.commit = null; }
    const r = await fetch(`https://raw.githubusercontent.com/${s.repo}/${rec.commit || 'main'}/${s.file}`).catch(() => null);
    const t = r?.ok ? await r.text() : null;
    if (!t) { rec.error = 'not fetched'; out[s.key] = rec; continue; }
    rec.sha256 = crypto.createHash('sha256').update(t).digest('hex').slice(0, 16);
    const plain = t.replace(/<[^>]*>/g, '').replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/\s+/g, ' ');   // HTML specs wrap and tag their prose
    rec.quotes = s.quote.map((re) => { const m = t.match(re) || plain.match(re); return m ? m[0].replace(/\s+/g, ' ') : null; });
    rec.allFound = rec.quotes.every(Boolean);
    out[s.key] = rec;
  }
  return out;
}
