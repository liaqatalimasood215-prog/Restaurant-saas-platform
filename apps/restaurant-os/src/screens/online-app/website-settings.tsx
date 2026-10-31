'use client';

import { useState, type ReactNode } from 'react';
import { Clock, Home, ImageOff, Palette, Phone, Plus, Share2, Trash2, Truck, UtensilsCrossed } from 'lucide-react';
import { MAX_DEALS, MAX_POPULAR_ITEMS, MAX_SEO_DESCRIPTION, MAX_SEO_TITLE, WEEK_DAYS, formatOpeningHours, formatPaisa, type WebsiteConfig } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Heading, customerUrl, type OnlineTabProps } from './online-parts';

const FIELD = 'min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100 disabled:text-slate-500';

/** One part of the settings: its own draft, saved as a whole; a Manager can look but not change (Owner only). */
function useDraft<K extends keyof WebsiteConfig>({ view, run }: OnlineTabProps, part: K) {
  const saved = view.website[part];
  const [draft, setDraft] = useState<WebsiteConfig[K]>(saved);
  return {
    draft,
    change: (patch: Partial<WebsiteConfig[K]>) => setDraft((d) => ({ ...d, ...patch })),
    dirty: JSON.stringify(draft) !== JSON.stringify(saved),
    save: () => void run(() => getApi().saveWebsiteConfig({ ...view.website, [part]: draft }), t('onlineApp.site.saved')),
  };
}

function Section({ icon, title, canPublish, busy, dirty, onSave, children }: { icon: typeof Palette; title: string; canPublish: boolean; busy: boolean; dirty: boolean; onSave: () => void; children: ReactNode }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <Heading icon={icon} title={title} />
        {!canPublish && <p className="text-xs font-semibold text-slate-600">{t('onlineApp.site.ownerOnly')}</p>}
        <fieldset disabled={!canPublish} className="min-w-0 space-y-4">
          {children}
        </fieldset>
        {canPublish && dirty && (
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={busy} data-website-save>
              {t('onlineApp.save')}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Text({ label, value, onChange, hint, type = 'text', maxLength, placeholder, rows }: { label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string; maxLength?: number; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-900">{label}</span>
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} maxLength={maxLength} placeholder={placeholder} className={cn(FIELD, 'py-2')} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder} className={FIELD} />
      )}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Colour({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold text-slate-900">{label}</p>
      <div className="flex gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={t('onlineApp.site.pickColour', { name: label })} className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-slate-300 bg-white p-1" />
        <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={FIELD} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export function BrandingSection(props: OnlineTabProps) {
  const { draft, change, dirty, save } = useDraft(props, 'brand');
  return (
    <Section icon={Palette} title={t('onlineApp.site.names.branding')} canPublish={props.canPublish} busy={props.busy} dirty={dirty} onSave={save}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Text label={t('onlineApp.site.logoText')} value={draft.logoText} onChange={(logoText) => change({ logoText })} maxLength={4} hint={t('onlineApp.site.logoTextHint')} />
        <Text label={t('onlineApp.site.wordmark')} value={draft.wordmark} onChange={(wordmark) => change({ wordmark })} maxLength={12} hint={t('onlineApp.site.wordmarkHint')} />
        <Colour label={t('onlineApp.site.primary')} value={draft.primaryColor} onChange={(primaryColor) => change({ primaryColor })} hint={t('onlineApp.site.primaryHint')} />
        <Colour label={t('onlineApp.site.accent')} value={draft.accentColor} onChange={(accentColor) => change({ accentColor })} hint={t('onlineApp.site.accentHint')} />
      </div>
      <Text label={t('onlineApp.site.tagline')} value={draft.tagline} onChange={(tagline) => change({ tagline })} maxLength={60} />
      <Text label={t('onlineApp.site.headline')} value={draft.headline} onChange={(headline) => change({ headline })} maxLength={60} hint={t('onlineApp.site.headlineHint')} />
      <Text label={t('onlineApp.site.description')} value={draft.description} onChange={(description) => change({ description })} maxLength={300} rows={3} hint={t('onlineApp.site.descriptionHint')} />
      <div>
        <p className="mb-2 text-sm font-bold text-slate-900">{t('onlineApp.site.pictures')}</p>
        <ul className="grid gap-2 sm:grid-cols-3" data-picture-slots>
          {[t('onlineApp.site.logo'), t('onlineApp.site.appIcon'), t('onlineApp.site.banner')].map((name) => (
            <li key={name} className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
              <ImageOff className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{name}</span>
              <Badge tone="amber">{t('onlineApp.planned')}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-slate-500">{t('onlineApp.site.picturesHint')}</p>
      </div>
    </Section>
  );
}

export function HomepageSection(props: OnlineTabProps) {
  const { view } = props;
  const { draft, change, dirty, save } = useDraft(props, 'homepage');
  const online = view.items.filter((i) => i.isOnline);
  const togglePopular = (id: string) => change({ popularItemIds: draft.popularItemIds.includes(id) ? draft.popularItemIds.filter((p) => p !== id) : [...draft.popularItemIds, id] });
  const setDeal = (index: number, patch: Partial<WebsiteConfig['homepage']['deals'][number]>) => change({ deals: draft.deals.map((d, i) => (i === index ? { ...d, ...patch } : d)) });
  return (
    <Section icon={Home} title={t('onlineApp.site.names.homepage')} canPublish={props.canPublish} busy={props.busy} dirty={dirty} onSave={save}>
      <div className="space-y-3">
        <Switch checked={draft.showCategories} onChange={(showCategories) => change({ showCategories })} disabled={!props.canPublish} label={t('onlineApp.site.showCategories')} />
        <Switch checked={draft.showDeals} onChange={(showDeals) => change({ showDeals })} disabled={!props.canPublish} label={t('onlineApp.site.showDeals')} />
        <Switch checked={draft.showPopular} onChange={(showPopular) => change({ showPopular })} disabled={!props.canPublish} label={t('onlineApp.site.showPopular')} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">{t('onlineApp.site.deals')}</h3>
        <p className="mb-2 text-xs text-slate-500">{t('onlineApp.site.dealsHint', { max: MAX_DEALS })}</p>
        <ul className="space-y-2">
          {draft.deals.map((deal, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2" data-deal-row={index}>
              <select value={deal.itemId} onChange={(e) => setDeal(index, { itemId: e.target.value })} aria-label={t('onlineApp.site.dealItem', { n: index + 1 })} className={cn(FIELD, 'min-w-44 flex-1 text-sm')}>
                {online.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input value={deal.tag} onChange={(e) => setDeal(index, { tag: e.target.value })} maxLength={24} aria-label={t('onlineApp.site.dealTag', { n: index + 1 })} placeholder={t('onlineApp.site.dealTagExample')} className={cn(FIELD, 'min-w-40 flex-1 text-sm')} />
              <button type="button" onClick={() => change({ deals: draft.deals.filter((_, i) => i !== index) })} aria-label={t('onlineApp.site.dealRemove', { n: index + 1 })} className="grid size-11 shrink-0 place-items-center rounded-xl text-red-700 hover:bg-red-50 disabled:opacity-40">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {draft.deals.length < MAX_DEALS && online[0] && (
          <Button variant="secondary" className="mt-2" onClick={() => change({ deals: [...draft.deals, { itemId: online[0]?.id ?? '', tag: '' }] })}>
            <Plus className="size-4" aria-hidden />
            {t('onlineApp.site.dealAdd')}
          </Button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">{t('onlineApp.site.popular')}</h3>
        <p className="mb-2 text-xs text-slate-500" data-popular-count>
          {t('onlineApp.site.popularHint', { n: draft.popularItemIds.length, max: MAX_POPULAR_ITEMS })}
        </p>
        <div className="flex flex-wrap gap-2">
          {online.map((item) => {
            const on = draft.popularItemIds.includes(item.id);
            return (
              <button key={item.id} type="button" aria-pressed={on} disabled={!on && draft.popularItemIds.length >= MAX_POPULAR_ITEMS} onClick={() => togglePopular(item.id)} data-popular-pick={item.name} className={cn('min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-40', on ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700')}>
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

export function MenuDisplaySection(props: OnlineTabProps) {
  const { draft, change, dirty, save } = useDraft(props, 'menu');
  return (
    <Section icon={UtensilsCrossed} title={t('onlineApp.site.names.menu')} canPublish={props.canPublish} busy={props.busy} dirty={dirty} onSave={save}>
      <p className="text-sm text-slate-700">{t('onlineApp.site.menuBody')}</p>
      <div className="space-y-3">
        <Switch checked={draft.showDescriptions} onChange={(showDescriptions) => change({ showDescriptions })} disabled={!props.canPublish} label={t('onlineApp.site.showDescriptions')} />
        <Switch checked={draft.showSoldOut} onChange={(showSoldOut) => change({ showSoldOut })} disabled={!props.canPublish} label={t('onlineApp.site.showSoldOut')} hint={t('onlineApp.site.showSoldOutHint')} />
      </div>
    </Section>
  );
}

/** Same people and same effect as online orders ON/OFF: at once, no Publish. Fee and minimum stay in one place. */
export function DeliverySection({ view, canManage, busy, run, onOpenSettings }: OnlineTabProps & { onOpenSettings: () => void }) {
  const { modes } = view.website;
  const set = (patch: Partial<typeof modes>) => void run(() => getApi().setOrderModes({ ...modes, ...patch }));
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
  return (
    <Card>
      <CardBody className="space-y-4">
        <Heading icon={Truck} title={t('onlineApp.site.names.delivery')} />
        <div className="space-y-3">
          <Switch checked={modes.delivery} disabled={!canManage || busy} onChange={(delivery) => set({ delivery })} label={t('onlineApp.site.modeDelivery')} />
          <Switch checked={modes.pickup} disabled={!canManage || busy} onChange={(pickup) => set({ pickup })} label={t('onlineApp.site.modePickup')} />
          <Switch checked={modes.dineIn} disabled={!canManage || busy} onChange={(dineIn) => set({ dineIn })} label={t('onlineApp.site.modeDineIn')} hint={t('onlineApp.site.modeDineInHint')} />
        </div>
        <dl className="space-y-1.5 rounded-xl border border-slate-200 p-3">
          {row(t('onlineApp.ordersTitle'), view.onlineOrdersEnabled ? t('onlineApp.site.on') : t('onlineApp.site.off'))}
          {row(t('onlineApp.deliveryFee'), formatPaisa(view.deliveryFee))}
          {row(t('onlineApp.minOrder'), formatPaisa(view.minOrder))}
          {row(t('onlineApp.prepMinutes'), `${view.defaultPrepMinutes} ${t('onlineApp.min')}`)}
        </dl>
        <Button variant="secondary" onClick={onOpenSettings}>
          {t('onlineApp.site.changeTerms')}
        </Button>
      </CardBody>
    </Card>
  );
}

export function HoursSection(props: OnlineTabProps) {
  const { draft, change, dirty, save } = useDraft(props, 'hours');
  const first = draft.MON;
  return (
    <Section icon={Clock} title={t('onlineApp.site.names.hours')} canPublish={props.canPublish} busy={props.busy} dirty={dirty} onSave={save}>
      <ul className="space-y-2">
        {WEEK_DAYS.map((day) => {
          const hours = draft[day];
          const name = t(`onlineApp.site.days.${day}`);
          return (
            <li key={day} className="flex flex-wrap items-center gap-x-3 gap-y-1" data-hours-day={day}>
              <span className="w-24 text-sm font-bold text-slate-900">{name}</span>
              <Switch compact checked={!hours.closed} disabled={!props.canPublish} onChange={(open) => change({ [day]: { ...hours, closed: !open } })} label={t('onlineApp.site.openOn', { day: name })} />
              {hours.closed ? (
                <span className="text-sm font-semibold text-slate-500">{t('onlineApp.site.closedDay')}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <input type="time" value={hours.open} onChange={(e) => change({ [day]: { ...hours, open: e.target.value } })} aria-label={t('onlineApp.site.opens', { day: name })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm" />
                  <span className="text-sm text-slate-500">–</span>
                  <input type="time" value={hours.close} onChange={(e) => change({ [day]: { ...hours, close: e.target.value } })} aria-label={t('onlineApp.site.closes', { day: name })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" onClick={() => change(Object.fromEntries(WEEK_DAYS.map((day) => [day, first])) as Partial<WebsiteConfig['hours']>)}>
        {t('onlineApp.site.sameEveryDay')}
      </Button>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800" data-hours-text>
        {formatOpeningHours(draft)}
      </p>
      <p className="text-xs text-slate-500">{t('onlineApp.site.hoursHint')}</p>
    </Section>
  );
}

export function ContactSection(props: OnlineTabProps) {
  const { view } = props;
  const { draft, change, dirty, save } = useDraft(props, 'contact');
  return (
    <Section icon={Phone} title={t('onlineApp.site.names.contact')} canPublish={props.canPublish} busy={props.busy} dirty={dirty} onSave={save}>
      <dl className="space-y-1 rounded-xl border border-slate-200 p-3 text-sm" data-branch-contact>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-slate-600">{t('onlineApp.site.branchPhone')}</dt>
          <dd className="font-bold text-slate-900">{view.branchPhone}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-slate-600">{t('onlineApp.site.branchAddress')}</dt>
          <dd className="font-bold text-slate-900">{view.branchAddress}</dd>
        </div>
        <p className="pt-1 text-xs text-slate-500">{t('onlineApp.site.branchHint')}</p>
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <Text label={t('onlineApp.site.whatsapp')} value={draft.whatsapp} onChange={(whatsapp) => change({ whatsapp })} type="tel" placeholder="0300-1234567" />
        <Text label={t('onlineApp.site.email')} value={draft.email} onChange={(email) => change({ email })} type="email" />
        <Text label={t('onlineApp.site.facebook')} value={draft.facebook} onChange={(facebook) => change({ facebook })} placeholder="https://facebook.com/…" />
        <Text label={t('onlineApp.site.instagram')} value={draft.instagram} onChange={(instagram) => change({ instagram })} placeholder="https://instagram.com/…" />
      </div>
    </Section>
  );
}

export function SeoSection(props: OnlineTabProps) {
  const { view } = props;
  const { draft, change, dirty, save } = useDraft(props, 'seo');
  const logo = view.website.brand.logoText;
  return (
    <Section icon={Share2} title={t('onlineApp.site.names.seo')} canPublish={props.canPublish} busy={props.busy} dirty={dirty} onSave={save}>
      <Text label={t('onlineApp.site.seoTitle')} value={draft.title} onChange={(title) => change({ title })} maxLength={MAX_SEO_TITLE} hint={t('onlineApp.site.count', { n: draft.title.length, max: MAX_SEO_TITLE })} />
      <Text label={t('onlineApp.site.seoDescription')} value={draft.description} onChange={(description) => change({ description })} maxLength={MAX_SEO_DESCRIPTION} rows={2} hint={t('onlineApp.site.count', { n: draft.description.length, max: MAX_SEO_DESCRIPTION })} />
      <div>
        <p className="mb-1 text-sm font-bold text-slate-900">{t('onlineApp.site.seoPreview')}</p>
        <div className="rounded-xl border border-slate-200 p-3" data-seo-preview>
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-800 text-[0.625rem] font-black text-white">{logo}</span>
            <span className="truncate text-xs text-slate-500">{customerUrl(view.customerPath)}</span>
          </div>
          <p className="mt-1 text-lg font-semibold text-blue-800">{draft.title || t('onlineApp.site.seoTitle')}</p>
          <p className="text-sm text-slate-600">{draft.description}</p>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge tone="amber">{t('onlineApp.site.seoNotConnected')}</Badge>
        {t('onlineApp.site.seoHint')}
      </p>
    </Section>
  );
}
