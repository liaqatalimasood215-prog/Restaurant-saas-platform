import { redirect } from 'next/navigation';

/** Checkout is now part of the cart page; old links still arrive at the right place. */
export default async function Page({ params }: { params: Promise<{ restaurant: string; branch: string }> }) {
  const { restaurant, branch } = await params;
  redirect(`/${restaurant}/${branch}/cart`);
}
