import { SectionPage } from '@/screens/section-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  return <SectionPage sectionKey="orders" query={typeof q === 'string' ? q : undefined} />;
}
