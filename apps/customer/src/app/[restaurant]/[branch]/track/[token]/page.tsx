import { TrackScreen } from '@/screens/track-screen';

export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  return <TrackScreen token={token} isNew={isNew === '1'} />;
}
