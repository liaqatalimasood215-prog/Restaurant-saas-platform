'use client';

import type { ComponentType } from 'react';
import {
  BadgePercent,
  Banknote,
  BarChart3,
  Bike,
  Check,
  ChefHat,
  ClipboardList,
  FileText,
  HandPlatter,
  LayoutGrid,
  ListOrdered,
  Lock,
  Receipt,
  Settings,
  ShoppingBag,
  Smartphone,
  Undo2,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {
  OWNER_ONLY_PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_ROWS,
  canGrant,
  type Permission,
  type PermissionAction,
  type StaffRole,
} from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

const ROW_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  pos: Receipt,
  takeOrders: ClipboardList,
  tables: LayoutGrid,
  bill: FileText,
  serve: HandPlatter,
  payments: Banknote,
  discounts: BadgePercent,
  refundVoid: Undo2,
  kitchen: ChefHat,
  orders: ListOrdered,
  onlineOrders: ShoppingBag,
  riders: Bike,
  menu: UtensilsCrossed,
  onlineApp: Smartphone,
  staff: Users,
  reports: BarChart3,
  settings: Settings,
};

/**
 * The permission matrix (owner's reference picture, 2026-10-29): features × View / Create / Edit / Delete /
 * Approve. Every tick is one real permission that the server checks. A lock means the role can never get
 * it (the order rules or "Owner only"); "—" means the action does not exist for that feature.
 */
export function PermissionMatrix({
  role,
  value,
  onChange,
}: {
  role: StaffRole;
  value: readonly Permission[];
  /** Missing = read-only */
  onChange?: (next: Permission[]) => void;
}) {
  const toggle = (permission: Permission) => {
    if (!onChange) return;
    onChange(value.includes(permission) ? value.filter((p) => p !== permission) : [...value, permission]);
  };
  const grantable = PERMISSION_ROWS.flatMap((r) => Object.values(r.cells)).filter((c) => canGrant(role, c.permission)).length;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-500">
        {t('staff.perms.count', { on: value.length, of: grantable })}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                {t('staff.perms.feature')}
              </th>
              {PERMISSION_ACTIONS.map((action) => (
                <th key={action} scope="col" className="w-20 px-1 py-2 text-center">
                  {t(`staff.perms.actions.${action}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PERMISSION_ROWS.map((row) => {
              const Icon = ROW_ICONS[row.key] ?? ClipboardList;
              return (
                <tr key={row.key} className="hover:bg-slate-50/60">
                  <th scope="row" className="px-3 py-2 text-left font-semibold text-slate-800">
                    <span className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      {t(`staff.perms.rows.${row.key}` as Parameters<typeof t>[0])}
                    </span>
                  </th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <td key={action} className="px-1 py-1.5 text-center">
                      <MatrixCell
                        row={row.key}
                        action={action}
                        cell={row.cells[action]}
                        role={role}
                        checked={row.cells[action] ? value.includes(row.cells[action].permission) : false}
                        readOnly={!onChange}
                        onToggle={toggle}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <Lock className="size-3.5" aria-hidden />
        {t('staff.perms.lockHint')}
      </p>
    </div>
  );
}

function MatrixCell({
  row,
  action,
  cell,
  role,
  checked,
  readOnly,
  onToggle,
}: {
  row: string;
  action: PermissionAction;
  cell: { permission: Permission; hint: string } | undefined;
  role: StaffRole;
  checked: boolean;
  readOnly: boolean;
  onToggle: (permission: Permission) => void;
}) {
  if (!cell) return <span className="text-slate-300" aria-hidden>—</span>;
  const hint = t(`staff.perms.hints.${row}.${action}` as Parameters<typeof t>[0]);
  const label = `${t(`staff.perms.rows.${row}` as Parameters<typeof t>[0])} · ${t(`staff.perms.actions.${action}`)}: ${hint}`;
  if (!canGrant(role, cell.permission)) {
    const why = OWNER_ONLY_PERMISSIONS.includes(cell.permission) ? t('staff.perms.ownerOnly') : t('staff.perms.notForRole');
    return (
      <span className="inline-grid size-9 place-items-center text-slate-300" title={`${hint} — ${why}`} aria-label={`${label} — ${why}`} role="img">
        <Lock className="size-4" aria-hidden />
      </span>
    );
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={hint}
      disabled={readOnly}
      onClick={() => onToggle(cell.permission)}
      className={cn(
        'inline-grid size-9 place-items-center rounded-lg border-2 transition-colors',
        checked ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand/60',
        readOnly && 'cursor-default opacity-80 hover:border-slate-300',
        readOnly && checked && 'hover:border-brand',
      )}
    >
      <Check className="size-5" strokeWidth={3} aria-hidden />
    </button>
  );
}
