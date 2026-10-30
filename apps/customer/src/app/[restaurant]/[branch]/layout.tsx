import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { storeIdentity } from '@/lib/api';
import { StoreShell } from '@/screens/store-shell';

type Params = Promise<{ restaurant: string; branch: string }>;

/** Each restaurant's own title and install details, from one website. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { restaurant, branch } = await params;
  const store = storeIdentity(restaurant, branch);
  if (!store) return { title: 'Lala Online Ordering (DEMO)' };
  return { title: `${store.name} — Order online`, description: store.tagline, manifest: `/${restaurant}/${branch}/manifest.webmanifest` };
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const { restaurant, branch } = await params;
  return { themeColor: storeIdentity(restaurant, branch)?.primaryColor };
}

export default async function Layout({ params, children }: { params: Params; children: ReactNode }) {
  const { restaurant, branch } = await params;
  return (
    <StoreShell restaurant={restaurant} branch={branch}>
      {children}
    </StoreShell>
  );
}
