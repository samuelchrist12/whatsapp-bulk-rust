/**
 * Prepares the self-contained WhatsApp Engine runtime (runtime/node.exe + runtime/engine.cjs)
 * for Tauri NSIS installer bundling and standalone Portable/Testing packages.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SIDECAR_ENTRY = path.join(ROOT_DIR, 'sidecar', 'server.js');
const RUNTIME_DIR = path.join(ROOT_DIR, 'src-tauri', 'runtime');
const OUT_ENGINE = path.join(RUNTIME_DIR, 'engine.cjs');
const OUT_NODE = path.join(RUNTIME_DIR, 'node.exe');

const FALLBACK_MODULES = path.resolve(ROOT_DIR, '..', '04_Scripts_dan_Generator', 'node_modules');
const LOCAL_MODULES = path.join(ROOT_DIR, 'sidecar', 'node_modules');

fs.mkdirSync(RUNTIME_DIR, { recursive: true });

// 1. Bundle sidecar/server.js + pure-JS dependencies into single engine.cjs
const nodePaths = [LOCAL_MODULES, FALLBACK_MODULES].filter((p) => fs.existsSync(p));
const env = {
  ...process.env,
  NODE_PATH: nodePaths.join(path.delimiter)
};

console.log('[prepare_runtime] Bundling sidecar/server.js -> src-tauri/runtime/engine.cjs ...');

const cmd = [
  'npx',
  'esbuild',
  `"${SIDECAR_ENTRY}"`,
  '--bundle',
  '--minify',
  '--platform=node',
  '--target=node20',
  '--format=cjs',
  '--external:@aws-sdk/client-s3',
  '--external:typescript',
  '--external:bufferutil',
  '--external:utf-8-validate',
  `"--outfile=${OUT_ENGINE}"`
].join(' ');

execSync(cmd, {
  cwd: ROOT_DIR,
  env,
  stdio: 'inherit'
});

const engineSizeMb = (fs.statSync(OUT_ENGINE).size / (1024 * 1024)).toFixed(2);
console.log(`[prepare_runtime] Built engine.cjs (${engineSizeMb} MB)`);

// 2. Stage portable node.exe binary
if (process.platform === 'win32') {
  const srcNode = process.execPath;
  let needCopy = !fs.existsSync(OUT_NODE);
  if (!needCopy) {
    needCopy = fs.statSync(srcNode).size !== fs.statSync(OUT_NODE).size;
  }
  if (needCopy) {
    console.log(`[prepare_runtime] Copying portable Node runtime from ${srcNode} ...`);
    fs.copyFileSync(srcNode, OUT_NODE);
  }
  const nodeSizeMb = (fs.statSync(OUT_NODE).size / (1024 * 1024)).toFixed(2);
  console.log(`[prepare_runtime] Staged node.exe (${nodeSizeMb} MB)`);
}

console.log('[prepare_runtime] Self-contained runtime ready.');
