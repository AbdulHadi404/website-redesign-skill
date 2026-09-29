// @material/material-color-utilities 0.4.0 ships ESM with a few extensionless
// relative imports (scheme/scheme_content.js → '../dynamiccolor/dynamic_scheme'),
// which Node's ESM resolver rejects. This resolve hook retries with '.js'.
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (e) {
    if (e?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[cm]?js$/.test(specifier)) {
      return next(specifier + '.js', context);
    }
    throw e;
  }
}
