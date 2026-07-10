#!/usr/bin/env node
/**
 * Merge all butterchurn-presets npm packs into approvedPresetCatalog.generated.ts.
 * Run: npm run generate:butterchurn-catalog
 *
 * @see documentation/visualizer-architecture.md — experience registry and Butterchurn
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(path.join(root, 'package.json'));

globalThis.window = {};

const PRESET_PACKS = [
  'butterchurn-presets/lib/butterchurnPresets.min.js',
  'butterchurn-presets/lib/butterchurnPresetsExtra.min.js',
  'butterchurn-presets/lib/butterchurnPresetsExtra2.min.js',
  'butterchurn-presets/lib/butterchurnPresetsMD1.min.js',
  'butterchurn-presets/lib/butterchurnPresetsNonMinimal.min.js',
  'butterchurn-presets/lib/butterchurnPresetsMinimal.min.js',
];

/** Keep stable ids for the original curated launch presets. */
const LEGACY_EXPERIENCE_IDS = {
  'Flexi, martin + geiss - dedicated to the sherwin maxawow': 'deep-space',
  'Flexi + Martin - astral projection': 'pulse',
  'Cope - The Neverending Explosion of Red Liquid Fire': 'liquid',
  '_Rovastar + Geiss - Hurricane Nightmare (Posterize Mix)': 'nebula',
  'flexi + geiss - pogo cubes vs. tokamak vs. game of life [stahls jelly 4.5 finish]':
    'color-flow',
};

function loadBlocklist() {
  const blocklistPath = path.join(
    root,
    'src/visualizers/butterchurn/presets/approved/presetBlocklist.ts',
  );
  const source = fs.readFileSync(blocklistPath, 'utf8');
  const match = source.match(/BUTTERCHURN_PRESET_BLOCKLIST[^[]*\[([\s\S]*?)\]/);
  if (!match) return [];
  const entries = [];
  for (const line of match[1].split('\n')) {
    const quoted = line.match(/['"]([^'"]+)['"]/);
    if (quoted) entries.push(quoted[1]);
  }
  return entries;
}

function fnv1aHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function slugifyPresetKey(key) {
  const slug = key
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return slug || 'preset';
}

function experienceIdForPresetKey(presetKey, usedIds) {
  if (LEGACY_EXPERIENCE_IDS[presetKey]) {
    const legacy = LEGACY_EXPERIENCE_IDS[presetKey];
    usedIds.add(legacy);
    return legacy;
  }

  const slug = slugifyPresetKey(presetKey);
  let id = `bc-${slug}-${fnv1aHash(presetKey).slice(0, 5)}`;
  while (usedIds.has(id)) {
    id = `${id}-${usedIds.size}`;
  }
  usedIds.add(id);
  return id;
}

function escapeString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function loadAllPresetKeys() {
  const merged = new Map();
  for (const packPath of PRESET_PACKS) {
    const mod = require(packPath);
    const api = mod.default ?? mod;
    if (typeof api.getPresets !== 'function') {
      throw new Error(`${packPath} missing getPresets()`);
    }
    for (const key of Object.keys(api.getPresets())) {
      merged.set(key, packPath);
    }
  }
  return [...merged.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

const blocklist = new Set(loadBlocklist());
const presetKeys = loadAllPresetKeys().filter((key) => !blocklist.has(key));

const usedIds = new Set();
const presets = presetKeys
  .map((presetKey) => {
    const id = experienceIdForPresetKey(presetKey, usedIds);
    if (blocklist.has(id)) return null;
    return {
      id,
      name: presetKey,
      description: 'Milkdrop preset from the Butterchurn library.',
      category: 'classic',
      presetKey,
      creditRefs: ['butterchurn', 'butterchurn-presets'],
    };
  })
  .filter(Boolean);

const keyById = Object.fromEntries(presets.map((preset) => [preset.id, preset.presetKey]));

const outputPath = path.join(
  root,
  'src/visualizers/butterchurn/presets/approved/approvedPresetCatalog.generated.ts',
);

const fileBody = `/** AUTO-GENERATED — run \`npm run generate:butterchurn-catalog\` after changing the blocklist. */
import type { ApprovedButterchurnPreset } from './presetTypes';

export const approvedButterchurnPresets: ApprovedButterchurnPreset[] = [
${presets
  .map(
    (preset) => `  {
    id: '${escapeString(preset.id)}',
    name: '${escapeString(preset.name)}',
    description: '${escapeString(preset.description)}',
    category: '${preset.category}',
    presetKey: '${escapeString(preset.presetKey)}',
    creditRefs: ['butterchurn', 'butterchurn-presets'],
  },`,
  )
  .join('\n')}
];

export const butterchurnPresetKeyByExperienceId: Record<string, string> = {
${Object.entries(keyById)
  .map(([id, key]) => `  '${escapeString(id)}': '${escapeString(key)}',`)
  .join('\n')}
};
`;

fs.writeFileSync(outputPath, fileBody, 'utf8');
console.log(`Wrote ${presets.length} Butterchurn presets to ${path.relative(root, outputPath)}`);
if (blocklist.size > 0) {
  console.log(`Blocklist entries: ${blocklist.size}`);
}
