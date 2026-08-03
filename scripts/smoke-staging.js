const DEFAULT_API_URL = 'https://speedcubers-pulse-backend-production.up.railway.app';
const DEFAULT_EMAIL = 'edu@edu.com';
const DEFAULT_PASSWORD = 'Abcd1234';

const apiUrl = (process.env.STAGING_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
const loginEmail = process.env.STAGING_LOGIN_EMAIL || DEFAULT_EMAIL;
const loginPassword = process.env.STAGING_LOGIN_PASSWORD || DEFAULT_PASSWORD;

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.STAGING_FRONTEND_ORIGIN || 'https://speedcubers-pulse-frontend.vercel.app',
      ...options.headers,
    },
  });

  const body = await readJson(response);
  return { response, body };
}

function assertStatus(name, response, expected) {
  if (response.status !== expected) {
    throw new Error(`${name} expected ${expected}, got ${response.status}`);
  }
}

async function checkHealth() {
  const { response, body } = await request('/health', { headers: {} });
  assertStatus('health', response, 200);

  if (body?.status !== 'ok') {
    throw new Error('health response did not return status ok');
  }

  console.log('ok health');
}

async function checkRanking() {
  const { response, body } = await request('/api/v1/ranking?event=3x3');
  assertStatus('ranking', response, 200);

  if (!Array.isArray(body?.ranking)) {
    throw new Error('ranking response did not include a ranking array');
  }

  console.log(`ok ranking (${body.ranking.length} entries)`);
}

async function checkLogin() {
  const { response, body } = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: loginEmail, password: loginPassword }),
  });
  assertStatus('login', response, 200);

  if (!body?.user?.id || !body?.tokens?.accessToken) {
    throw new Error('login response did not include user and access token');
  }

  console.log(`ok login (${body.user.username})`);
}

try {
  console.log(`smoke target ${apiUrl}`);
  await checkHealth();
  await checkRanking();
  await checkLogin();
  console.log('staging smoke checks passed');
} catch (error) {
  console.error('staging smoke checks failed');
  console.error(error.message);
  process.exitCode = 1;
}
