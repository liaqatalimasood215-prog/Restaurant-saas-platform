import { branchIdentity } from '@/lib/api';

/** Basic install details per restaurant (its own icons come with branding uploads in Phase 7). */
export async function GET(_request: Request, { params }: { params: Promise<{ restaurant: string; branch: string }> }) {
  const { restaurant, branch } = await params;
  const identity = branchIdentity(restaurant, branch);
  if (!identity) return new Response('Not found', { status: 404 });
  const start = `/${restaurant}/${branch}`;
  return Response.json({
    id: start,
    name: `${identity.name} Rider`,
    short_name: 'Rider',
    description: 'Deliveries for the restaurant\'s own riders',
    start_url: start,
    scope: start,
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: identity.primaryColor,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  });
}
