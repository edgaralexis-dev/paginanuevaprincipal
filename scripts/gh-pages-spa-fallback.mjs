/**
 * GitHub Pages no redirige rutas desconocidas a index.html.
 * Duplicar index.html como 404.html permite que recargar /login, /mis-boletos, etc. funcione.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const index = join(dist, 'index.html');
const fallback = join(dist, '404.html');

if (!existsSync(index)) {
  console.warn('gh-pages-spa-fallback: no dist/index.html, omitiendo.');
  process.exit(0);
}

copyFileSync(index, fallback);
console.log('gh-pages-spa-fallback: dist/404.html creado.');
