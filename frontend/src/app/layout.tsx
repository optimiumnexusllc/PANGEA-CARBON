import type { Metadata } from 'next';
import '../styles/globals.css';
import { LangProvider } from '@/lib/lang-context';

export const metadata: Metadata = {
  title: 'PANGEA CARBON — Carbon Credit Intelligence Africa',
  description: 'MRV platform for carbon credits from renewable energy projects in Africa | Plateforme MRV de crédits carbone Afrique',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
