import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    // SLO : p95 < 500ms, taux d'erreur < 1%
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.E2E_EMAIL || 'test@prosper.dev';
const PASSWORD = __ENV.E2E_PASSWORD || 'password123';

export default function () {
  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });
  const token = loginRes.json('accessToken');

  sleep(0.5);

  // 2. Accès protégé
  const studiesRes = http.get(`${BASE_URL}/api/studies`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(studiesRes, { 'studies 200': (r) => r.status === 200 });

  sleep(0.5);

  // 3. Logout
  const logoutRes = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  check(logoutRes, { 'logout 200': (r) => r.status === 200 });

  sleep(1);
}
