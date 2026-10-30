import { MenuScreen } from '@/screens/menu-screen';

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { c, q } = await searchParams;
  return <MenuScreen initialCategory={c} initialQuery={q} />;
}
