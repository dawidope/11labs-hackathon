import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Storyladnia - Interaktywne Bajki AI',
  description: 'Twórz magiczne, spersonalizowane bajki dla dzieci z pomocą sztucznej inteligencji',
  keywords: ['bajki', 'dzieci', 'AI', 'ElevenLabs', 'storytelling', 'interaktywne'],
  authors: [{ name: 'Storyladnia Team' }],
  openGraph: {
    title: 'Storyladnia - Interaktywne Bajki AI',
    description: 'Twórz magiczne, spersonalizowane bajki dla dzieci z pomocą sztucznej inteligencji',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <head>
        <link 
          rel="icon" 
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏰</text></svg>" 
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
