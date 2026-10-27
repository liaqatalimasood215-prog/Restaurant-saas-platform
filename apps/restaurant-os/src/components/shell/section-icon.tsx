import {
  Banknote,
  Bike,
  Bot,
  Boxes,
  ChartColumn,
  ChefHat,
  ClipboardList,
  ConciergeBell,
  Contact,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  Settings,
  ShoppingBag,
  Smartphone,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { OsSectionKey } from '@restaurant-saas/shared';

const ICONS: Record<OsSectionKey, LucideIcon> = {
  tables: LayoutGrid,
  waiter: ConciergeBell,
  kitchen: ChefHat,
  pos: Receipt,
  'online-orders': ShoppingBag,
  orders: ClipboardList,
  menu: UtensilsCrossed,
  'online-app': Smartphone,
  riders: Bike,
  staff: Users,
  summary: ChartColumn,
  settings: Settings,
  dashboard: LayoutDashboard,
  customers: Contact,
  'finance-reports': Wallet,
  inventory: Boxes,
  payroll: Banknote,
  'ai-manager': Bot,
};

export function SectionIcon({ sectionKey, className }: { sectionKey: OsSectionKey; className?: string }) {
  const Icon = ICONS[sectionKey];
  return <Icon className={className} aria-hidden />;
}
