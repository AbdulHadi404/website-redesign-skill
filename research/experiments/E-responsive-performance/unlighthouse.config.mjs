export default {
  site: 'http://localhost:5055',
  urls: ['/good', '/bad', '/font-none', '/font-matched-bold'],
  scanner: { device: 'mobile', throttle: true, samples: 1, crawler: false, sitemap: false, robotsTxt: false },
  chrome: { useSystem: false },
  puppeteerOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] },
  lighthouseOptions: { onlyCategories: ['performance', 'accessibility'] },
  outputPath: './reports/unlighthouse',
  ci: { budget: { performance: 90, accessibility: 90 }, buildStatic: false, reporter: 'jsonExpanded' },
};
