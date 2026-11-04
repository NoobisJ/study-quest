import { readFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = existsSync(resolve(root, 'index.html')) ? root : resolve(root, 'dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const portable = await readFile(resolve(dist, 'Study-Quest-Portable.html'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.webmanifest'), 'utf8'));
const serviceWorker = await readFile(resolve(dist, 'service-worker.js'), 'utf8');
const references = [...html.matchAll(/<(?:script[^>]+src|link[^>]+href)="([^"]+)"/g)].map(match => match[1]);
const localReferences = references.filter(path => !/^(?:https?:|data:)/.test(path));

for (const path of localReferences) await access(resolve(dist, path));
for (const required of ['v4.css', 'v4.js', 'party.css', 'party.js']) {
  if (!serviceWorker.includes(`'./${required}'`)) throw new Error(`${required} is missing from the offline shell.`);
  if (!portable.includes(`data-source="${required}"`)) throw new Error(`${required} is missing from the portable build.`);
}
if (/<script[^>]+src=/.test(portable) || /<link rel="stylesheet"/.test(portable)) throw new Error('Portable build still has external code assets.');
if (manifest.name !== 'Study Quest' || manifest.display !== 'standalone') throw new Error('Unexpected web app manifest.');

const markupSources = ['index.html', 'v2.js', 'v3.js', 'v4.js', 'pwa-v2.js', 'data-transfer.js', 'spotify.js', 'party.js'];
const ids = [];
for (const source of markupSources) {
  const text = await readFile(resolve(dist, source), 'utf8');
  for (const match of text.matchAll(/\bid=["']([A-Za-z][\w:-]*)["']/g)) ids.push({ id: match[1], source });
}
const duplicateIds = [...new Set(ids.filter((entry, index) => ids.findIndex(other => other.id === entry.id) !== index).map(entry => entry.id))];
if (duplicateIds.length) throw new Error(`Duplicate interface IDs: ${duplicateIds.join(', ')}`);

if (!serviceWorker.includes("study-quest-shell-v11")) throw new Error('Expected offline shell v11.');
console.log(`Validated ${localReferences.length} local assets, offline shell v11, and ${Math.round(Buffer.byteLength(portable) / 1024)} KB portable build.`);
