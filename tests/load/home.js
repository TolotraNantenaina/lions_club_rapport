import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 70 },
        { duration: '1m', target: 70 },
        { duration: '20s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1000'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    const response = http.get(`${BASE_URL}/`);

    check(response, {
        'status is 200': (res) => res.status === 200,
        'page responds under 1s': (res) => res.timings.duration < 1000,
    });

    sleep(1);
}
