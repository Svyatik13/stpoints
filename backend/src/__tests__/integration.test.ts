/**
 * Lightweight integration tests for ST-Points API.
 * Run with: npm run test
 *
 * Requires the backend server to be running on PORT (default 4000)
 * and a clean-ish database (the test user will be created fresh).
 */

const BASE = process.env.TEST_API_URL || 'http://localhost:4000/api';

let accessCookie = '';
let refreshCookie = '';
const TEST_USER = `__test_${Date.now()}`;
const TEST_PASS = 'TestPass1234!';
let passCode = '';

let passed = 0;
let failed = 0;

async function req(
  endpoint: string,
  opts: { method?: string; body?: any; cookie?: string } = {},
): Promise<{ status: number; data: any; cookies: string[] }> {
  const { method = 'GET', body, cookie } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const cookies = res.headers.getSetCookie?.() ?? [];
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, cookies };
}

function parseCookies(setCookies: string[]): string {
  return setCookies.map(c => c.split(';')[0]).join('; ');
}

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ── Tests ──

async function testHealthAndCSRF() {
  console.log('\n📋 Health & CSRF');

  // GET should pass CSRF
  const { status } = await req('/auth/me');
  assert('GET /auth/me returns (no crash)', status === 401 || status === 200);

  // POST without Origin in production should still work in dev mode
  const { status: s2 } = await req('/auth/login', { method: 'POST', body: { username: 'x', password: 'y' } });
  assert('POST /auth/login reachable', s2 === 401 || s2 === 400 || s2 === 429 || s2 === 403);
}

async function testGetPassCode() {
  console.log('\n🔑 Fetch PassCode (needs admin or system setting)');
  // Try to get the pass code from admin endpoint — will fail without auth
  // We'll try the system settings directly via a known code
  // For testing, we'll just attempt registration and see
  passCode = process.env.TEST_PASS_CODE || '';
  if (!passCode) {
    console.log('  ⚠️  TEST_PASS_CODE env not set — will try registration without code or skip');
  }
}

async function testRegistration() {
  console.log('\n📝 Registration');

  // Missing fields
  const { status: s1 } = await req('/auth/register', { method: 'POST', body: {} });
  assert('Register with empty body fails', s1 === 400 || s1 === 403);

  // Short password
  const { status: s2 } = await req('/auth/register', {
    method: 'POST',
    body: { username: TEST_USER, password: 'short', passCode },
  });
  assert('Register with short password fails', s2 === 400);

  if (passCode) {
    // Valid registration
    const r = await req('/auth/register', {
      method: 'POST',
      body: { username: TEST_USER, password: TEST_PASS, passCode },
    });
    assert('Register with valid data succeeds', r.status === 201);
    if (r.cookies.length > 0) {
      const cookies = parseCookies(r.cookies);
      accessCookie = cookies;
      assert('Register sets cookies', cookies.includes('accessToken'));
    }
  } else {
    console.log('  ⏭️  Skipping valid registration (no TEST_PASS_CODE)');
  }
}

async function testLogin() {
  console.log('\n🔐 Login');

  // Wrong password
  const { status: s1 } = await req('/auth/login', {
    method: 'POST',
    body: { username: TEST_USER, password: 'wrongpass!' },
  });
  assert('Login with wrong password fails', s1 === 401 || s1 === 400);

  if (passCode) {
    // Correct login
    const r = await req('/auth/login', {
      method: 'POST',
      body: { username: TEST_USER, password: TEST_PASS },
    });
    assert('Login with correct credentials succeeds', r.status === 200);
    if (r.cookies.length > 0) {
      accessCookie = parseCookies(r.cookies);
      refreshCookie = accessCookie;
      assert('Login sets cookies', accessCookie.includes('accessToken'));
    }
  } else {
    console.log('  ⏭️  Skipping valid login (no user created)');
  }
}

async function testAuthMe() {
  console.log('\n👤 Auth /me');

  const { status: s1 } = await req('/auth/me');
  assert('/me without cookie returns 401', s1 === 401);

  if (accessCookie) {
    const r = await req('/auth/me', { cookie: accessCookie });
    assert('/me with cookie returns 200', r.status === 200);
    assert('/me returns username', r.data?.user?.username === TEST_USER);
  }
}

async function testWallet() {
  console.log('\n💎 Wallet');

  if (!accessCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  const { status, data } = await req('/wallet/balance', { cookie: accessCookie });
  assert('Balance returns 200', status === 200);
  assert('Balance has balance field', typeof data?.balance === 'string');

  const tx = await req('/wallet/transactions?page=1&limit=5', { cookie: accessCookie });
  assert('Transactions returns 200', tx.status === 200);
  assert('Transactions has array', Array.isArray(tx.data?.transactions));
}

async function testTransfer() {
  console.log('\n📤 Transfer');

  if (!accessCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  // Transfer to self should fail
  const r1 = await req('/wallet/transfer', {
    method: 'POST',
    body: { recipient: TEST_USER, amount: '1.000000' },
    cookie: accessCookie,
  });
  assert('Transfer to self fails', r1.status === 400);

  // Transfer to non-existent user
  const r2 = await req('/wallet/transfer', {
    method: 'POST',
    body: { recipient: '__nonexistent_user_xyz__', amount: '1.000000' },
    cookie: accessCookie,
  });
  assert('Transfer to non-existent user fails', r2.status === 400 || r2.status === 404);

  // Transfer with insufficient balance (new user has 0)
  const r3 = await req('/wallet/transfer', {
    method: 'POST',
    body: { recipient: 'admin', amount: '1000000.000000' },
    cookie: accessCookie,
  });
  assert('Transfer with insufficient balance fails', r3.status === 400);
}

async function testMining() {
  console.log('\n⛏️ Mining');

  if (!accessCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  const stats = await req('/mining/stats', { cookie: accessCookie });
  assert('Mining stats returns 200', stats.status === 200);

  const session = await req('/mining/session', { cookie: accessCookie });
  assert('Mining session check returns 200', session.status === 200);
}

async function testLeaderboard() {
  console.log('\n🏆 Leaderboard');

  if (!accessCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  const r1 = await req('/leaderboard?type=balance', { cookie: accessCookie });
  assert('Leaderboard balance returns 200', r1.status === 200);
  assert('Leaderboard has array', Array.isArray(r1.data?.leaderboard));

  const r2 = await req('/leaderboard?type=mining', { cookie: accessCookie });
  assert('Leaderboard mining returns 200', r2.status === 200);

  const r3 = await req('/leaderboard?type=invalid', { cookie: accessCookie });
  assert('Leaderboard invalid type returns 400', r3.status === 400);
}

async function testProfile() {
  console.log('\n👤 Profile');

  if (!accessCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  const r = await req('/profile', { cookie: accessCookie });
  assert('Profile returns 200', r.status === 200);
  assert('Profile has user', !!r.data?.user);
  assert('Profile has stats', !!r.data?.stats);
  assert('Profile stats has totalMined', typeof r.data?.stats?.totalMined === 'string');
}

async function testTokenRefresh() {
  console.log('\n🔄 Token Refresh');

  if (!refreshCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  const r = await req('/auth/refresh', { method: 'POST', cookie: refreshCookie });
  assert('Refresh returns 200', r.status === 200);
  if (r.cookies.length > 0) {
    accessCookie = parseCookies(r.cookies);
    assert('Refresh issues new cookies', accessCookie.includes('accessToken'));
  }
}

async function testLogout() {
  console.log('\n🚪 Logout');

  if (!accessCookie) {
    console.log('  ⏭️  Skipping (no auth)');
    return;
  }

  const r = await req('/auth/logout', { method: 'POST', cookie: accessCookie });
  assert('Logout returns 200', r.status === 200);

  const me = await req('/auth/me', { cookie: accessCookie });
  assert('After logout, /me returns 401', me.status === 401);
}

// ── Runner ──

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  ST-Points API Integration Tests');
  console.log(`  Base: ${BASE}`);
  console.log('═══════════════════════════════════════');

  try {
    await testHealthAndCSRF();
    await testGetPassCode();
    await testRegistration();
    await testLogin();
    await testAuthMe();
    await testWallet();
    await testTransfer();
    await testMining();
    await testLeaderboard();
    await testProfile();
    await testTokenRefresh();
    await testLogout();
  } catch (err) {
    console.error('\n💥 Fatal error:', err);
    failed++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
