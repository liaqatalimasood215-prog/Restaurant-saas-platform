import { SectionPage } from '@/screens/section-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ recipe?: string | string[]; cooking?: string | string[]; food?: string | string[]; waste?: string | string[] }> }) {
  const { recipe, cooking, food, waste } = await searchParams;
  return <SectionPage sectionKey="inventory" recipeItemId={typeof recipe === 'string' ? recipe : undefined} cookingDate={typeof cooking === 'string' ? cooking : undefined} foodReview={food === 'review'} wastePending={waste === 'pending'} />;
}
