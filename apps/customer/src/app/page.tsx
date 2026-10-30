import Link from 'next/link';
import { t } from '@/i18n';
import { demoStoreList } from '@/lib/api';

/** Start page of the prototype. On the real platform customers arrive through their restaurant's own link. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-5 px-4 py-10">
      <div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{t('demo.label')}</span>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{t('app.startTitle')}</h1>
        <p className="mt-2 text-stone-600">{t('app.startBody')}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {demoStoreList().map((store) => (
          <li key={store.path}>
            <Link href={store.path} className="flex h-full flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <span className="grid size-12 place-items-center rounded-2xl text-sm font-black text-white" style={{ background: store.primaryColor }}>
                {store.logoText}
              </span>
              <span className="text-lg font-extrabold tracking-tight">{store.name}</span>
              <span className="text-sm text-stone-600">{store.tagline}</span>
              <span className="mt-auto text-sm font-extrabold" style={{ color: store.primaryColor }}>
                {t('app.open')} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-stone-400">{t('app.poweredBy')}</p>
    </main>
  );
}
