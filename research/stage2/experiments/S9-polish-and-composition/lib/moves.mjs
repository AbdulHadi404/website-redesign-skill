// The polish moves under test. Each is a class m-<id> on <html> (page/styles.css, Part 2).
// family: composition | surface | component | type | control
// where: the region a move changes, as selectors; 'fold' means it is in the first viewport at 1440.
// claim: what practitioners say the move does (the hypothesis the capture tests).
export const MOVES = [
  // composition
  { id: 'scale', family: 'composition', name: 'Scale contrast (h1 48 to 64 px, h2 32 to 44 px)', where: ['.hero-copy', '.how h2'], claim: 'one clearly dominant element makes the page read as designed' },
  { id: 'rhythm', family: 'composition', name: 'Spacing rhythm and proximity (one scale; tight in groups, generous between)', where: ['.hero', '.how'], claim: 'more, and more deliberate, space reads as premium and calm' },
  { id: 'align', family: 'composition', name: 'Alignment (one container edge, headings on the column, panel on the h1 cap line)', where: ['.site-header', '.how'], claim: 'alignment is the cheapest quality' },
  { id: 'depth', family: 'composition', name: 'Depth and layering (background band, panel straddling it, notification overlapping)', where: ['.hero'], claim: 'overlap and planes make a hero read as staged, not placed' },
  { id: 'accent', family: 'composition', name: 'Accent restraint (accent only on the primary action)', where: ['.hero', '.how'], claim: 'a rare accent creates a focal point (von Restorff)' },
  { id: 'crop', family: 'composition', name: 'Crop for the subject (rim and crema kept, headroom)', where: ['.statement'], claim: 'a crop that respects the subject reads as art-directed' },
  // surface
  { id: 'shadow', family: 'surface', name: 'Shadows: one light direction, layered, tinted', where: ['.panel', '.toast', '.how'], claim: 'layered tinted shadows read as real depth; mixed directions read as cheap' },
  { id: 'border', family: 'surface', name: 'Borders: alpha hairlines, fewer of them', where: ['.panel', '.how'], claim: 'fewer, lighter borders read as refined' },
  { id: 'radius', family: 'surface', name: 'Radii: a scale by role, concentric nesting', where: ['.panel', '.how'], claim: 'non-concentric corners are the most common thing that makes interfaces feel off' },
  { id: 'squircle', family: 'surface', name: 'Continuous corners (corner-shape: squircle)', where: ['.panel', '.how'], claim: 'superellipse corners read as hardware-grade' },
  { id: 'grain', family: 'surface', name: 'Grain (9% monochrome noise on the hero ground)', where: ['.hero'], claim: 'texture adds materiality and warmth' },
  { id: 'imgoutline', family: 'surface', name: 'Image hairline (1 px, 10% black, inside)', where: ['.statement', '.phones'], claim: 'a light-edged image keeps its edge on a light ground' },
  { id: 'neutrals', family: 'surface', name: 'Tinted neutrals (greys take the brand hue)', where: ['.hero', '.how'], claim: 'pure greys read as default; tinted greys read as a palette' },
  // components
  { id: 'iconstroke', family: 'component', name: 'One icon family (one rendered stroke, outline only, sizes tied to text)', where: ['.hero', '.how'], claim: 'mixed icon weights read as assembled from kits' },
  { id: 'iconalign', family: 'component', name: 'Optical alignment (icons on the first line, labels trimmed to cap height, play triangle centred)', where: ['.hero'], claim: 'glyphs a pixel or two off read as unfinished' },
  { id: 'buttons', family: 'component', name: 'Button proportion and finish', where: ['.hero'], claim: 'button proportion is the first place quality is judged' },
  { id: 'focusring', family: 'component', name: 'Designed focus ring (focused primary button)', where: ['.hero-copy'], claim: 'a designed ring reads as considered, the default as unstyled' },
  // type
  { id: 'wrap', family: 'type', name: 'text-wrap balance (headings) and pretty (paragraphs)', where: ['.hero-copy', '.how'], claim: 'no widows, even rags' },
  { id: 'tracking', family: 'type', name: 'Display tracking (-0.025em h1, -0.015em h2)', where: ['.hero-copy', '.how h2'], claim: 'display type set tight reads as typeset' },
  { id: 'leading', family: 'type', name: 'Display leading (h1 1.25 to 1.06)', where: ['.hero-copy'], claim: 'display type set solid reads as typeset' },
  { id: 'tnum', family: 'type', name: 'Tabular figures in the table and totals', where: ['.panel'], claim: 'aligned digits read as precise' },
  { id: 'opsz', family: 'type', name: 'Optical sizes (font served with its opsz axis)', where: ['.hero', '.how'], claim: 'display cuts at display sizes read as crafted' },
  { id: 'smoothing', family: 'type', name: '-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility', where: ['.hero'], claim: 'crisper, lighter type' },
  { id: 'hang', family: 'type', name: 'Hanging bullets and quotation mark', where: ['.hero-copy', '.statement', '.pricing'], claim: 'an optically straight text edge' },
  // control
  { id: 'null', family: 'control', name: 'No change (control)', where: ['.hero'], claim: 'nothing' },
];

export const byId = Object.fromEntries(MOVES.map((m) => [m.id, m]));
export const REAL = MOVES.filter((m) => m.family !== 'control');
// Regions below the fold that get their own viewport-sized window (1440 x 900 or 390 x 844 CSS px).
export const WINDOWS = ['.how', '.statement', '.phones', '.pricing'];
