import { TrackingScreen } from '@/screens/tracking-screen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackingScreen id={id} />;
}
