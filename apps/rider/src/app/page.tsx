import { redirect } from 'next/navigation';
import { DEMO_START_PATH } from '@/lib/api';

/** Prototype only: on the real platform each restaurant gives its riders their own link. */
export default function Home() {
  redirect(DEMO_START_PATH);
}
