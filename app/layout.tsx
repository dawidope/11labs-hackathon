import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Storylandia Live',
  description: 'Create magical, personalized stories for children with AI',
  keywords: ['stories', 'children', 'AI', 'ElevenLabs', 'storytelling', 'interactive'],
  authors: [{ name: 'Storylandia Team' }],
  openGraph: {
    title: 'Storylandia Live',
    description: 'Create magical, personalized stories for children with AI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✨</text></svg>"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
