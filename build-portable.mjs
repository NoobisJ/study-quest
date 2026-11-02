import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = existsSync(resolve(projectDir, 'dist', 'index.html')) ? resolve(projectDir, 'dist') : projectDir;
const outputPath = join(sourceDir, 'Study-Quest-Portable.html');

const mimeByExtension = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function dataUrl(relativePath) {
  const cleanPath = relativePath.split(/[?#]/)[0];
  const extension = cleanPath.slice(cleanPath.lastIndexOf('.')).toLowerCase();
  const mime = mimeByExtension[extension];
  if (!mime) return relativePath;
  const bytes = await readFile(join(sourceDir, cleanPath));
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

async function embedAssetReferences(text) {
  const matches = [...text.matchAll(/(?:src=(["']))(icons\/[^"']+)\1|url\((['"]?)(icons\/[^)'"?]+)\3\)/g)];
  let output = text;
  for (const match of matches) {
    const assetPath = match[2] || match[4];
    output = output.split(assetPath).join(await dataUrl(assetPath));
  }
  return output;
}

let html = await readFile(join(sourceDir, 'index.html'), 'utf8');

const styleLinks = [...html.matchAll(/\s*<link rel="stylesheet" href="([^"]+)">/g)];
for (const match of styleLinks) {
  let css = await readFile(join(sourceDir, match[1]), 'utf8');
  css = await embedAssetReferences(css);
  html = html.replace(match[0], () => `\n  <style data-source="${match[1]}">\n${css}\n  </style>`);
}

const scriptTags = [...html.matchAll(/\s*<script src="([^"]+)"><\/script>/g)];
for (const match of scriptTags) {
  let javascript = await readFile(join(sourceDir, match[1]), 'utf8');
  javascript = await embedAssetReferences(javascript);
  javascript = javascript.replace(/<\/script/gi, '<\\/script');
  html = html.replace(match[0], () => `\n  <script data-source="${match[1]}">\n${javascript}\n  </script>`);
}

const favicon = await dataUrl('icons/favicon.png');
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/g, '')
  .replace(/\s*<link rel="icon"[^>]*>/g, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '')
  .replace('</head>', `\n  <link rel="icon" href="${favicon}" type="image/png">\n  <meta name="study-quest-build" content="portable-single-file">\n</head>`)
  .replace('<title>Study Quest</title>', '<title>Study Quest — Portable</title>');

await writeFile(outputPath, html, 'utf8');
const size = Buffer.byteLength(html);
console.log(`Built ${outputPath} (${Math.round(size / 1024)} KB)`);
