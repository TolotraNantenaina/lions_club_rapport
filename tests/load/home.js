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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3009';

// Parcours utilisateur standard : formulaire + données clubs.
// /parametre est volontairement exclu (page admin/import).
const USER_ENDPOINTS = [
    { name: 'home', path: '/' },
    { name: 'clubs data', path: '/data/clubs.json' },
];

export default function () {
    const responses = http.batch(
        USER_ENDPOINTS.map(({ path }) => ['GET', `${BASE_URL}${path}`]),
    );

    USER_ENDPOINTS.forEach(({ name }, index) => {
        const response = responses[index];

        check(response, {
            [`${name} status is 200`]: (res) => res.status === 200,
            [`${name} responds under 1s`]: (res) => res.timings.duration < 1000,
        });
    });

    sleep(1);
}
