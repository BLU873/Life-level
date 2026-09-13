/**
 * Phase 8 test orchestrator (Node).
 *
 *   1. fresh dedicated test.db (prisma migrate deploy + seed)
 *   2. unit tests (pure engine/rank logic)
 *   3. E2E suite vs a spawned API server on port 4999 (27 assertions + regression)
 *   4. server restart -> persistence re-check
 *   5. cleanup (test.db + state.json)
 *
 * Self-contained: manages its own child processes and exits with a combined
 * exit code. Requires node >= 18 (global fetch).
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const TEST_DB = path.join(BACKEND, 'prisma', 'test.db');
const PORT = 4999;
const BASE = `http://localhost:${PORT}/api`;
// Absolute file: URL so the CLI and the process-local PrismaClient resolve the
// exact same database (relative paths resolve differently for each).
const ENV = { ...process.env, DATABASE_URL: `file:${TEST_DB.replace(/\\/g, '/')}`, PORT: String(PORT) };

const isWin = process.platform === 'win32';

function cmdPath(exe) {
  return isWin ? `${exe}.cmd` : exe;
}

function runSync(exe, args, opts = {}) {
  const quoted = args.map((a) => `"${a}"`).join(' ');
  const command = `${exe} ${quoted}`;
  const res = spawnSync(command, { cwd: BACKEND, encoding: 'utf8', env: ENV, shell: true, ...opts });
  if (res.status !== 0 || res.error) {
    process.stderr.write(res.stderr || String(res.error || ''));
    throw new Error(`${command} failed (${res.status})`);
  }
  return res.stdout;
}

function step(title) {
  console.log(`\n== ${title} ==`);
}

async function waitForHealth(tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
  }
  throw new Error(`API server on :${PORT} did not become healthy`);
}

function startServer() {
  const cwd = BACKEND;
  const outLog = path.join(process.env.TEMP || os.tmpdir(), 'opencode', 'phase8-server-out.log');
  const errLog = path.join(process.env.TEMP || os.tmpdir(), 'opencode', 'phase8-server-err.log');
  const outFd = fs.openSync(outLog, 'w');
  const errFd = fs.openSync(errLog, 'w');
  const proc = spawn('node', ['src/server.js'], { cwd, env: ENV, stdio: ['ignore', outFd, errFd] });
  proc.on('error', (e) => console.error('[server] spawn error', e));
  return proc;
}

function stopServer(proc) {
  if (!proc) return;
  try {
    proc.kill();
  } catch {
    /* already dead */
  }
}

async function runNodeScript(script) {
  const res = await new Promise((resolve) => {
    const child = spawn('node', [script], { cwd: BACKEND, env: ENV, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
  });
  return res;
}

function killPortHolder(port) {
  if (!isWin) return;
  try {
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `$c=Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue;if($c){$c.OwningProcess|Sort-Object -Unique|ForEach-Object{Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue}}`,
      ],
      { encoding: 'utf8' }
    );
  } catch {
    /* best effort */
  }
}

function removeTestDb() {
  killPortHolder(PORT);
  try {
    fs.rmSync(TEST_DB, { force: true });
  } catch {
    // File handle may briefly linger after the kill; retry once.
    setTimeout(() => {}, 300);
    fs.rmSync(TEST_DB, { force: true });
  }
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\Users\\srajal\\AppData\\Local\\Temp', 'opencode');
  fs.mkdirSync(tmpDir, { recursive: true });

  // 1. fresh test.db
  step('Applying migrations to test.db');
  removeTestDb();
  runSync('npx', ['prisma', 'migrate', 'deploy']);

  step('Seeding test.db');
  runSync('node', ['prisma/seed.js']);

  // 2. unit tests
  step('Unit tests (engine/rank)');
  const unitCode = await runNodeScript('tests/phase8-unit.js');

  // 3. E2E on first boot
  step('Starting test API (first boot)');
  let server = startServer();
  await waitForHealth();
  const e2eCode = await runNodeScript('tests/phase8-tests.js');

  // 4. restart persistence
  step('Restarting test API for persistence check');
  stopServer(server);
  await new Promise((r) => setTimeout(r, 300));
  server = startServer();
  await waitForHealth();
  const restartCode = await runNodeScript('tests/phase8-restart.js');

  // 5. cleanup
  stopServer(server);
  await new Promise((r) => setTimeout(r, 500));
  try {
    fs.rmSync(TEST_DB, { force: true });
  } catch {
    setTimeout(() => {}, 300);
    fs.rmSync(TEST_DB, { force: true });
  }
  fs.rmSync(path.join(BACKEND, 'tests', 'state.json'), { force: true });

  const ok = (c) => (c === 0 ? 'PASS' : 'FAIL');
  console.log('\n=== Phase 8 summary ===');
  console.log(`unit    : ${ok(unitCode)}`);
  console.log(`e2e     : ${ok(e2eCode)}`);
  console.log(`restart : ${ok(restartCode)}`);

  if (unitCode !== 0 || e2eCode !== 0 || restartCode !== 0) process.exit(1);
  console.log('ALL PHASE 8 TESTS PASSED');
}

main().catch((err) => {
  console.error('Phase 8 orchestrator error:', err.message || err);
  process.exit(1);
});