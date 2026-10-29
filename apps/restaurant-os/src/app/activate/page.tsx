import { ActivationScreen } from '@/screens/activation-screen';

/** Public page (no login): a staff member opens the single-use link from the Owner and creates a PIN. */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <ActivationScreen token={typeof token === 'string' ? token : ''} />;
}
