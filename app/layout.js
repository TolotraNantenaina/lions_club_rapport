import './globals.css';
import { PWARegister } from './components/pwaRegister';

export const metadata = {
  title: 'Lions Club Rapport',
  description: 'Générez un compte-rendu de réunion Lions Club avec aperçu et export JPG.',
  opensGraph: {
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

export default function RootLayout({ children }) {
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <html lang="fr">
      <body className="bg-body">
        {isDev && (
          <script
            dangerouslySetInnerHTML={{
              __html: "if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(reg){reg.unregister();});});}",
            }}
          />
        )}
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
