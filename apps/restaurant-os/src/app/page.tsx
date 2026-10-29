'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { canUseApp, homeSectionFor, type OsRole } from '@restaurant-saas/shared';
import { LoadingState } from '@/components/ui/states';
import { useSession } from '@/lib/session';

/** Home: send each role to its own start screen (Owner/Manager/Cashier → POS, Waiter → Tables, Kitchen → KDS). */
export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user.role;
  // The usual home screen, or the first one this person may open when the Owner switched it off.
  const home = session && role && canUseApp(role, 'restaurant-os') ? homeSectionFor(role as OsRole, session.permissions) : null;

  useEffect(() => {
    if (home) router.replace(`/${home}`);
  }, [home, router]);

  return <LoadingState />;
}
