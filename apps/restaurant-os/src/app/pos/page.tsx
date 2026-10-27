import { SectionPage } from '@/screens/section-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ table?: string | string[] }> }) {
  const { table } = await searchParams;
  return <SectionPage sectionKey="pos" tableId={typeof table === 'string' ? table : undefined} />;
}
