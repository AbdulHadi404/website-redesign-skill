// Keep viewBox (needed for responsive scaling); keep <title> only if the SVG is meaningful and inline.
export default { multipass: true, floatPrecision: 2, plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }, 'removeDimensions', 'sortAttrs'] };
