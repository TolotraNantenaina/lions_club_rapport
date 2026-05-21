import './globals.css';
import { PWARegister } from './components/pwaRegister';

export const metadata = {
  title: 'Lions Club Rapport',
  description: 'Générez un compte-rendu de réunion Lions Club avec aperçu et export JPG.',
  applicationName: 'Lions Club Rapport',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lions Rapport',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/ico_app_pv_lc.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/ico_app_pv_lc.png',
  },
  openGraph: {
    title: 'Lions Club Rapport',
    description: 'Générez un compte-rendu de réunion Lions Club avec aperçu et export JPG.',
    url: 'https://lions-club-cr.ingenosya.net/',
    siteName: 'Lions Club Rapport',
    images: [
      {
        url: 'https://lions-club-cr.ingenosya.net/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lions Club Rapport - Générateur de compte-rendu de réunion',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lions Club Rapport',
    description: 'Générez un compte-rendu de réunion Lions Club avec aperçu et export JPG.',
    images: ['https://lions-club-cr.ingenosya.net/og-image.png'],
  },
};

export const viewport = {
  themeColor: '#173d68',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/ico_app_pv_lc.png" />
      </head>
      <body className="bg-body">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
