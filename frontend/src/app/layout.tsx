import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'PANGEA CARBON — Carbon Credit Intelligence Africa',
  description: "Plateforme MRV de crédits carbone pour projets d'énergie renouvelable en Afrique",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
