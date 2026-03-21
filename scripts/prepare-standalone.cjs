const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function syncDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function main() {
  const root = process.cwd();
  const nextDir = path.join(root, '.next');
  const standaloneDir = path.join(nextDir, 'standalone');

  if (!fs.existsSync(standaloneDir)) {
    console.error('[prepare-standalone] missing .next/standalone, run build first');
    process.exit(1);
  }

  syncDir(path.join(nextDir, 'static'), path.join(standaloneDir, '.next', 'static'));
  syncDir(path.join(root, 'public'), path.join(standaloneDir, 'public'));

  console.log('[prepare-standalone] synced .next/static and public');
}

main();
