'use client';

import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { canSeeSectionWith, findSection, type OsSection, type OsSectionKey } from '@restaurant-saas/shared';
import { Card, CardBody } from '@/components/ui/card';
import { t } from '@/i18n';
import { PREVIEW_FOR_SECTION } from '@/lib/build-plan';
import { useSession } from '@/lib/session';
import { ComingSoonScreen } from './coming-soon-screen';
import { InventoryScreen } from './inventory/inventory-screen';
import { KitchenScreen } from './kitchen/kitchen-screen';
import { MenuScreen } from './menu/menu-screen';
import { OnlineAppScreen } from './online-app/online-app-screen';
import { OnlineOrdersScreen } from './online-orders/online-orders-screen';
import { OrdersScreen } from './orders/orders-screen';
import { PosScreen } from './pos/pos-screen';
import { RidersScreen } from './riders/riders-screen';
import { SettingsScreen } from './settings/settings-screen';
import { SummaryScreen } from './summary/summary-screen';
import { StaffScreen } from './staff/staff-screen';
import { TablesScreen } from './tables/tables-screen';
import { UpcomingScreen } from './upcoming-screen';
import { WaiterScreen } from './waiter/waiter-screen';

/** Screen options passed in from the URL (e.g. /waiter?table=…). */
export interface SectionOptions {
  tableId?: string;
  /** Orders search from the header (/orders?q=…) */
  query?: string;
  /** A menu product's recipe, opened from the Menu (/inventory?recipe=…) */
  recipeItemId?: string;
  /** The Cooking Plan of a date, opened from the stock alert (/inventory?cooking=…) */
  cookingDate?: string;
  /** Stock → Available Food, opened from the closing review alert (/inventory?food=review) */
  foodReview?: boolean;
}

function renderSection(section: OsSection, options: SectionOptions) {
  if (section.key === 'tables') return <TablesScreen />;
  if (section.key === 'waiter') return <WaiterScreen tableId={options.tableId} />;
  if (section.key === 'kitchen') return <KitchenScreen />;
  if (section.key === 'pos') return <PosScreen tableId={options.tableId} />;
  if (section.key === 'staff') return <StaffScreen />;
  if (section.key === 'menu') return <MenuScreen />;
  if (section.key === 'inventory') return <InventoryScreen key={`${options.recipeItemId ?? ''}:${options.cookingDate ?? ''}:${options.foodReview ? 'food' : ''}`} recipeItemId={options.recipeItemId} cookingDate={options.cookingDate} foodReview={options.foodReview} />;
  if (section.key === 'settings') return <SettingsScreen />;
  if (section.key === 'summary') return <SummaryScreen />;
  if (section.key === 'online-orders') return <OnlineOrdersScreen />;
  if (section.key === 'orders') return <OrdersScreen key={options.query ?? ''} query={options.query} />;
  if (section.key === 'online-app') return <OnlineAppScreen />;
  if (section.key === 'riders') return <RidersScreen />;
  if (section.group === 'COMING_SOON') return <ComingSoonScreen section={section} />;
  return <UpcomingScreen section={section} preview={PREVIEW_FOR_SECTION[section.key] ?? 1} />;
}

/** One sidebar feature = one screen. Checks that the current role may open it (UI only; the server checks from Phase 4). */
export function SectionPage({ sectionKey, ...options }: { sectionKey: OsSectionKey } & SectionOptions) {
  const { data: session } = useSession();
  const section = findSection(sectionKey);
  if (!section) throw new Error(`Unknown section: ${sectionKey}`);

  useEffect(() => {
    document.title = `${t(`nav.${sectionKey}`)} · ${t('app.name')} (DEMO)`;
  }, [sectionKey]);

  if (!session) return null;
  if (!canSeeSectionWith(section, session.user.role, session.permissions)) {
    return <NoAccess section={section} role={session.user.role} />;
  }
  return renderSection(section, options);
}

function NoAccess({ section, role }: { section: OsSection; role: Parameters<typeof canSeeSectionWith>[1] }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
        <Lock className="size-10 text-slate-400" aria-hidden />
        <h1 className="text-xl font-extrabold text-slate-900">{t('access.title')}</h1>
        <p className="text-sm text-slate-600">
          {t('access.body', { role: t(`roles.${role}`), section: t(`nav.${section.key}`) })}
        </p>
        <p className="text-xs text-slate-500">{t('access.serverNote')}</p>
      </CardBody>
    </Card>
  );
}
