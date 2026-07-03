/**
 * Local release pipeline: compile → electron-builder → copy into releases/<version>/{mac,win}.
 *
 * Usage:
 *   npm run release:mac
 *   npm run release:win
 *   npm run release:all
 *
 * Optional password zips (portable exe on Windows, DMG on Mac):
 *   export RELEASE_ZIP_PASSWORD='your-password'
 *   # or put RELEASE_ZIP_PASSWORD=... in .env.release (gitignored)
 *
 * Flags:
 *   --mac | --win | --all
 *   --skip-build     reuse existing dist/ + skip npm run build
 *   --no-password    skip protected zip step even if password is set
 *   --keep-staging   do not wipe build/ before packaging
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingDir = path.join(root, 'build');
const releasesRoot = path.join(root, 'releases');

const args = new Set(process.argv.slice(2));
const platformArg = args.has('--all')
  ? 'all'
  : args.has('--win')
    ? 'win'
    : args.has('--mac')
      ? 'mac'
      : null;

if (!platformArg) {
  console.error('Specify --mac, --win, or --all');
  process.exit(1);
}

loadReleaseEnv();

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const password = args.has('--no-password') ? '' : process.env.RELEASE_ZIP_PASSWORD?.trim() ?? '';
const skipBuild = args.has('--skip-build');
const keepStaging = args.has('--keep-staging');

const platforms =
  platformArg === 'all' ? ['mac', 'win'] : [platformArg];

console.log(`\nSong Pages release ${version} → releases/${version}/{mac,win}\n`);

for (const platform of platforms) {
  releasePlatform(platform);
}

console.log('\nDone.\n');

function loadReleaseEnv() {
  const envPath = path.join(root, '.env.release');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key === 'RELEASE_ZIP_PASSWORD' && !process.env.RELEASE_ZIP_PASSWORD) {
      process.env.RELEASE_ZIP_PASSWORD = value;
    }
  }
}

function releasePlatform(platform) {
  const outDir = path.join(releasesRoot, version, platform);
  prepareDir(outDir);

  if (!keepStaging) {
    wipeStagingArtifacts();
  }

  if (!skipBuild) {
    run('npm', ['run', 'build'], 'Compile app');
  }

  const electronBuilder = path.join(root, 'node_modules', '.bin', 'electron-builder');
  const builderArgs = platform === 'mac' ? ['--mac'] : ['--win', '--x64'];
  run(electronBuilder, builderArgs, `Package ${platform}`);

  const copied = copyReleaseArtifacts(platform, outDir);
  const protectedZip = maybeCreateProtectedZip(platform, outDir, copied);

  writeFileSync(
    path.join(outDir, 'RELEASE.txt'),
    buildReleaseNotes(platform, version, copied, protectedZip),
    'utf8',
  );

  printSummary(platform, outDir, copied, protectedZip);
}

function prepareDir(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
}

/** Remove prior electron-builder output so staging stays predictable. */
function wipeStagingArtifacts() {
  if (!existsSync(stagingDir)) return;
  for (const name of readdirSync(stagingDir)) {
    if (name === '.DS_Store') continue;
    rmSync(path.join(stagingDir, name), { recursive: true, force: true });
  }
}

function run(command, commandArgs, label) {
  console.log(`→ ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyReleaseArtifacts(platform, outDir) {
  const patterns =
    platform === 'mac'
      ? ['.dmg']
      : ['SongPages-Setup-', 'SongPages-Portable-'];

  const copied = [];
  for (const name of readdirSync(stagingDir)) {
    const full = path.join(stagingDir, name);
    if (!statSync(full).isFile()) continue;

    const keep =
      platform === 'mac'
        ? name.endsWith('.dmg')
        : patterns.some((prefix) => name.startsWith(prefix) && name.endsWith('.exe'));

    if (!keep) continue;

    const dest = path.join(outDir, name);
    copyFileSync(full, dest);
    copied.push({ name, bytes: statSync(dest).size, dest });
  }

  if (copied.length === 0) {
    console.error(`No release artifacts found in ${stagingDir} for ${platform}.`);
    process.exit(1);
  }

  return copied;
}

function maybeCreateProtectedZip(platform, outDir, copied) {
  if (!password) {
    console.log(`→ Skipping password zip (${platform}): set RELEASE_ZIP_PASSWORD to enable`);
    return null;
  }

  const source =
    platform === 'mac'
      ? copied.find((f) => f.name.endsWith('.dmg'))
      : copied.find((f) => f.name.includes('Portable'));

  if (!source) {
    console.warn(`→ No source file for password zip on ${platform}`);
    return null;
  }

  const zipName =
    platform === 'mac'
      ? `SongPages-${version}-mac-protected.zip`
      : `SongPages-${version}-win-protected.zip`;
  const zipPath = path.join(outDir, zipName);

  console.log(`→ Creating password zip: ${zipName}`);
  run('zip', ['-j', '-P', password, zipPath, source.dest], 'Password zip');

  return { name: zipName, bytes: statSync(zipPath).size, dest: zipPath, sourceName: source.name };
}

function buildReleaseNotes(platform, ver, copied, protectedZip) {
  const lines = [
    `Song Pages ${ver}`,
    `Platform: ${platform}`,
    `Built: ${new Date().toISOString()}`,
    '',
    'Artifacts:',
    ...copied.map((f) => `  - ${f.name} (${formatBytes(f.bytes)})`),
  ];

  if (protectedZip) {
    lines.push(`  - ${protectedZip.name} (${formatBytes(protectedZip.bytes)})`);
    lines.push('', 'Password zip contains:', `  - ${protectedZip.sourceName}`);
    lines.push('', 'Password-protected zip: yes (share password separately)');
  } else {
    lines.push('', 'Password-protected zip: no');
  }

  if (platform === 'win') {
    lines.push('', 'Share guidance:', '  - Setup.exe → full install with shortcuts', '  - Portable.exe → run without installing', '  - win-protected.zip → Portable exe for casual access control');
  }

  return lines.join('\n');
}

function printSummary(platform, outDir, copied, protectedZip) {
  console.log(`\n${platform.toUpperCase()} release → ${outDir}`);
  for (const file of copied) {
    console.log(`  ${file.name}  (${formatBytes(file.bytes)})`);
  }
  if (protectedZip) {
    console.log(`  ${protectedZip.name}  (${formatBytes(protectedZip.bytes)})`);
  }
  console.log(`  RELEASE.txt`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
