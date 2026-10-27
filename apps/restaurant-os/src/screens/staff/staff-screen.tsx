'use client';

import { useState } from 'react';
import { Pencil, UserPlus } from 'lucide-react';
import {
  STAFF_ROLES,
  canManageStaffAccount,
  type DiningTable,
  type KitchenStation,
  type StaffRole,
  type StaffUser,
} from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type StaffInput } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';

/** Riders are added on the Riders page (MASTER_PROMPT.md §5.6), so the staff form leaves them out. */
const STAFF_FORM_ROLES = STAFF_ROLES.filter((r) => r !== 'RIDER');
const isWaiter = (role: StaffRole) => role === 'WAITER' || role === 'SERVICE_WAITER';

/**
 * Staff (owner workflow 2026-10-28): add and edit staff, choose Super Waiter or Service Waiter and
 * their tables, kitchen stations for chefs, disable accounts. Managers cannot touch Owner/Manager
 * accounts, and nobody changes their own role.
 */
export function StaffScreen() {
  const { data: session } = useSession();
  const staff = useApiQuery(() => getApi().listStaff(), []);
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const toast = useToast();
  const [editing, setEditing] = useState<StaffInput | null>(null);

  const header = (
    <ScreenHeader
      title={t('nav.staff')}
      status="DEMO_PROTOTYPE"
      description={t('staff.description')}
      actions={
        <Button
          onClick={() => setEditing({ id: null, name: '', phone: '', role: 'WAITER', stationIds: [], tableIds: [] })}
          disabled={!floor.data || !menu.data}
        >
          <UserPlus className="size-5" aria-hidden />
          {t('staff.add')}
        </Button>
      }
    />
  );
  if ((staff.loading && !staff.data) || (floor.loading && !floor.data) || (menu.loading && !menu.data)) {
    return (<>{header}<LoadingState /></>);
  }
  if (!staff.data || !floor.data || !menu.data || !session) {
    return (
      <>
        {header}
        <ErrorState
          message={(staff.error ?? floor.error ?? menu.error)?.message}
          onRetry={() => (staff.reload(), floor.reload(), menu.reload())}
        />
      </>
    );
  }

  const tables = floor.data.tables.map((e) => e.table);
  const stations = menu.data.stations;
  const me = session.user;
  const tableNames = (ids: string[]) =>
    ids.length === 0 ? t('staff.allTables') : tables.filter((tb) => ids.includes(tb.id)).map((tb) => tb.name).join(', ');
  const stationNames = (ids: string[]) =>
    ids.length === 0 ? t('staff.allStations') : stations.filter((s) => ids.includes(s.id)).map((s) => s.name).join(', ');

  const toggleActive = async (user: StaffUser) => {
    try {
      await getApi().setStaffActive(user.id, !user.isActive);
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  return (
    <>
      {header}
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-slate-100">
            {staff.data
              .filter((u) => u.role !== 'RIDER')
              .map((user) => {
                const editable = canManageStaffAccount(me.role, user.role);
                return (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-48 flex-1">
                      <p className={cn('font-bold', user.isActive ? 'text-slate-900' : 'text-slate-400 line-through')}>
                        {user.name} {user.id === me.id && <span className="text-xs font-semibold text-slate-500">{t('staff.you')}</span>}
                      </p>
                      <p className="text-xs text-slate-500">{user.phone}</p>
                    </div>
                    <div className="min-w-48 flex-1 text-sm">
                      <Badge tone={user.role === 'SERVICE_WAITER' ? 'blue' : user.role === 'WAITER' ? 'brand' : 'grey'}>
                        {t(`roles.${user.role}`)}
                      </Badge>
                      {isWaiter(user.role) && <p className="mt-1 text-xs text-slate-600">{t('staff.tables', { list: tableNames(user.tableIds) })}</p>}
                      {user.role === 'KITCHEN' && (
                        <p className="mt-1 text-xs text-slate-600">{t('staff.stations', { list: stationNames(user.stationIds) })}</p>
                      )}
                    </div>
                    <Badge tone={user.isActive ? 'green' : 'red'}>{user.isActive ? t('staff.active') : t('staff.disabled')}</Badge>
                    {editable && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setEditing({
                              id: user.id,
                              name: user.name,
                              phone: user.phone,
                              role: user.role,
                              stationIds: user.stationIds,
                              tableIds: user.tableIds,
                            })
                          }
                          aria-label={t('staff.editName', { name: user.name })}
                        >
                          <Pencil className="size-4" aria-hidden />
                          {t('staff.edit')}
                        </Button>
                        {user.id !== me.id && (
                          <Button variant="ghost" onClick={() => toggleActive(user)}>
                            {user.isActive ? t('staff.disable') : t('staff.enable')}
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </CardBody>
      </Card>
      <p className="mt-3 text-xs text-slate-500">{t('staff.passwordNote')}</p>

      {editing && (
        <StaffDialog
          initial={editing}
          me={me}
          tables={tables}
          stations={stations}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            toast.show({ tone: 'success', title: t('staff.saved', { name: saved.name }) });
          }}
        />
      )}
    </>
  );
}

function StaffDialog({
  initial,
  me,
  tables,
  stations,
  onClose,
  onSaved,
}: {
  initial: StaffInput;
  me: StaffUser;
  tables: DiningTable[];
  stations: KitchenStation[];
  onClose: () => void;
  onSaved: (user: StaffUser) => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ownAccount = initial.id === me.id;
  const roles = STAFF_FORM_ROLES.filter((r) => canManageStaffAccount(me.role, r) || r === initial.role);

  const toggle = (key: 'tableIds' | 'stationIds', id: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await getApi().saveStaff(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const chip = (selected: boolean) =>
    cn(
      'min-h-11 rounded-xl border-2 px-3 text-sm font-bold',
      selected ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-700',
    );
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base';

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial.id ? t('staff.editTitle') : t('staff.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button onClick={save} disabled={busy}>
            {t('staff.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('staff.name')}</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('staff.phone')}</span>
          <input
            value={form.phone}
            inputMode="tel"
            placeholder="0300-1234567"
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={field}
          />
        </label>

        <fieldset disabled={ownAccount}>
          <legend className="mb-1 font-bold text-slate-900">{t('staff.role')}</legend>
          {ownAccount && <p className="mb-2 text-xs text-slate-500">{t('staff.ownRole')}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role })}
                aria-pressed={form.role === role}
                className={cn(chip(form.role === role), 'flex flex-col items-start py-2 text-left disabled:opacity-60')}
              >
                {t(`roles.${role}`)}
                <span className="text-xs font-medium opacity-80">{t(`roleHints.${role}`)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {isWaiter(form.role) && (
          <fieldset>
            <legend className="mb-1 font-bold text-slate-900">{t('staff.assignedTables')}</legend>
            <p className="mb-2 text-xs text-slate-500">{t('staff.assignedTablesHint')}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(form.tableIds.length === 0)} onClick={() => setForm({ ...form, tableIds: [] })}>
                {t('staff.allTables')}
              </button>
              {tables.map((table) => (
                <button key={table.id} type="button" className={chip(form.tableIds.includes(table.id))} onClick={() => toggle('tableIds', table.id)}>
                  {table.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {form.role === 'KITCHEN' && (
          <fieldset>
            <legend className="mb-1 font-bold text-slate-900">{t('staff.kitchenStations')}</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(form.stationIds.length === 0)} onClick={() => setForm({ ...form, stationIds: [] })}>
                {t('staff.allStations')}
              </button>
              {stations.map((s) => (
                <button key={s.id} type="button" className={chip(form.stationIds.includes(s.id))} onClick={() => toggle('stationIds', s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
