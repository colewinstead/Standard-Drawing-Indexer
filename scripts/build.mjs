import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const result = await build({ entryPoints: ['src/app.js'], bundle: true, format: 'iife', write: false, minify: true, target: 'chrome120', legalComments: 'inline', define: { LICENSE_TEXT: JSON.stringify(await readFile('THIRD-PARTY-NOTICES.txt', 'utf8')) } });
const worker = await readFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'utf8');
const fonts = {};
for (const file of await readdir('node_modules/pdfjs-dist/standard_fonts')) {
  if (/\.(pfb|ttf)$/.test(file)) fonts[file] = (await readFile(join('node_modules/pdfjs-dist/standard_fonts', file))).toString('base64');
}
let html = await readFile('src/index.html', 'utf8');
const css = await readFile('src/style.css', 'utf8');
const catalog = await readFile('catalog/drawings.json', 'utf8');
const source = (await readFile('fixtures/Roadway Design Standard Drawings.pdf')).toString('base64');
const escape = s => s.replace(/<\/script/gi, '<\\/script');
html = html.replace('<!-- STYLE -->', () => `<style>${css}</style>`)
  .replace('<!-- DATA -->', () => `<script id="catalog-data" type="application/json">${escape(catalog)}</script>\n<script id="source-data" type="application/octet-stream">${source}</script>\n<script id="worker-data" type="application/json">${escape(JSON.stringify(worker))}</script>\n<script id="font-data" type="application/json">${JSON.stringify(fonts)}</script>`)
  .replace('<!-- APP -->', () => `<script>${escape(result.outputFiles[0].text)}</script>`);
await mkdir('dist', { recursive: true });
await writeFile('dist/Standard Drawing Indexer.html', html);
await writeFile('dist/THIRD-PARTY-NOTICES.txt', await readFile('THIRD-PARTY-NOTICES.txt'));
console.log(`Built dist/Standard Drawing Indexer.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB)`);
