'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ClosingTime, CookingChecks } from './cooking-checks';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  Bike,
  BookOpen,
  CalendarClock,
  ChartColumn,
  ChefHat,
  ChevronRight,
  CookingPot,
  CreditCard,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  MAX_PREP_MINUTES,
  MAX_RECEIPT_TEXT,
  MAX_SERVICE_PERCENT,
  MAX_STATION_MINUTES,
  MAX_TAX_PERCENT,
  bpsToInput,
  calculateBill,
  checkBranchSettings,
  checkStation,
  cleanName,
  formatPaisa,
  normalizePhone,
  paisaToInput,
  parsePercent,
  parseRupees,
  type KitchenStation,
  type SettingsField,
  type SettingsView,
} from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type SettingsInput } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';

/** The form keeps what the Owner types; numbers are read when saving. */
interface Form {
  restaurantName: string;
  branchName: string;
  phone: string;
  address: string;
  tax: string;
  pricesIncludeTax: boolean;
  taxOnService: boolean;
  taxOnDelivery: boolean;
  serviceCharge: string;
  roundToRupee: boolean;
  deliveryFee: string;
  minOrder: string;
  prepMinutes: string;
  dayStart: string;
  receiptHeader: string;
  receiptFooter: string;
}

function formOf(view: SettingsView): Form {
  const { restaurant, branch } = view;
  return {
    restaurantName: restaurant.name,
    branchName: branch.name,
    phone: branch.phone,
    address: branch.address,
    tax: bpsToInput(branch.tax.rateBps),
    pricesIncludeTax: branch.tax.pricesIncludeTax,
    taxOnService: branch.tax.appliesToServiceCharge,
    taxOnDelivery: branch.tax.appliesToDeliveryFee,
    serviceCharge: bpsToInput(branch.serviceChargeBps),
    roundToRupee: branch.roundToRupee,
    deliveryFee: paisaToInput(branch.deliveryFee),
    minOrder: paisaToInput(branch.minOrder),
    prepMinutes: String(branch.defaultPrepMinutes),
    dayStart: branch.businessDayStart,
    receiptHeader: branch.receiptHeader,
    receiptFooter: branch.receiptFooter,
  };
}

const whole = (text: string) => (/^\s*\d+\s*$/.test(text) ? Number(text) : Number.NaN);

/** The feature cards, in the order of the owner's Settings picture (2026-11-03). */
type CardId = 'restaurant' | 'bill' | 'delivery' | 'stations' | 'menu' | 'recipes' | 'payments' | 'hours' | 'printers' | 'notifications' | 'system' | 'roles';
type RestaurantTab = 'details' | 'branches' | 'locations' | 'contact';

const CARDS: { id: CardId; icon: LucideIcon; soon?: boolean }[] = [
  { id: 'restaurant', icon: Store },
  { id: 'bill', icon: ReceiptText },
  { id: 'delivery', icon: Bike },
  { id: 'stations', icon: ChefHat },
  { id: 'menu', icon: BookOpen },
  { id: 'recipes', icon: CookingPot, soon: true },
  { id: 'payments', icon: CreditCard },
  { id: 'hours', icon: CalendarClock },
  { id: 'printers', icon: Printer },
  { id: 'notifications', icon: Bell },
  { id: 'system', icon: SlidersHorizontal },
  { id: 'roles', icon: ShieldCheck },
];
const RESTAURANT_TABS: RestaurantTab[] = ['details', 'branches', 'locations', 'contact'];

/** Where a field lives, so a save error opens the card that shows it. */
const FIELD_PLACE: Record<SettingsField, [CardId, RestaurantTab?]> = {
  restaurantName: ['restaurant', 'details'],
  branchName: ['restaurant', 'branches'],
  phone: ['restaurant', 'contact'],
  address: ['restaurant', 'locations'],
  tax: ['bill'],
  serviceCharge: ['bill'],
  deliveryFee: ['delivery'],
  minOrder: ['delivery'],
  prepMinutes: ['delivery'],
  dayStart: ['delivery'],
  receiptHeader: ['printers'],
  receiptFooter: ['printers'],
};

const linkButton =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Settings (Preview 5, MASTER_PROMPT.md §7.1; Owner only): feature cards first, the chosen card's settings
 * next to them (phone and tablet: instead of them, with a back button). Restaurant and branch, tax and service
 * charge, delivery, business day, receipt and kitchen stations are edited here; the other cards point to the
 * page that already holds them or say what comes later. Bill settings apply to new bills only — every order
 * keeps the settings it was made with.
 */
export function SettingsScreen() {
  const settings = useApiQuery(() => getApi().getSettings(), []);
  const [open, setOpen] = useState<CardId>('restaurant');
  const [restaurantTab, setRestaurantTab] = useState<RestaurantTab>('details');
  /** Phone and tablet: true while one card's settings replace the card list. */
  const [detail, setDetail] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const choose = (card: CardId, tab?: RestaurantTab) => {
    setOpen(card);
    if (tab) setRestaurantTab(tab);
    setDetail(true);
  };
  useEffect(() => {
    // Bring the opened settings into view when they start above the screen.
    const panel = panelRef.current;
    if (detail && panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
  }, [open, detail]);

  const header = <ScreenHeader icon={Settings} title={t('nav.settings')} status="DEMO_PROTOTYPE" description={t('settings.description')} />;
  if (settings.loading && !settings.data) return (<>{header}<LoadingState /></>);
  if (!settings.data) return (<>{header}<ErrorState message={settings.error?.message} onRetry={settings.reload} /></>);
  const view = settings.data;
  const card = CARDS.find((c) => c.id === open)!;

  return (
    <>
      {header}
      <div className="grid items-start gap-5 pb-20 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <nav aria-label={t('settings.cards.label')} className={cn('grid gap-3 sm:grid-cols-2', detail && 'hidden xl:grid')}>
          {CARDS.map(({ id, icon: Icon, soon }) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              aria-current={open === id ? 'true' : undefined}
              data-settings-card={id}
              className={cn(
                'flex min-h-24 w-full items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:border-brand/50 hover:shadow-md',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                // The chosen card is marked only where its settings show next to the cards.
                open === id ? 'border-slate-200 bg-white xl:border-brand xl:bg-brand-soft/70 xl:shadow-md xl:ring-1 xl:ring-brand' : 'border-slate-200 bg-white',
              )}
            >
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl text-brand', open === id ? 'bg-brand-soft xl:bg-white' : 'bg-brand-soft')}>
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-extrabold text-slate-900">
                  {t(`settings.sections.${id}`)}
                  {soon && <Badge tone="dark">{t('settings.cards.soon')}</Badge>}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-slate-600">{t(`settings.cards.${id}`)}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
            </button>
          ))}
        </nav>

        <section ref={panelRef} aria-label={t(`settings.sections.${open}`)} className={cn('min-w-0 scroll-mt-4 space-y-3', !detail && 'hidden xl:block')}>
          <button type="button" onClick={() => setDetail(false)} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-2 font-semibold text-slate-700 hover:bg-slate-100 xl:hidden">
            <ArrowLeft className="size-5" aria-hidden />
            {t('settings.cards.back')}
          </button>
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <card.icon className="size-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-xl font-extrabold text-slate-900">
                    {t(`settings.sections.${open}`)}
                    {card.soon && <Badge tone="dark">{t('settings.cards.soon')}</Badge>}
                  </h2>
                  <p className="text-sm text-slate-600">{open === 'restaurant' ? t('settings.restaurantIntro') : t(`settings.cards.${open}`)}</p>
                </div>
              </div>
              {/* Always mounted: unsaved changes survive switching cards. A new key after every save starts the form again from the saved values. */}
              <SettingsForm key={JSON.stringify(formOf(view))} view={view} open={open} restaurantTab={restaurantTab} onTab={setRestaurantTab} onOpen={choose} />
              {/* Outside the keyed form, so an open station dialog survives a settings save. */}
              {open === 'stations' && <StationsSection view={view} />}
              {open !== 'stations' && <InfoPanel card={open} view={view} />}
            </CardBody>
          </Card>
        </section>
      </div>
    </>
  );
}

/** The cards whose settings live on another page or come later. */
function InfoPanel({ card, view }: { card: CardId; view: SettingsView }) {
  switch (card) {
    case 'menu':
      return (
        <Block>
          <p className="text-sm text-slate-700">{t('settings.menuPanel')}</p>
          <PageLink href="/menu" label={t('settings.openMenu')} />
        </Block>
      );
    case 'recipes':
      return <Soon>{t('settings.recipesSoon')}</Soon>;
    case 'payments':
      return (
        <Block>
          <p className="text-sm text-slate-700">{t('settings.paymentsPanel')}</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {PAYMENT_METHODS.map((method) => (
              <li key={method} className="flex items-center justify-between gap-2 p-3">
                <span className="font-semibold text-slate-900">{t(`settings.paymentMethods.${method}`)}</span>
                <Badge tone="green">{t('settings.active')}</Badge>
              </li>
            ))}
          </ul>
          <Soon>{t('settings.paymentsSoon')}</Soon>
        </Block>
      );
    case 'hours':
      return (
        <Block>
          <p className="text-sm text-slate-700">{t('settings.hoursPanel')}</p>
          <PageLink href="/online-app" label={t('settings.openOnlineApp')} />
          <Soon>{t('settings.hoursSoon')}</Soon>
        </Block>
      );
    case 'notifications':
      return (
        <Block>
          <p className="text-sm text-slate-700">{t('settings.notificationsPanel')}</p>
          <Soon>{t('settings.notificationsSoon')}</Soon>
          <CookingChecks />
          <ClosingTime />
        </Block>
      );
    case 'system':
      return (
        <Block>
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {[
              [t('settings.currency'), t('settings.currencyValue')],
              [t('settings.language'), t('settings.languageValue')],
              [t('settings.timeZone'), view.branch.timezone],
              [t('settings.numberFormat'), formatPaisa(123_456_700)],
            ].map(([term, value]) => (
              <div key={term} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <dt className="font-semibold text-slate-900">{term}</dt>
                <dd className="text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">{t('settings.systemSoon')}</p>
        </Block>
      );
    case 'roles':
      return (
        <Block>
          <p className="text-sm text-slate-700">{t('settings.rolesPanel')}</p>
          <PageLink href="/staff" label={t('settings.openStaff')} />
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{t('settings.managerReports')}</p>
        </Block>
      );
    default:
      return null;
  }
}

function PageLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(linkButton, 'w-fit')}>
      {label}
      <ExternalLink className="size-4" aria-hidden />
    </Link>
  );
}

function SettingsForm({
  view,
  open,
  restaurantTab,
  onTab,
  onOpen,
}: {
  view: SettingsView;
  open: CardId;
  restaurantTab: RestaurantTab;
  onTab: (tab: RestaurantTab) => void;
  onOpen: (card: CardId, tab?: RestaurantTab) => void;
}) {
  const toast = useToast();
  const saved = formOf(view);
  const [form, setForm] = useState<Form>(saved);
  const [error, setError] = useState<{ field: SettingsField | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingBranch, setEditingBranch] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const input = (): SettingsInput => ({
    restaurantName: form.restaurantName,
    branchName: form.branchName,
    phone: form.phone,
    address: form.address,
    tax: { rateBps: parsePercent(form.tax) ?? -1, pricesIncludeTax: form.pricesIncludeTax, appliesToServiceCharge: form.taxOnService, appliesToDeliveryFee: form.taxOnDelivery },
    serviceChargeBps: parsePercent(form.serviceCharge) ?? -1,
    roundToRupee: form.roundToRupee,
    deliveryFee: parseRupees(form.deliveryFee) ?? -1,
    minOrder: parseRupees(form.minOrder) ?? -1,
    defaultPrepMinutes: whole(form.prepMinutes),
    businessDayStart: form.dayStart,
    receiptHeader: form.receiptHeader,
    receiptFooter: form.receiptFooter,
  });

  const save = async () => {
    const check = checkBranchSettings({
      restaurantName: form.restaurantName,
      branchName: form.branchName,
      phone: form.phone,
      address: form.address,
      taxBps: parsePercent(form.tax),
      serviceChargeBps: parsePercent(form.serviceCharge),
      deliveryFee: parseRupees(form.deliveryFee),
      minOrder: parseRupees(form.minOrder),
      defaultPrepMinutes: whole(form.prepMinutes),
      businessDayStart: form.dayStart,
      receiptHeader: form.receiptHeader,
      receiptFooter: form.receiptFooter,
    });
    if (check) {
      onOpen(...FIELD_PLACE[check.field]);
      if (check.field === 'branchName') setEditingBranch(true);
      return setError({
        field: check.field,
        text: t(`settings.errors.${check.problem}`, { tax: MAX_TAX_PERCENT, service: MAX_SERVICE_PERCENT, prep: MAX_PREP_MINUTES, receipt: MAX_RECEIPT_TEXT }),
      });
    }
    setBusy(true);
    setError(null);
    try {
      await getApi().saveSettings(input());
      toast.show({ tone: 'success', title: t('settings.saved'), body: t('settings.savedBody') });
    } catch (err) {
      setError({ field: null, text: err instanceof Error ? err.message : t('states.errorBody') });
    } finally {
      setBusy(false);
    }
  };

  // A live example: what a Rs. 1,000 dine-in bill and a Rs. 1,000 delivery would cost with these settings.
  const taxBps = parsePercent(form.tax);
  const serviceBps = parsePercent(form.serviceCharge);
  const fee = parseRupees(form.deliveryFee);
  const example = (orderType: 'DINE_IN' | 'DELIVERY') =>
    taxBps === null || serviceBps === null || fee === null
      ? null
      : calculateBill({
          orderType,
          lines: [{ unitPrice: 100_000, quantity: 1 }],
          deliveryFee: fee,
          settings: {
            tax: { rateBps: taxBps, pricesIncludeTax: form.pricesIncludeTax, appliesToServiceCharge: form.taxOnService, appliesToDeliveryFee: form.taxOnDelivery },
            serviceChargeBps: serviceBps,
            roundToRupee: form.roundToRupee,
          },
        });
  const dineIn = example('DINE_IN');
  const delivery = example('DELIVERY');

  const field = (key: SettingsField) =>
    cn('min-h-12 w-full rounded-xl border bg-white px-3 text-base', error?.field === key ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300');
  const label = 'mb-1 block font-bold text-slate-900';
  const suffixed = (key: SettingsField, value: string, onChange: (v: string) => void, suffix: string, aria: string, prefix = false) => (
    <span className="flex">
      {prefix && (
        <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600" aria-hidden>
          {suffix}
        </span>
      )}
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" aria-label={aria} className={cn(field(key), prefix ? 'rounded-l-none' : 'rounded-r-none')} />
      {!prefix && (
        <span className="flex items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600" aria-hidden>
          {suffix}
        </span>
      )}
    </span>
  );

  const restaurantName = (
    <label className="block">
      <span className={label}>{t('settings.restaurantName')}</span>
      <input value={form.restaurantName} onChange={(e) => set('restaurantName', e.target.value)} aria-label={t('settings.restaurantName')} className={field('restaurantName')} />
    </label>
  );
  const branchName = (
    <label className="block">
      <span className={label}>{t('settings.branchName')}</span>
      <input value={form.branchName} onChange={(e) => set('branchName', e.target.value)} aria-label={t('settings.branchName')} className={field('branchName')} />
    </label>
  );
  const phone = (
    <label className="block">
      <span className={label}>{t('settings.phone')}</span>
      <input
        value={form.phone}
        onChange={(e) => set('phone', e.target.value)}
        onBlur={() => set('phone', normalizePhone(form.phone) ?? form.phone)}
        inputMode="tel"
        aria-label={t('settings.phone')}
        className={field('phone')}
      />
    </label>
  );
  const address = (
    <label className="block">
      <span className={label}>{t('settings.address')}</span>
      <input value={form.address} onChange={(e) => set('address', e.target.value)} aria-label={t('settings.address')} className={field('address')} />
    </label>
  );
  const quickButton = 'inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-brand/50';

  return (
    <>
      {open === 'restaurant' && (
        <>
          <div role="tablist" aria-label={t('settings.restaurantTabs.label')} className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {RESTAURANT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={restaurantTab === tab}
                onClick={() => onTab(tab)}
                className={cn(
                  'min-h-11 flex-1 shrink-0 rounded-xl px-2.5 text-sm font-semibold whitespace-nowrap',
                  restaurantTab === tab ? 'bg-brand text-white shadow-sm' : 'text-slate-700 hover:bg-white',
                )}
              >
                {t(`settings.restaurantTabs.${tab}`)}
              </button>
            ))}
          </div>

          {restaurantTab === 'details' && <Block>{restaurantName}</Block>}

          {restaurantTab === 'branches' && (
            <Block>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{t('settings.branchesTitle', { n: 1 })}</h3>
                  <p className="text-sm text-slate-600">{t('settings.branchesHint')}</p>
                </div>
                <Button disabled title={t('settings.addBranchSoon')}>
                  <Plus className="size-4" aria-hidden />
                  {t('settings.addBranch')}
                </Button>
              </div>
              <div className="rounded-xl border border-slate-200 p-3" data-branch-row>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Store className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                      {form.branchName || '—'} <Badge tone="green">{t('settings.active')}</Badge>
                    </p>
                    <p className="flex items-center gap-1 text-sm text-slate-600">
                      <MapPin className="size-4 shrink-0" aria-hidden />
                      {form.address || '—'}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setEditingBranch((v) => !v)} aria-expanded={editingBranch} aria-label={t('settings.editBranchLabel', { name: form.branchName })}>
                    <Pencil className="size-4" aria-hidden />
                    {editingBranch ? t('settings.closeBranch') : t('settings.editBranch')}
                  </Button>
                  <Link href="/summary" className={cn(linkButton, 'px-3')} aria-label={t('settings.branchReport', { name: form.branchName })} title={t('settings.branchReport', { name: form.branchName })}>
                    <ChartColumn className="size-5" aria-hidden />
                  </Link>
                </div>
                {editingBranch && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    {branchName}
                    {phone}
                    {address}
                  </div>
                )}
              </div>
              <Soon>{t('settings.addBranchSoon')}</Soon>
            </Block>
          )}

          {restaurantTab === 'locations' && <Block>{address}</Block>}

          {restaurantTab === 'contact' && (
            <Block>
              {phone}
              <p className="text-sm text-slate-700">{t('settings.brandingHint')}</p>
              <PageLink href="/online-app" label={t('settings.openOnlineApp')} />
            </Block>
          )}

          <div className="rounded-2xl border border-red-100 bg-brand-soft/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-extrabold text-brand">
              <Zap className="size-5" aria-hidden />
              {t('settings.quickActions')}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={quickButton} onClick={() => (onTab('branches'), setEditingBranch(true))}>
                <Store className="size-4 text-brand" aria-hidden />
                {t('settings.quick.branch')}
              </button>
              <button type="button" className={quickButton} onClick={() => onOpen('hours')}>
                <CalendarClock className="size-4 text-brand" aria-hidden />
                {t('settings.quick.hours')}
              </button>
              <Link href="/menu" className={quickButton}>
                <BookOpen className="size-4 text-brand" aria-hidden />
                {t('settings.quick.menu')}
              </Link>
              <button type="button" className={quickButton} onClick={() => onOpen('printers')}>
                <Printer className="size-4 text-brand" aria-hidden />
                {t('settings.quick.printers')}
              </button>
            </div>
          </div>
        </>
      )}

      {open === 'bill' && (
        <Block note={t('settings.billNote')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>{t('settings.tax')}</span>
              {suffixed('tax', form.tax, (v) => set('tax', v), '%', t('settings.tax'))}
              <span className="mt-1 block text-xs text-slate-500">{t('settings.taxHint')}</span>
            </label>
            <label className="block">
              <span className={label}>{t('settings.serviceCharge')}</span>
              {suffixed('serviceCharge', form.serviceCharge, (v) => set('serviceCharge', v), '%', t('settings.serviceCharge'))}
              <span className="mt-1 block text-xs text-slate-500">{t('settings.serviceHint')}</span>
            </label>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <Switch checked={form.pricesIncludeTax} onChange={(v) => set('pricesIncludeTax', v)} label={t('settings.pricesIncludeTax')} hint={t('settings.pricesIncludeTaxHint')} />
            <Switch checked={form.taxOnService} onChange={(v) => set('taxOnService', v)} label={t('settings.taxOnService')} />
            <Switch checked={form.taxOnDelivery} onChange={(v) => set('taxOnDelivery', v)} label={t('settings.taxOnDelivery')} />
            <Switch checked={form.roundToRupee} onChange={(v) => set('roundToRupee', v)} label={t('settings.roundToRupee')} hint={t('settings.roundHint')} />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm" data-settings-example>
            <p className="mb-1 font-bold text-slate-900">{t('settings.exampleTitle')}</p>
            {dineIn && delivery ? (
              <ul className="space-y-1 text-slate-700">
                <li>
                  {t('settings.exampleDineIn')}: <strong>{formatPaisa(dineIn.total)}</strong>{' '}
                  <span className="text-xs text-slate-500">({t('settings.exampleParts', { tax: formatPaisa(dineIn.tax || dineIn.taxIncludedInPrices), service: formatPaisa(dineIn.serviceCharge) })})</span>
                </li>
                <li>
                  {t('settings.exampleDelivery')}: <strong>{formatPaisa(delivery.total)}</strong>{' '}
                  <span className="text-xs text-slate-500">({t('settings.exampleDeliveryParts', { tax: formatPaisa(delivery.tax || delivery.taxIncludedInPrices), fee: formatPaisa(delivery.deliveryFee) })})</span>
                </li>
              </ul>
            ) : (
              <p className="text-slate-500">{t('settings.exampleWaiting')}</p>
            )}
          </div>
        </Block>
      )}

      {open === 'delivery' && (
        <>
          <Block>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className={label}>{t('settings.deliveryFee')}</span>
                {suffixed('deliveryFee', form.deliveryFee, (v) => set('deliveryFee', v), 'Rs.', t('settings.deliveryFee'), true)}
              </label>
              <label className="block">
                <span className={label}>{t('settings.minOrder')}</span>
                {suffixed('minOrder', form.minOrder, (v) => set('minOrder', v), 'Rs.', t('settings.minOrder'), true)}
              </label>
              <label className="block">
                <span className={label}>{t('settings.prepMinutes')}</span>
                {suffixed('prepMinutes', form.prepMinutes, (v) => set('prepMinutes', v), t('settings.min'), t('settings.prepMinutes'))}
              </label>
            </div>
            <p className="text-xs text-slate-500">{t('settings.deliveryHint')}</p>
          </Block>
          <Block title={t('settings.sections.day')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={label}>{t('settings.dayStart')}</span>
                <input type="time" value={form.dayStart} onChange={(e) => set('dayStart', e.target.value)} aria-label={t('settings.dayStart')} className={field('dayStart')} />
              </label>
              <div>
                <span className={label}>{t('settings.timeZone')}</span>
                <p className="flex min-h-12 items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 font-semibold text-slate-600">{view.branch.timezone}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{t('settings.dayHint', { time: form.dayStart || '06:00' })}</p>
          </Block>
        </>
      )}

      {open === 'printers' && (
        <>
          <Soon>{t('settings.printersSoon')}</Soon>
          <Block title={t('settings.sections.receipt')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                <label className="block">
                  <span className={label}>{t('settings.receiptHeader')}</span>
                  <textarea value={form.receiptHeader} onChange={(e) => set('receiptHeader', e.target.value)} rows={2} maxLength={MAX_RECEIPT_TEXT + 20} aria-label={t('settings.receiptHeader')} className={cn(field('receiptHeader'), 'py-2')} />
                </label>
                <label className="block">
                  <span className={label}>{t('settings.receiptFooter')}</span>
                  <textarea value={form.receiptFooter} onChange={(e) => set('receiptFooter', e.target.value)} rows={2} maxLength={MAX_RECEIPT_TEXT + 20} aria-label={t('settings.receiptFooter')} className={cn(field('receiptFooter'), 'py-2')} />
                </label>
              </div>
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 font-mono text-xs text-slate-700" aria-label={t('settings.receiptPreview')}>
                <p className="whitespace-pre-line text-center font-bold">{form.receiptHeader || '—'}</p>
                <p className="text-center">{form.branchName} · {form.phone}</p>
                <p className="my-2 border-y border-dashed border-slate-300 py-1">1 × Classic Pizza ........ {formatPaisa(85_000)}</p>
                <p className="whitespace-pre-line text-center">{form.receiptFooter || '—'}</p>
              </div>
            </div>
          </Block>
        </>
      )}

      {/* Save bar: always in view while there are changes, on every card */}
      <div className={cn('sticky bottom-20 z-10 md:bottom-3', !dirty && !error && 'hidden')}>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          {error ? (
            <p role="alert" className="flex-1 text-sm font-semibold text-red-700">
              {error.text}
            </p>
          ) : (
            <p className="flex-1 text-sm font-semibold text-slate-700">{t('settings.unsaved')}</p>
          )}
          <Button variant="secondary" disabled={busy} onClick={() => (setForm(saved), setError(null))}>
            {t('settings.undo')}
          </Button>
          <Button disabled={busy || !dirty} onClick={() => void save()}>
            <Save className="size-4" aria-hidden />
            {t('settings.save')}
          </Button>
        </div>
      </div>
    </>
  );
}

/** One group of settings inside the open card. */
function Block({ title, note, children }: { title?: string; note?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>}
      {note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{note}</p>}
      {children}
    </div>
  );
}

/** What is not built yet, said plainly (PROJECT_RULES.md §17). */
function Soon({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      <Badge tone="dark">{t('settings.cards.soon')}</Badge>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

// ── Kitchen stations ─────────────────────────────────────────────────────────────────────────

function StationsSection({ view }: { view: SettingsView }) {
  const toast = useToast();
  const [editing, setEditing] = useState<KitchenStation | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
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
  const iconButton = 'grid size-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30';

  return (
    <Block>
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-slate-600">{t('settings.stations.hint')}</p>
        <Button variant="secondary" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          {t('settings.stations.add')}
        </Button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {view.stations.map(({ station, itemCount, openTickets, chefCount }, index) => {
          const used = itemCount + openTickets + chefCount > 0;
          return (
            <li key={station.id} className="flex flex-wrap items-center gap-2 p-2 pl-3" data-station-row={station.name}>
              <div className="min-w-40 flex-1">
                <p className="font-bold text-slate-900">
                  {station.name} {station.autoReady && <Badge tone="green">{t('settings.stations.autoReady')}</Badge>}
                </p>
                <p className="text-xs text-slate-500">
                  {t('settings.stations.times', { warn: station.warnMinutes, late: station.lateMinutes })} · {t('settings.stations.usage', { items: itemCount, chefs: chefCount, tickets: openTickets })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className={iconButton} disabled={busy || index === 0} onClick={() => void run(() => getApi().moveStation(station.id, index))} aria-label={t('settings.stations.moveUp', { name: station.name })}>
                  <ArrowUp className="size-5" aria-hidden />
                </button>
                <button type="button" className={iconButton} disabled={busy || index === view.stations.length - 1} onClick={() => void run(() => getApi().moveStation(station.id, index + 2))} aria-label={t('settings.stations.moveDown', { name: station.name })}>
                  <ArrowDown className="size-5" aria-hidden />
                </button>
                <button type="button" className={iconButton} disabled={busy} onClick={() => setEditing(station)} aria-label={t('settings.stations.edit', { name: station.name })}>
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(iconButton, 'text-red-700')}
                  disabled={busy || used}
                  title={used ? t('settings.stations.inUse') : undefined}
                  onClick={() => void run(() => getApi().removeStation(station.id), t('settings.stations.removed', { name: station.name }))}
                  aria-label={t('settings.stations.remove', { name: station.name })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {editing && (
        <StationDialog
          station={editing === 'new' ? null : editing}
          takenNames={view.stations.filter((s) => editing === 'new' || s.station.id !== editing.id).map((s) => s.station.name)}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            toast.show({ tone: 'success', title: t('settings.stations.saved', { name: saved.name }) });
          }}
        />
      )}
      <Soon>{t('settings.stationsPrinterSoon')}</Soon>
    </Block>
  );
}

function StationDialog({
  station,
  takenNames,
  onClose,
  onSaved,
}: {
  station: KitchenStation | null;
  takenNames: string[];
  onClose: () => void;
  onSaved: (station: KitchenStation) => void;
}) {
  const [name, setName] = useState(station?.name ?? '');
  const [autoReady, setAutoReady] = useState(station?.autoReady ?? false);
  const [warn, setWarn] = useState(String(station?.warnMinutes ?? 10));
  const [late, setLate] = useState(String(station?.lateMinutes ?? 20));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fieldClass = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';

  const save = async () => {
    const input = { id: station?.id ?? null, name, autoReady, warnMinutes: whole(warn), lateMinutes: whole(late) };
    const problem = checkStation(input, takenNames);
    if (problem) {
      return setError(
        problem === 'TIMES_INVALID'
          ? t('settings.stations.timesInvalid', { max: MAX_STATION_MINUTES })
          : problem === 'NAME_TAKEN'
            ? t('settings.stations.nameTaken', { name: cleanName(name) })
            : t('settings.errors.NAME_REQUIRED'),
      );
    }
    setBusy(true);
    setError(null);
    try {
      onSaved(await getApi().saveStation(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={station ? t('settings.stations.editTitle', { name: station.name }) : t('settings.stations.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('menuSetup.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t('menuSetup.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('settings.stations.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('settings.stations.name')} placeholder={t('settings.stations.namePlaceholder')} className={fieldClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('settings.stations.warn')}</span>
            <input value={warn} onChange={(e) => setWarn(e.target.value)} inputMode="numeric" aria-label={t('settings.stations.warn')} className={fieldClass} />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('settings.stations.late')}</span>
            <input value={late} onChange={(e) => setLate(e.target.value)} inputMode="numeric" aria-label={t('settings.stations.late')} className={fieldClass} />
          </label>
        </div>
        <Switch checked={autoReady} onChange={setAutoReady} label={t('settings.stations.autoReadyLabel')} hint={t('settings.stations.autoReadyHint')} />
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
