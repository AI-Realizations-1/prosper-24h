import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    // SLO : p95 < 500ms, p99 < 2000ms, taux d'erreur < 1%
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.API_TOKEN || '';

export default function () {
  const res = http.get(`${BASE_URL}/api/studies`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'body non vide': (r) => r.body.length > 0,
  });
  sleep(1);
}
