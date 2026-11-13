import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(projectRoot, 'node_modules', 'tinymce');
const destination = path.join(projectRoot, 'public', 'tinymce');

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const file of ['tinymce.min.js', 'license.md', 'notices.txt']) {
  if (existsSync(path.join(source, file))) copyFileSync(path.join(source, file), path.join(destination, file));
}
for (const directory of [
  'icons/default',
  'models/dom',
  'plugins/lists',
  'plugins/link',
  'plugins/code',
  'plugins/wordcount',
  'skins/ui/oxide',
  'skins/content/default',
  'themes/silver',
]) {
  cpSync(path.join(source, directory), path.join(destination, directory), { recursive: true });
}
console.log('Copied the TinyMCE runtime, active editor plugins, and license into public/tinymce.');
