'use client';

import { useMemo, useState } from 'react';
import { Copy, QrCode, Search, Truck, Wifi, WifiOff, UtensilsCrossed } from 'lucide-react';
import qrcode from 'qrcode-generator';
import { MAX_PREP_MINUTES, checkOnlineSettings, paisaToInput, parseRupees, type OnlineAppView } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { AppPreviewCard } from '../app-preview-screen';
import { priceText } from '../menu/menu-parts';
import { ProductArt } from '../pos/product-art';

/** The Customer App's development address (PROJECT_RULES.md §3); the real domain comes with hosting. */
const CUSTOMER_APP_ORIGIN = 'http://localhost:3001';

/**
 * Online App page (Preview 5, MASTER_PROMPT.md §5.5): online orders ON/OFF, delivery fee, minimum order,
 * preparation time, the customer link and QR code, and which items are online. The Customer App preview and
 * Open Full App stay PLACEHOLDERS until Phase 2.
 */
export function OnlineAppScreen() {
  const { allowed } = useSession();
  const online = useApiQuery(() => getApi().getOnlineApp(), []);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const canManage = allowed('menu.manage');
  const header = <ScreenHeader title={t('nav.online-app')} status="DEMO_PROTOTYPE" description={t('onlineApp.description')} />;
  if (online.loading && !online.data) return (<>{header}<LoadingState /></>);
  if (!online.data) return (<>{header}<ErrorState message={online.error?.message} onRetry={online.reload} /></>);
  const view = online.data;

  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) toast.show({ tone: 'success', title: done });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {header}
      {!canManage && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('onlineApp.readOnly')}</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Card className={cn('border-2', view.onlineOrdersEnabled ? 'border-green-300' : 'border-red-300')}>
            <CardBody className="flex flex-wrap items-center gap-3">
              <span className={cn('grid size-11 place-items-center rounded-xl', view.onlineOrdersEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                {view.onlineOrdersEnabled ? <Wifi className="size-6" aria-hidden /> : <WifiOff className="size-6" aria-hidden />}
              </span>
              <div className="min-w-48 flex-1">
                <h2 className="text-lg font-extrabold text-slate-900" data-online-state>
                  {view.onlineOrdersEnabled ? t('onlineApp.ordersOn') : t('onlineApp.ordersOff')}
                </h2>
                <p className="text-xs text-slate-500">{t('onlineApp.ordersHint')}</p>
              </div>
              <Switch
                compact
                checked={view.onlineOrdersEnabled}
                disabled={!canManage || busy}
                onChange={(on) => void run(() => getApi().setOnlineOrdersEnabled(on), on ? t('onlineApp.nowOn') : t('onlineApp.nowOff'))}
                label={t('onlineApp.ordersTitle')}
              />
            </CardBody>
          </Card>

          {/* A new key after a save or a change in Settings starts the form from the saved values. */}
          <TermsCard key={`${view.deliveryFee}-${view.minOrder}-${view.defaultPrepMinutes}`} view={view} canManage={canManage} />
          <LinkCard path={view.customerPath} />
          <ItemsCard view={view} canManage={canManage} busy={busy} onOnline={(id, on) => void run(() => getApi().setItemOnline(id, on))} />
        </div>
        <div className="space-y-4 self-start">
          <AppPreviewCard app="customer" />
        </div>
      </div>
    </>
  );
}

function TermsCard({ view, canManage }: { view: OnlineAppView; canManage: boolean }) {
  const toast = useToast();
  const [fee, setFee] = useState(paisaToInput(view.deliveryFee));
  const [min, setMin] = useState(paisaToInput(view.minOrder));
  const [prep, setPrep] = useState(String(view.defaultPrepMinutes));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = fee !== paisaToInput(view.deliveryFee) || min !== paisaToInput(view.minOrder) || prep !== String(view.defaultPrepMinutes);

  const save = async () => {
    const deliveryFee = parseRupees(fee);
    const minOrder = parseRupees(min);
    const defaultPrepMinutes = /^\s*\d+\s*$/.test(prep) ? Number(prep) : Number.NaN;
    const problem = checkOnlineSettings({ deliveryFee, minOrder, defaultPrepMinutes });
    if (problem || deliveryFee === null || minOrder === null) {
      return setError(problem === 'MINUTES_INVALID' ? t('onlineApp.minutesInvalid', { max: MAX_PREP_MINUTES }) : t('onlineApp.moneyInvalid'));
    }
    setBusy(true);
    setError(null);
    try {
      await getApi().saveOnlineSettings({ deliveryFee, minOrder, defaultPrepMinutes });
      toast.show({ tone: 'success', title: t('onlineApp.saved') });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full min-w-0 border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100 disabled:text-slate-500';
  const box = 'flex items-center border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600';
  const money = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="block">
      <span className="mb-1 block font-bold text-slate-900">{label}</span>
      <span className="flex">
        <span className={cn(box, 'rounded-l-xl border-r-0')} aria-hidden>
          Rs.
        </span>
        <input value={value} onChange={(e) => (onChange(e.target.value), setError(null))} disabled={!canManage} inputMode="decimal" aria-label={label} className={cn(field, 'rounded-r-xl')} />
      </span>
    </label>
  );

  return (
    <Card>
      <CardBody className="space-y-3">
        <Heading icon={Truck} title={t('onlineApp.terms')} />
        <div className="grid gap-3 sm:grid-cols-3">
          {money(t('onlineApp.deliveryFee'), fee, setFee)}
          {money(t('onlineApp.minOrder'), min, setMin)}
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('onlineApp.prepMinutes')}</span>
            <span className="flex">
              <input value={prep} onChange={(e) => (setPrep(e.target.value), setError(null))} disabled={!canManage} inputMode="numeric" aria-label={t('onlineApp.prepMinutes')} className={cn(field, 'rounded-l-xl')} />
              <span className={cn(box, 'rounded-r-xl border-l-0')} aria-hidden>
                {t('onlineApp.min')}
              </span>
            </span>
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        {canManage && dirty && (
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={busy}>
              {t('onlineApp.save')}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function LinkCard({ path }: { path: string }) {
  const toast = useToast();
  const url = `${CUSTOMER_APP_ORIGIN}${path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ tone: 'success', title: t('onlineApp.copied') });
    } catch {
      toast.show({ tone: 'error', title: t('onlineApp.copyFailed') });
    }
  };
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Heading icon={QrCode} title={t('onlineApp.linkTitle')} />
          <Badge tone="amber">{t('onlineApp.linkStatus')}</Badge>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <QrImage text={url} label={t('onlineApp.qrLabel', { url })} />
          <div className="min-w-56 flex-1 space-y-2">
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('onlineApp.linkLabel')}</span>
              <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t('onlineApp.linkLabel')} className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm" />
            </label>
            <Button variant="secondary" onClick={() => void copy()}>
              <Copy className="size-4" aria-hidden />
              {t('onlineApp.copy')}
            </Button>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('onlineApp.linkHint')}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/** A QR code drawn in the browser (free library, no outside service). */
function QrImage({ text, label }: { text: string; label: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { size: count, path: d };
  }, [text]);
  const quiet = 4;
  return (
    <svg
      role="img"
      aria-label={label}
      data-qr={text}
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      shapeRendering="crispEdges"
      className="size-40 shrink-0 rounded-xl border border-slate-200 bg-white"
    >
      <path d={path} fill="#000" />
    </svg>
  );
}

function ItemsCard({ view, canManage, busy, onOnline }: { view: OnlineAppView; canManage: boolean; busy: boolean; onOnline: (id: string, on: boolean) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const categoryName = (id: string) => view.categories.find((c) => c.id === id)?.name ?? '';
  const visible = view.items.filter((i) => !q || i.name.toLowerCase().includes(q) || categoryName(i.categoryId).toLowerCase().includes(q));
  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-3">
        <Heading icon={UtensilsCrossed} title={t('onlineApp.itemsTitle')} />
        <p className="text-sm font-semibold text-slate-700" data-online-count>
          {t('onlineApp.itemsCount', { n: view.items.filter((i) => i.isOnline).length, of: view.items.length })}
        </p>
        <p className="text-xs text-slate-500">{t('onlineApp.itemsHint')}</p>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('onlineApp.search')}
            aria-label={t('onlineApp.search')}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
          />
        </label>
        {visible.length === 0 ? (
          <EmptyState title={t('onlineApp.noMatch')} />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {visible.map((item) => (
              <li key={item.id} className={cn('flex items-center gap-3 p-2', !item.isOnline && 'bg-slate-50')} data-online-item={item.name}>
                <ProductArt name={item.name} categoryName={categoryName(item.categoryId)} className="size-11 shrink-0 rounded-lg" emojiClassName="text-2xl" />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-bold', item.isOnline ? 'text-slate-900' : 'text-slate-500')}>{item.name}</p>
                  <p className="truncate text-xs text-slate-500">{priceText(item)}</p>
                </div>
                {!item.isAvailable && <Badge tone="red">{t('onlineApp.outOfStock')}</Badge>}
                <Switch compact checked={item.isOnline} disabled={!canManage || busy} onChange={(on) => onOnline(item.id, on)} label={t('onlineApp.onlineFor', { name: item.name })} />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function Heading({ icon: Icon, title }: { icon: typeof Truck; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      {title}
    </h2>
  );
}
