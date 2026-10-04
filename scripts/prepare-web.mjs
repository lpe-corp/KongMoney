import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(projectRoot, 'dist');

for (const filename of ['manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  await copyFile(path.join(projectRoot, 'web', filename), path.join(distDirectory, filename));
}

const indexPath = path.join(distDirectory, 'index.html');
let html = await readFile(indexPath, 'utf8');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace(
    '</head>',
    `  <meta name="theme-color" content="#2563eb" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="KongMoney" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>`,
  );
}

if (!html.includes('navigator.serviceWorker.register')) {
  html = html.replace(
    '</body>',
    `  <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
      }
    </script>
  </body>`,
  );
}

await writeFile(indexPath, html);

const assetUrls = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1])
  .filter((url) => url.startsWith('/') && url !== '/');
const precacheUrls = ['/', '/icon-192.png', ...new Set(assetUrls)];
const serviceWorker = await readFile(path.join(projectRoot, 'web', 'sw.js'), 'utf8');
await writeFile(
  path.join(distDirectory, 'sw.js'),
  serviceWorker.replace("const PRECACHE_URLS = ['/'];", `const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};`),
);