'use client';

import { useState } from 'react';
import { Clock, Globe, Home, Palette, Phone, QrCode, Search, Share2, Truck, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { OnlineAppView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { priceText } from '../menu/menu-parts';
import { ProductArt } from '../pos/product-art';
import type { OnlineTab } from './online-app-screen';
import { Heading, type OnlineTabProps } from './online-parts';
import { DomainSection } from './website-domain';
import { PhonePreview } from './website-previews';
import { QrSection } from './website-qr';
import { BrandingSection, ContactSection, DeliverySection, HomepageSection, HoursSection, MenuDisplaySection, SeoSection } from './website-settings';

export type WebsiteSection = 'branding' | 'homepage' | 'menu' | 'delivery' | 'hours' | 'contact' | 'domain' | 'seo' | 'qr';

const SECTIONS: { key: WebsiteSection; icon: LucideIcon }[] = [
  { key: 'branding', icon: Palette },
  { key: 'homepage', icon: Home },
  { key: 'menu', icon: UtensilsCrossed },
  { key: 'delivery', icon: Truck },
  { key: 'hours', icon: Clock },
  { key: 'contact', icon: Phone },
  { key: 'domain', icon: Globe },
  { key: 'seo', icon: Share2 },
  { key: 'qr', icon: QrCode },
];

/**
 * Website settings, one part at a time, with the real website beside them. Products, prices and categories stay in the
 * Menu page; this tab only says how they show online. Everything is DEMO: nothing is deployed and no domain is touched.
 */
export function WebsiteTab({ section, onSection, onOpenTab, ...props }: OnlineTabProps & { section: WebsiteSection; onSection: (section: WebsiteSection) => void; onOpenTab: (tab: OnlineTab) => void }) {
  const { view, canManage, busy, run } = props;
  return (
    <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <div role="group" aria-label={t('onlineApp.site.sections')} className="flex flex-wrap gap-2">
          {SECTIONS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={section === key}
              data-website-section={key}
              onClick={() => onSection(key)}
              className={cn('flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors', section === key ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900')}
            >
              <Icon className="size-4" aria-hidden />
              {t(`onlineApp.site.names.${key}`)}
            </button>
          ))}
        </div>
        {/* A new key after a save starts the form from the saved values. */}
        {section === 'branding' && <BrandingSection key={JSON.stringify(view.website.brand)} {...props} />}
        {section === 'homepage' && <HomepageSection key={JSON.stringify(view.website.homepage)} {...props} />}
        {section === 'menu' && (
          <>
            <MenuDisplaySection key={JSON.stringify(view.website.menu)} {...props} />
            <ItemsCard view={view} canManage={canManage} busy={busy} onOnline={(id, on) => void run(() => getApi().setItemOnline(id, on))} />
          </>
        )}
        {section === 'delivery' && <DeliverySection {...props} onOpenSettings={() => onOpenTab('settings')} />}
        {section === 'hours' && <HoursSection key={JSON.stringify(view.website.hours)} {...props} />}
        {section === 'contact' && <ContactSection key={JSON.stringify(view.website.contact)} {...props} />}
        {section === 'domain' && <DomainSection {...props} />}
        {section === 'seo' && <SeoSection key={JSON.stringify(view.website.seo)} {...props} />}
        {section === 'qr' && <QrSection view={view} />}
      </div>
      <div className="hidden self-start min-[1200px]:block">
        <PhonePreview path={view.customerPath} />
      </div>
    </div>
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
