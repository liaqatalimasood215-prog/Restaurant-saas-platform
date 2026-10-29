'use client';

import { useState } from 'react';
import { Copy, RotateCcw, Save, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { cleanPermissions, samePermissions, type Permission, type RolePermissionsEntry, type StaffMember, type StaffRole } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PermissionMatrix } from './permission-matrix';
import { ROLE_ICONS } from './staff-parts';

/**
 * Role Permissions (owner's reference picture, panel 3): roles on the left, the permission matrix in the
 * middle, the role card and quick templates on the right. Saving changes the role for everyone of that
 * role who has no permissions of their own. The Owner changes it; the Manager may look.
 */
export function RolePermissions({ entries, members, canEdit }: { entries: RolePermissionsEntry[]; members: StaffMember[]; canEdit: boolean }) {
  const toast = useToast();
  const [role, setRole] = useState<StaffRole>(entries[0]?.role ?? 'WAITER');
  // Unsaved ticks per role, so switching roles never loses them.
  const [drafts, setDrafts] = useState<Partial<Record<StaffRole, Permission[]>>>({});
  const [busy, setBusy] = useState(false);
  const entry = entries.find((e) => e.role === role);
  if (!entry) return null;

  const value = drafts[role] ?? entry.permissions;
  const dirty = (r: StaffRole) => {
    const d = drafts[r];
    const saved = entries.find((e) => e.role === r)?.permissions ?? [];
    return d !== undefined && !samePermissions(cleanPermissions(r, d), saved);
  };
  const setValue = (next: Permission[]) => setDrafts((d) => ({ ...d, [role]: cleanPermissions(role, next) }));
  const people = members.filter((m) => m.user.role === role && !m.user.archivedAt);
  const ownSets = people.filter((m) => m.user.permissions).length;
  const isCustom = !samePermissions(value, entry.recommended);
  const Icon = ROLE_ICONS[role];

  const save = async () => {
    setBusy(true);
    try {
      // The recommended set is stored as "no change", so later improvements of the defaults reach this role.
      await getApi().saveRolePermissions(role, samePermissions(value, entry.recommended) ? null : value);
      setDrafts((d) => {
        const next = { ...d };
        delete next[role];
        return next;
      });
      toast.show({ tone: 'success', title: t('staff.roles.saved', { role: t(`roles.${role}`) }) });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[12rem_1fr] xl:grid-cols-[12rem_1fr_16rem]">
      {/* Roles */}
      <Card className="self-start">
        <CardBody className="p-2">
          <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t('staff.roles.title')}</p>
          <div className="flex gap-1 overflow-x-auto lg:flex-col" role="tablist" aria-label={t('staff.roles.title')}>
            {entries.map((e) => {
              const RoleIcon = ROLE_ICONS[e.role];
              const selected = e.role === role;
              return (
                <button
                  key={e.role}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRole(e.role)}
                  className={cn(
                    'flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-sm font-bold',
                    selected ? 'bg-brand text-white' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <RoleIcon className="size-4 shrink-0" />
                  <span className="flex-1">{t(`roles.${e.role}`)}</span>
                  {dirty(e.role) && <span className={cn('size-2 rounded-full', selected ? 'bg-white' : 'bg-amber-500')} title={t('staff.roles.unsaved')} />}
                </button>
              );
            })}
          </div>
          <p className="px-2 pt-2 text-xs text-slate-500">{t('staff.roles.ownerNote')}</p>
        </CardBody>
      </Card>

      {/* Matrix */}
      <Card className="min-w-0">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{t('staff.roles.permissionsFor', { role: t(`roles.${role}`) })}</h2>
              <p className="text-sm text-slate-500">{t('staff.roles.matrixHint')}</p>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="secondary" disabled={!dirty(role) || busy} onClick={() => setDrafts((d) => ({ ...d, [role]: entry.permissions }))}>
                  {t('staff.roles.discard')}
                </Button>
                <Button disabled={!dirty(role) || busy} onClick={() => void save()}>
                  <Save className="size-4" aria-hidden />
                  {t('staff.roles.save')}
                </Button>
              </div>
            )}
          </div>
          {!canEdit && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('staff.roles.readOnly')}</p>}
          <PermissionMatrix role={role} value={value} onChange={canEdit ? setValue : undefined} />
        </CardBody>
      </Card>

      {/* Role card + quick templates */}
      <Card className="self-start lg:col-span-2 xl:col-span-1">
        <CardBody className="space-y-4">
          <div className="rounded-xl bg-brand-soft p-3">
            <span className="mb-2 grid size-10 place-items-center rounded-xl bg-brand text-white">
              <Icon className="size-5" />
            </span>
            <p className="text-lg font-extrabold text-slate-900">{t(`roles.${role}`)}</p>
            <p className="text-sm text-slate-700">{t(`roleHints.${role}`)}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={isCustom ? 'amber' : 'green'}>{isCustom ? t('staff.roles.customized') : t('staff.roles.recommendedSet')}</Badge>
              <Badge tone="grey">{t('staff.roles.people', { n: people.length })}</Badge>
            </div>
            {ownSets > 0 && <p className="mt-2 text-xs font-semibold text-amber-800">{t('staff.roles.ownSets', { n: ownSets })}</p>}
          </div>
          {canEdit && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('staff.roles.templates')}</p>
              {entries
                .filter((e) => e.role !== role)
                .map((e) => (
                  <Button key={e.role} variant="secondary" className="w-full justify-start" onClick={() => setValue(drafts[e.role] ?? e.permissions)}>
                    <Copy className="size-4" aria-hidden />
                    {t('staff.roles.copyFrom', { role: t(`roles.${e.role}`) })}
                  </Button>
                ))}
              <Button variant="outline" className="w-full justify-start" onClick={() => setValue(entry.recommended)}>
                <Sparkles className="size-4" aria-hidden />
                {t('staff.roles.useRecommended')}
              </Button>
              <Button variant="ghost" className="w-full justify-start text-red-700" onClick={() => setValue([])}>
                <XCircle className="size-4" aria-hidden />
                {t('staff.roles.clearAll')}
              </Button>
              <p className="flex items-start gap-1 text-xs text-slate-500">
                <RotateCcw className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t('staff.roles.templatesHint')}
              </p>
            </div>
          )}
          <p className="flex items-start gap-1 text-xs text-slate-500">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t('staff.roles.serverNote')}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
