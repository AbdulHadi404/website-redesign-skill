export const css = `
:root { color-scheme: light; --ink: #1c1f22; --muted: #5b6168; --line: #d7d9dc; --ground: #f6f6f4; --accent: #2449d8; }
body { margin: 0; font: 14px/20px system-ui, sans-serif; color: var(--ink); background: var(--ground); }
main { padding: 16px 24px; }
h1 { font-size: 16px; margin: 0 0 12px; }
button { font: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
`;
