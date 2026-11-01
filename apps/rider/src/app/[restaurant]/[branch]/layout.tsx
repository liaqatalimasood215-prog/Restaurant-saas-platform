import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { branchIdentity } from '@/lib/api';
import { RiderShell } from '@/screens/rider-shell';

type Params = Promise<{ restaurant: string; branch: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { restaurant, branch } = await params;
  const identity = branchIdentity(restaurant, branch);
  if (!identity) return { title: 'Lala Rider App (DEMO)' };
  return { title: `${identity.name} — Rider App`, manifest: `/${restaurant}/${branch}/manifest.webmanifest` };
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const { restaurant, branch } = await params;
  return { themeColor: branchIdentity(restaurant, branch)?.primaryColor };
}

export default async function Layout({ params, children }: { params: Params; children: ReactNode }) {
  const { restaurant, branch } = await params;
  return (
    <RiderShell restaurant={restaurant} branch={branch}>
      {children}
    </RiderShell>
  );
}
