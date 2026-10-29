'use client';

import { useRef, useState } from 'react';
import { KeyRound, MoreHorizontal, Pencil, Search, Send, ShieldCheck, Trash2, UserCheck, UserX, XCircle } from 'lucide-react';
import { STAFF_ROLES, type DiningTable, type KitchenStation, type StaffMember, type StaffUser } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { useDismiss } from '@/components/ui/use-dismiss';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { ACCOUNT_STATUSES, RoleBadge, StaffAvatar, StatusBadge, accountStatus, lastLoginText, type AccountStatus } from './staff-parts';

export type StaffAction = 'edit' | 'permissions' | 'resend' | 'revoke' | 'resetPin' | 'deactivate' | 'reactivate' | 'delete';

const ALL = 'ALL';
const isWaiter = (role: StaffUser['role']) => role === 'WAITER' || role === 'SERVICE_WAITER';

/**
 * Employee list (owner's reference picture, panel 1): photo, name and employee ID, role, branch, contact,
 * status, last login and an actions menu; search and role / branch / status filters. Riders are on the
 * Riders page. Only the Owner gets the actions; the Manager sees the list.
 */
export function StaffList({
  members,
  me,
  branchName,
  tables,
  stations,
  canManage,
  busy,
  onAction,
}: {
  members: StaffMember[];
  me: StaffUser;
  branchName: string;
  tables: DiningTable[];
  stations: KitchenStation[];
  canManage: boolean;
  busy: boolean;
  onAction: (action: StaffAction, member: StaffMember) => void;
}) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<string>(ALL);
  const [branch, setBranch] = useState<string>(ALL);
  const [status, setStatus] = useState<AccountStatus | typeof ALL>(ALL);

  const staff = members.filter((m) => m.user.role !== 'RIDER');
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const visible = staff.filter((member) => {
    const { user } = member;
    if (role !== ALL && user.role !== role) return false;
    // BRANCH = people of this branch; OWNER_ALL = people who work in all branches (the Owner)
    if (branch === 'BRANCH' && user.branchId === null) return false;
    if (branch === 'OWNER_ALL' && user.branchId !== null) return false;
    if (status !== ALL && accountStatus(member) !== status) return false;
    if (!q) return true;
    return (
      user.name.toLowerCase().includes(q) ||
      user.employeeCode.toLowerCase().includes(q) ||
      (user.email ?? '').includes(q) ||
      (digits.length >= 3 && user.phone.replace(/\D/g, '').includes(digits))
    );
  });

  const assignment = (user: StaffUser) => {
    if (isWaiter(user.role)) {
      return user.tableIds.length === 0
        ? t('staff.allTables')
        : tables.filter((tb) => user.tableIds.includes(tb.id)).map((tb) => tb.name).join(', ');
    }
    if (user.role === 'KITCHEN') {
      return user.stationIds.length === 0
        ? t('staff.allStations')
        : stations.filter((s) => user.stationIds.includes(s.id)).map((s) => s.name).join(', ');
    }
    return null;
  };

  const select = 'min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700';

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('staff.list.search')}
            aria-label={t('staff.list.search')}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
          />
        </label>
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={t('staff.list.roleFilter')} className={select}>
          <option value={ALL}>{t('staff.list.allRoles')}</option>
          {STAFF_ROLES.filter((r) => r !== 'RIDER').map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </select>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label={t('staff.list.branchFilter')} className={select}>
          <option value={ALL}>{t('staff.list.anyBranch')}</option>
          <option value="BRANCH">{branchName}</option>
          <option value="OWNER_ALL">{t('staff.allBranches')}</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus | typeof ALL)} aria-label={t('staff.list.statusFilter')} className={select}>
          <option value={ALL}>{t('staff.list.allStatuses')}</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`staff.status.${s}`)}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm font-semibold text-slate-500">{t('staff.list.count', { n: visible.length, of: staff.length })}</span>
      </div>

      {visible.length === 0 ? (
        <div className="p-4">
          <EmptyState title={t('staff.list.noMatch')} />
        </div>
      ) : (
        <>
          {/* Tablet and desktop: a table like the owner's picture */}
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2">{t('staff.list.employee')}</th>
                <th scope="col" className="px-3 py-2">{t('staff.role')}</th>
                <th scope="col" className="hidden px-3 py-2 lg:table-cell">{t('staff.branch')}</th>
                <th scope="col" className="px-3 py-2">{t('staff.list.contact')}</th>
                <th scope="col" className="px-3 py-2">{t('staff.list.status')}</th>
                <th scope="col" className="hidden px-3 py-2 xl:table-cell">{t('staff.list.lastLogin')}</th>
                <th scope="col" className="px-3 py-2 text-right">{canManage && t('staff.list.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((member) => {
                const { user } = member;
                return (
                  <tr key={user.id} className={cn('align-middle', !user.isActive && 'bg-slate-50/70')} data-staff-row={user.name}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StaffAvatar name={user.name} />
                        <div className="min-w-0">
                          <p className={cn('font-bold', user.isActive ? 'text-slate-900' : 'text-slate-500')}>
                            <NameButton name={user.name} onOpen={canManage ? () => onAction('edit', member) : null} />{' '}
                            {user.id === me.id && <span className="text-xs font-semibold text-slate-500">{t('staff.you')}</span>}
                          </p>
                          <p className="text-xs text-slate-500">#{user.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <RoleBadge role={user.role} />
                        {user.permissions && <Badge tone="grey">{t('staff.perms.customBadge')}</Badge>}
                      </div>
                      {assignment(user) && <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{assignment(user)}</p>}
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{user.branchId ? branchName : t('staff.allBranches')}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{user.phone}</p>
                      {user.email && <p className="max-w-56 truncate text-xs text-slate-500">{user.email}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={accountStatus(member)} />
                      <InviteNote member={member} />
                    </td>
                    <td className="hidden px-3 py-3 text-slate-600 xl:table-cell">{lastLoginText(user.lastLoginAt)}</td>
                    <td className="px-3 py-3 text-right">
                      {canManage && <ActionsMenu member={member} me={me} busy={busy} onAction={onAction} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Phones: one card per person */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {visible.map((member) => {
              const { user } = member;
              return (
                <li key={user.id} className="flex items-start gap-3 p-3" data-staff-row={user.name}>
                  <StaffAvatar name={user.name} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn('font-bold', user.isActive ? 'text-slate-900' : 'text-slate-500')}>
                      <NameButton name={user.name} onOpen={canManage ? () => onAction('edit', member) : null} />{' '}
                      <span className="text-xs font-semibold text-slate-500">#{user.employeeCode}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      <RoleBadge role={user.role} />
                      <StatusBadge status={accountStatus(member)} />
                      {user.permissions && <Badge tone="grey">{t('staff.perms.customBadge')}</Badge>}
                    </div>
                    <p className="text-xs text-slate-600">
                      {user.phone}
                      {user.email && ` · ${user.email}`}
                    </p>
                    <InviteNote member={member} />
                    <p className="text-xs text-slate-500">{t('staff.list.lastLoginShort', { when: lastLoginText(user.lastLoginAt) })}</p>
                  </div>
                  {canManage && <ActionsMenu member={member} me={me} busy={busy} onAction={onAction} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

/** The Owner taps a name to open that person's details (owner, 2026-10-29). */
function NameButton({ name, onOpen }: { name: string; onOpen: (() => void) | null }) {
  if (!onOpen) return <>{name}</>;
  return (
    <button type="button" onClick={onOpen} className="text-left underline-offset-2 hover:text-brand hover:underline" title={t('staff.list.openDetails', { name })}>
      {name}
    </button>
  );
}

const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Where the activation / PIN-reset link stands, under the status. */
function InviteNote({ member }: { member: StaffMember }) {
  const invite = member.invite;
  if (member.user.activatedAt || !invite || !member.user.isActive) return null;
  const key =
    invite.status === 'PENDING'
      ? invite.kind === 'PIN_RESET'
        ? 'staff.invite.pinResetPending'
        : 'staff.invite.activationPending'
      : invite.status === 'EXPIRED'
        ? 'staff.invite.expired'
        : invite.status === 'REVOKED'
          ? 'staff.invite.revoked'
          : null;
  if (!key) return null;
  return (
    <p className={cn('mt-1 text-xs font-semibold', invite.status === 'PENDING' ? 'text-amber-700' : 'text-red-700')}>
      {t(key, { time: shortDateTime(invite.expiresAt) })}
    </p>
  );
}

/** The "⋯" actions of one person (Owner only). Your own row has no Deactivate, Delete or Reset PIN. */
function ActionsMenu({
  member,
  me,
  busy,
  onAction,
}: {
  member: StaffMember;
  me: StaffUser;
  busy: boolean;
  onAction: (action: StaffAction, member: StaffMember) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const { user } = member;
  const self = user.id === me.id;
  const items: { action: StaffAction; icon: typeof Pencil; danger?: boolean }[] = [
    { action: 'edit', icon: Pencil },
    ...(user.role !== 'OWNER' ? [{ action: 'permissions' as const, icon: ShieldCheck }] : []),
    ...(user.isActive && !user.activatedAt ? [{ action: 'resend' as const, icon: Send }] : []),
    ...(user.isActive && member.invite?.status === 'PENDING' ? [{ action: 'revoke' as const, icon: XCircle }] : []),
    ...(user.isActive && user.activatedAt && !self ? [{ action: 'resetPin' as const, icon: KeyRound }] : []),
    ...(!self ? [user.isActive ? { action: 'deactivate' as const, icon: UserX } : { action: 'reactivate' as const, icon: UserCheck }] : []),
    ...(!self ? [{ action: 'delete' as const, icon: Trash2, danger: true }] : []),
  ];

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('staff.list.actionsFor', { name: user.name })}
        className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {items.map(({ action, icon: Icon, danger }) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAction(action, member);
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold',
                danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(`staff.actions.${action}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
