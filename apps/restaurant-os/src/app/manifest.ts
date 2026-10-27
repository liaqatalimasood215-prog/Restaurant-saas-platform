import type { MetadataRoute } from 'next';

/** One installable app for all staff; each person sees the screens of their own role after login. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lala Restaurant OS',
    short_name: 'Lala OS',
    description: 'Restaurant OS for waiters, kitchen and cashier (Phase 1 DEMO prototype)',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f5f8',
    theme_color: '#e31e24',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
