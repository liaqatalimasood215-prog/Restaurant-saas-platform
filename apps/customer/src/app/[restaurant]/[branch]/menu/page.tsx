import { MenuScreen } from '@/screens/menu-screen';

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; filter?: string }> }) {
  const { c, q, filter } = await searchParams;
  return <MenuScreen initialCategory={c} initialQuery={q} openFilter={filter === '1'} />;
}
