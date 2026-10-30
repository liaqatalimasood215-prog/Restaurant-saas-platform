import { ProductScreen } from '@/screens/product-screen';

export default async function Page({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ line?: string }> }) {
  const { itemId } = await params;
  const { line } = await searchParams;
  return <ProductScreen itemId={itemId} lineId={line ?? null} />;
}
