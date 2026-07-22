/** @type {import('next').NextConfig} */
const pkg = require('./package.json');

// Identifiant unique par build : sert à versionner le Service Worker.
// `env` est inliné dans le bundle client au moment du `next build`, donc la
// valeur reste stable même si next.config.js est ré-évalué au démarrage.
const BUILD_ID = process.env.BUILD_ID || `${pkg.version}.${Date.now().toString(36)}`;

const NO_CACHE = {
  key: 'Cache-Control',
  value: 'public, max-age=0, must-revalidate',
};

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  async rewrites() {
    return {
      // `beforeFiles` : la réécriture prime sur le service statique de Next,
      // dont la liste de fichiers est figée au démarrage. Sans ça, un logo
      // uploadé à chaud resterait en 404 jusqu'au redémarrage du conteneur.
      beforeFiles: [
        {
          source: '/clubsIcons/:path*',
          destination: '/api/club-logo/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          NO_CACHE,
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [NO_CACHE],
      },
      {
        // Volumes bind (docker-compose) : le contenu change hors déploiement.
        // must-revalidate => requête conditionnelle (304) au lieu d'un blocage
        // sur une copie périmée, tout en gardant le corps en cache HTTP.
        source: '/data/:path*',
        headers: [NO_CACHE],
      },
      {
        source: '/clubsIcons/:path*',
        headers: [NO_CACHE],
      },
      {
        source: '/api/assets-manifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
