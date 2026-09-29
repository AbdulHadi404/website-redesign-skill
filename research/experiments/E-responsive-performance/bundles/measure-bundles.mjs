// Marginal bundle cost of common UI dependencies, measured the way a production build ships them:
// esbuild, ESM, minified, NODE_ENV=production, tree-shaken; react/react-dom external unless the entry
// is a framework baseline. Reports min / gzip / brotli bytes.
//   node measure-bundles.mjs
import { build } from 'esbuild';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const E = {
  // Framework baselines (nothing external)
  'react + react-dom (client)': [`import {createRoot} from 'react-dom/client'; import {createElement} from 'react'; createRoot(document.body).render(createElement('div'))`, false],
  'preact': [`import {render,h} from 'preact'; render(h('div'), document.body)`, false],
  // Component libraries (react external)
  'MUI Button': [`import Button from '@mui/material/Button'; export default Button`],
  'MUI Button+Dialog+TextField': [`import Button from '@mui/material/Button'; import Dialog from '@mui/material/Dialog'; import TextField from '@mui/material/TextField'; export {Button, Dialog, TextField}`],
  'Radix Dialog': [`import * as D from '@radix-ui/react-dialog'; export default D`],
  'Headless UI Dialog': [`import {Dialog, DialogPanel} from '@headlessui/react'; export {Dialog, DialogPanel}`],
  'Base UI Dialog': [`import {Dialog} from '@base-ui/react/dialog'; export {Dialog}`],
  'React Aria Components Dialog+Modal+Button': [`import {Dialog, Modal, Button, DialogTrigger} from 'react-aria-components'; export {Dialog, Modal, Button, DialogTrigger}`],
  // Icons
  'lucide-react: 3 named icons': [`import {Search, Menu, X} from 'lucide-react'; export {Search, Menu, X}`],
  'lucide-react: import * (dynamic lookup)': [`import * as Icons from 'lucide-react'; export const get = (n) => Icons[n]`],
  'react-icons/fa: 3 named icons': [`import {FaSearch, FaBars, FaTimes} from 'react-icons/fa'; export {FaSearch, FaBars, FaTimes}`],
  '@phosphor-icons/react: 3 named icons': [`import {MagnifyingGlass, List, X} from '@phosphor-icons/react'; export {MagnifyingGlass, List, X}`],
  // Dates
  'Intl.DateTimeFormat (built in)': [`export const f = (d) => new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium'}).format(d)`],
  'date-fns format+addDays': [`import {format, addDays} from 'date-fns'; export const f = (d) => format(addDays(d, 1), 'PP')`],
  'dayjs': [`import dayjs from 'dayjs'; export const f = (d) => dayjs(d).add(1,'day').format('D MMM YYYY')`],
  'luxon DateTime': [`import {DateTime} from 'luxon'; export const f = (d) => DateTime.fromJSDate(d).plus({days:1}).toLocaleString()`],
  'moment': [`import moment from 'moment'; export const f = (d) => moment(d).add(1,'day').format('LL')`],
  // Animation
  'motion/react <motion.div>': [`import {motion} from 'motion/react'; export default motion`],
  'motion/react LazyMotion+m+domAnimation': [`import {LazyMotion, m, domAnimation} from 'motion/react'; export {LazyMotion, m, domAnimation}`],
  'motion animate() (vanilla)': [`import {animate} from 'motion'; export default animate`],
  'motion/mini animate() (WAAPI)': [`import {animate} from 'motion/mini'; export default animate`],
  'gsap core': [`import {gsap} from 'gsap'; export default gsap`],
  'gsap + ScrollTrigger': [`import {gsap} from 'gsap'; import {ScrollTrigger} from 'gsap/ScrollTrigger'; gsap.registerPlugin(ScrollTrigger); export default gsap`],
  // Charts / data grids (dashboards)
  'chart.js/auto': [`import Chart from 'chart.js/auto'; export default Chart`],
  'chart.js tree-shaken (line only)': [`import {Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale} from 'chart.js'; Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale); export default Chart`],
  'recharts LineChart': [`import {LineChart, Line, XAxis, YAxis, Tooltip} from 'recharts'; export {LineChart, Line, XAxis, YAxis, Tooltip}`],
  'echarts (full import)': [`import * as echarts from 'echarts'; export default echarts`],
  'echarts/core + line + canvas': [`import * as echarts from 'echarts/core'; import {LineChart} from 'echarts/charts'; import {GridComponent, TooltipComponent} from 'echarts/components'; import {CanvasRenderer} from 'echarts/renderers'; echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]); export default echarts`],
  '@tanstack/react-table v9 core (headless)': [`import {useTable, coreFeatures, createCoreRowModel} from '@tanstack/react-table'; export {useTable, coreFeatures, createCoreRowModel}`],
  'AG Grid community (AllCommunityModule) + react': [`import {AgGridReact} from 'ag-grid-react'; import {ModuleRegistry, AllCommunityModule} from 'ag-grid-community'; ModuleRegistry.registerModules([AllCommunityModule]); export default AgGridReact`],
  // Utilities
  "lodash (import _ from 'lodash')": [`import _ from 'lodash'; export const d = _.debounce`],
  "lodash-es {debounce}": [`import {debounce} from 'lodash-es'; export const d = debounce`],
  'zod (classic API)': [`import {z} from 'zod'; export const s = z.object({email: z.string().email()})`],
  'zod/mini': [`import * as z from 'zod/mini'; export const s = z.object({email: z.email()})`],
};

const rows = [];
for (const [name, [code, externalReact = true]] of Object.entries(E)) {
  try {
    const r = await build({
      stdin: { contents: code, resolveDir: process.cwd(), loader: 'js' }, bundle: true, write: false, minify: true,
      format: 'esm', platform: 'browser', target: 'es2022', treeShaking: true, logLevel: 'silent',
      define: { 'process.env.NODE_ENV': '"production"' },
      external: externalReact ? ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'] : [],
    });
    const buf = Buffer.from(r.outputFiles[0].contents);
    rows.push({ dependency: name, minKB: +(buf.length / 1024).toFixed(1), gzipKB: +(gzipSync(buf, { level: 9 }).length / 1024).toFixed(1),
      brotliKB: +(brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length / 1024).toFixed(1) });
  } catch (e) { rows.push({ dependency: name, minKB: 'ERR', gzipKB: String(e.message).slice(0, 60) }); }
}
console.table(rows);
