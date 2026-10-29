'use client';

import type { ComponentType } from 'react';
import { Bike, Briefcase, ChefHat, ConciergeBell, Crown, HandPlatter, Wallet } from 'lucide-react';
import type { StaffMember, StaffRole } from '@restaurant-saas/shared';
import { Badge, type Tone } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

export const ROLE_ICONS: Record<StaffRole, ComponentType<{ className?: string }>> = {
  OWNER: Crown,
  MANAGER: Briefcase,
  CASHIER: Wallet,
  WAITER: ConciergeBell,
  SERVICE_WAITER: HandPlatter,
  KITCHEN: ChefHat,
  RIDER: Bike,
};

const ROLE_TONES: Record<StaffRole, Tone> = {
  OWNER: 'dark',
  MANAGER: 'blue',
  CASHIER: 'amber',
  WAITER: 'brand',
  SERVICE_WAITER: 'green',
  KITCHEN: 'orange',
  RIDER: 'grey',
};

export function RoleBadge({ role }: { role: StaffRole }) {
  return <Badge tone={ROLE_TONES[role]}>{t(`roles.${role}`)}</Badge>;
}

const AVATAR_COLOURS = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
];

export function initialsOf(name: string): string {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Initials until real staff photos (photo upload and storage come in Phase 7). */
export function StaffAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const colour = AVATAR_COLOURS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLOURS.length];
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full font-extrabold', colour, size === 'lg' ? 'size-20 text-2xl' : 'size-10 text-sm')}
    >
      {initialsOf(name)}
    </span>
  );
}

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED';
export const ACCOUNT_STATUSES: readonly AccountStatus[] = ['ACTIVE', 'INACTIVE', 'INVITED'];

/** Active = can log in · Inactive = deactivated by the Owner · Invited = has not created a PIN yet */
export function accountStatus(member: StaffMember): AccountStatus {
  if (!member.user.isActive) return 'INACTIVE';
  return member.user.activatedAt ? 'ACTIVE' : 'INVITED';
}

const STATUS_TONES: Record<AccountStatus, Tone> = { ACTIVE: 'green', INACTIVE: 'red', INVITED: 'amber' };

export function StatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{t(`staff.status.${status}`)}</Badge>;
}

/** "Today 10:24", "Yesterday 20:30", "3 Oct" or "Never". */
export function lastLoginText(iso: string | null, now = Date.now()): string {
  if (!iso) return t('staff.list.never');
  const at = new Date(iso);
  const time = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date(now)) - day(at)) / 86_400_000);
  if (days === 0) return t('staff.list.today', { time });
  if (days === 1) return t('staff.list.yesterday', { time });
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
