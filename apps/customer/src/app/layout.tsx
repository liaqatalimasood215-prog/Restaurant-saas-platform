import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-store', display: 'swap' });

export const metadata: Metadata = {
  title: 'Lala Online Ordering (DEMO)',
  description: 'Order food online. Phase 2 UI prototype with sample data.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
