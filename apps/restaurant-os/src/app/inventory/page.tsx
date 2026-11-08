import { SectionPage } from '@/screens/section-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ recipe?: string | string[]; cooking?: string | string[] }> }) {
  const { recipe, cooking } = await searchParams;
  return <SectionPage sectionKey="inventory" recipeItemId={typeof recipe === 'string' ? recipe : undefined} cookingDate={typeof cooking === 'string' ? cooking : undefined} />;
}
