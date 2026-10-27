import { SectionPage } from '@/screens/section-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ table?: string | string[] }> }) {
  const { table } = await searchParams;
  return <SectionPage sectionKey="waiter" tableId={typeof table === 'string' ? table : undefined} />;
}
