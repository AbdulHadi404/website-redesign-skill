// A small icon set (24×24, stroke) for the bilingual fixture. Each icon is drawn in its LTR form.
// data-mirror says what the page intends: "dir" icons flip in RTL, "never" icons do not.
window.ICONS = {
  'chevron-right': ['dir', '<path d="M9 6l6 6-6 6"/>'],
  'chevron-left': ['dir', '<path d="M15 6l-6 6 6 6"/>'],
  'arrow-right': ['dir', '<path d="M5 12h14M13 6l6 6-6 6"/>'],
  'arrow-left': ['dir', '<path d="M19 12H5M11 6l-6 6 6 6"/>'],
  'undo': ['dir', '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>'],
  'redo': ['dir', '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>'],
  'reply': ['dir', '<path d="M10 9V5l-7 7 7 7v-4c5 0 8.5 1.5 11 5-1-5-4-10-11-11z"/>'],
  'send': ['dir', '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>'],
  'external-link': ['dir', '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/>'],
  'list': ['dir', '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'],
  'help': ['dir', '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01"/>'],
  'logout': ['dir', '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>'],
  'play': ['never', '<path d="M6 4l14 8-14 8z"/>'],
  'skip-forward': ['never', '<path d="M5 4l10 8-10 8z"/><path d="M19 5v14"/>'],
  'clock': ['never', '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'],
  'refresh': ['never', '<path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/>'],
  'check': ['never', '<path d="M20 6L9 17l-5-5"/>'],
  'search': ['never', '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'],
  'cart': ['never', '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/>'],
  'alert': ['never', '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'],
  'sort-desc': ['never', '<path d="M12 5v14M5 12l7 7 7-7"/>'],
  'close': ['never', '<path d="M18 6L6 18M6 6l12 12"/>'],
  'menu': ['never', '<path d="M3 6h18M3 12h18M3 18h18"/>'],
};
window.icon = (name, label) => {
  const [kind, body] = window.ICONS[name];
  const cls = kind === 'dir' ? 'icon icon-dir' : 'icon';
  return `<svg class="${cls} icon-${name}" data-icon="${name}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${body}</svg>`;
};
