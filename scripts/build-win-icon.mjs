/**
 * Build build-resources/icon.ico from icon.png (multi-size single .ico file).
 * electron-builder expects one icon.ico, not separate per-size files.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import toIco from 'to-ico';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'build-resources', 'icon.png');
const output = path.join(root, 'build-resources', 'icon.ico');

// Standard Windows icon sizes bundled into one .ico container.
const sizes = [16, 24, 32, 48, 64, 128, 256];

const png = await readFile(source);
const ico = await toIco([png], { sizes, resize: true });
await writeFile(output, ico);

console.log(`Wrote ${output} (${ico.length} bytes, sizes: ${sizes.join(', ')})`);
