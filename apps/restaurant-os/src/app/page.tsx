'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { canUseApp, HOME_SECTION } from '@restaurant-saas/shared';
import { LoadingState } from '@/components/ui/states';
import { useSession } from '@/lib/session';

/** Home: send each role to its own start screen (Owner/Manager/Cashier → POS, Waiter → Tables, Kitchen → KDS). */
export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user.role;

  useEffect(() => {
    if (role && canUseApp(role, 'restaurant-os')) router.replace(`/${HOME_SECTION[role as keyof typeof HOME_SECTION]}`);
  }, [role, router]);

  return <LoadingState />;
}
