import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'PANGEA CARBON Africa — Carbon Credit Intelligence',
  description: 'Plateforme MRV de crédits carbone pour projets d\'énergie renouvelable en Afrique',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
