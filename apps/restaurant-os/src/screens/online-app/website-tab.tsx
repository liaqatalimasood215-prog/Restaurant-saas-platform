'use client';

import { useMemo, useState } from 'react';
import { Copy, Globe, QrCode, Search, UtensilsCrossed } from 'lucide-react';
import qrcode from 'qrcode-generator';
import type { OnlineAppView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { priceText } from '../menu/menu-parts';
import { ProductArt } from '../pos/product-art';
import { Heading, customerUrl, type OnlineTabProps } from './online-parts';

export function WebsiteTab({ view, canManage, busy, run }: OnlineTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <LinkCard path={view.customerPath} />
        <DomainCard />
      </div>
      <div className="min-w-0">
        <ItemsCard view={view} canManage={canManage} busy={busy} onOnline={(id, on) => void run(() => getApi().setItemOnline(id, on))} />
      </div>
    </div>
  );
}

/** The restaurant owns its domain; connecting one is a later step and needs the owner's approval. */
function DomainCard() {
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Heading icon={Globe} title={t('onlineApp.domainTab.title')} />
          <Badge tone="amber">{t('onlineApp.planned')}</Badge>
        </div>
        <p className="text-sm text-slate-700">{t('onlineApp.domainTab.ownership')}</p>
        <p className="text-sm text-slate-600">{t('onlineApp.domainTab.subdomain', { example: 'restaurantname.lalaorders.com' })}</p>
      </CardBody>
    </Card>
  );
}

function LinkCard({ path }: { path: string }) {
  const toast = useToast();
  const url = customerUrl(path);
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
