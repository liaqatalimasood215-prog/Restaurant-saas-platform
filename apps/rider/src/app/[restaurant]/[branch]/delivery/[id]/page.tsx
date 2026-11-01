import { DeliveryScreen } from '@/screens/delivery-screen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeliveryScreen id={id} />;
}
