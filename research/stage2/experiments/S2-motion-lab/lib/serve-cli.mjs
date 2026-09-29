// node lib/serve-cli.mjs [port] — serve the lab root (for running scripts by hand)
import { serve } from './server.mjs';
const { base } = await serve(undefined, +(process.argv[2] || 0));
console.log(base);
