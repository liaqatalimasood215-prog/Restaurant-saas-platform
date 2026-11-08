import { SectionPage } from '@/screens/section-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ recipe?: string | string[] }> }) {
  const { recipe } = await searchParams;
  return <SectionPage sectionKey="inventory" recipeItemId={typeof recipe === 'string' ? recipe : undefined} />;
}
