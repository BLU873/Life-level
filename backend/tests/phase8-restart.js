/**
 * Restart-persistence check — run AFTER the API server has restarted on the
 * same test.db. Reads test state written by phase8-tests.js and verifies the
 * achievements / history / weekly aggregates survived the restart.
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4999/api';
const state = JSON.parse(fs.readFileSync(path.join(__dirname, 'state.json'), 'utf8'));

let passed = 0;
let failed = 0;
function assert(name, cond) {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
  }
}

async function run() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  const loginJson = await login.json();
  assert('login works after restart', login.status === 200 && loginJson.success === true);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const act = await fetch(`${BASE}/activity`, {
    headers: { Cookie: cookie },
  }).then((r) => r.json());
  assert('quest history survives restart', act.success && act.data.items.some((i) => i.type === 'QUEST_COMPLETION'));

  const ach = await fetch(`${BASE}/achievements`, { headers: { Cookie: cookie } }).then((r) => r.json());
  const first = ach.data.achievements.find((a) => a.code === 'FIRST_STEP');
  assert('achievement unlock survives restart', !!first?.unlockedAt);

  const wk = await fetch(`${BASE}/activity/weekly`, { headers: { Cookie: cookie } }).then((r) => r.json());
  const sumMatch = wk.data.daily.reduce((s, d) => s + d.xpEarned, 0) === wk.data.xpEarned;
  assert('weekly aggregates recompute consistently after restart', sumMatch && wk.data.questsCompleted >= 1);

  const ch = await fetch(`${BASE}/character`, { headers: { Cookie: cookie } }).then((r) => r.json());
  assert('character derived metadata survives restart', ch.data.character.rank?.code === 'BEGINNER' && ch.data.character.totalQuestsCompleted >= 1);

  async function loginAs(creds) {
    const l = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (l.status !== 200) throw new Error(`login failed for ${creds.email}`);
    return l.headers.get('set-cookie').split(';')[0];
  }

  if (state.focus) {
    const fc = await loginAs({ email: state.focus.email, password: state.focus.password });
    const foc = await fetch(`${BASE}/focus`, { headers: { Cookie: fc } }).then((r) => r.json());
    assert('completed focus session count survives restart', foc.data.history.sessionsCompleted === 5);
    const hist = await fetch(`${BASE}/focus/history`, { headers: { Cookie: fc } }).then((r) => r.json());
    assert('focus history route recomputes after restart', hist.data.sessionsCompleted >= 5 && typeof hist.data.week.seconds === 'number');
  }

  if (state.rewards) {
    const rc = await loginAs({ email: state.rewards.email, password: state.rewards.password });
    const rew = await fetch(`${BASE}/rewards`, { headers: { Cookie: rc } }).then((r) => r.json());
    assert('custom reward persists after restart', rew.data.rewards.some((x) => x.name === state.rewards.rewardTitle));
  }

  if (state.goals) {
    const gc = await loginAs({ email: state.goals.email, password: state.goals.password });
    const g = await fetch(`${BASE}/goals`, { headers: { Cookie: gc } }).then((r) => r.json());
    assert('goal targets persist after restart', g.data.daily.goal === state.goals.dailyGoal && g.data.weekly.goal === state.goals.weeklyGoal);
    assert('claimed goal stays claimed after restart', g.data.daily.claimed === true);
  }

  if (state.avatar) {
    const ac = await loginAs({ email: state.avatar.email, password: state.avatar.password });
    const av = await fetch(`${BASE}/character`, { headers: { Cookie: ac } }).then((r) => r.json());
    assert('custom avatar persists after restart', av.data.character.avatarKey === state.avatar.expectedKey && !!av.data.character.avatarImage);
  }

  console.log(`\nPASS ${passed} / ${passed + failed}`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error('Fatal restart test error:', err);
  process.exitCode = 1;
});