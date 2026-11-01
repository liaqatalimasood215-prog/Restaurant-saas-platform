import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-rider', display: 'swap' });

export const metadata: Metadata = {
  title: 'Lala Rider App (DEMO)',
  description: 'Deliveries for the restaurant\'s own riders. Phase 3 UI prototype with sample data.',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
