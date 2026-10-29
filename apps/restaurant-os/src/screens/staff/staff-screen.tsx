'use client';

import { useState } from 'react';
import { Copy, Link2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import type { StaffMember, StaffUser } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type StaffInput, type StaffLink } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { RolePermissions } from './role-permissions';
import { StaffList, type StaffAction } from './staff-list';
import { StaffWizard } from './staff-wizard';

type Confirm = { kind: 'disable' | 'resetPin' | 'revoke' | 'remove'; user: StaffUser } | null;
type ShownLink = { link: StaffLink; name: string } | null;
type Editing = { input: StaffInput; employeeCode: string | null; step: 1 | 3 } | null;

/** "30 Oct, 18:05" */
const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Staff Management (owner's reference picture, 2026-10-29): the employee list, the 3-step Add Staff
 * wizard and Role Permissions. Only the Owner adds and changes staff, roles and permissions, sends links
 * and deactivates or deletes accounts; the Manager may look. Nobody ever sees a PIN.
 * DEMO: links are not emailed (no email service yet) — the Owner copies or shares them.
 */
export function StaffScreen() {
  const { data: session, allowed } = useSession();
  const staff = useApiQuery(() => getApi().listStaff(), []);
  const roles = useApiQuery(() => getApi().getRolePermissions(), []);
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const toast = useToast();
  const [tab, setTab] = useState<'people' | 'roles'>('people');
  const [editing, setEditing] = useState<Editing>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [shownLink, setShownLink] = useState<ShownLink>(null);
  const [busy, setBusy] = useState(false);
  const canManage = allowed('staff.manage');
  const queries = [staff, roles, floor, menu];

  const header = (
    <ScreenHeader
      title={t('staff.title')}
      status="DEMO_PROTOTYPE"
      description={t('staff.description')}
      actions={
        canManage && (
          <Button
            onClick={() =>
              setEditing({
                input: { id: null, name: '', phone: '', email: '', branchId: session?.branch.id ?? null, role: 'WAITER', stationIds: [], tableIds: [], permissions: null },
                employeeCode: null,
                step: 1,
              })
            }
            disabled={queries.some((q) => !q.data)}
          >
            <UserPlus className="size-5" aria-hidden />
            {t('staff.add')}
          </Button>
        )
      }
    />
  );
  if (queries.some((q) => q.loading && !q.data)) return (<>{header}<LoadingState /></>);
  if (!staff.data || !roles.data || !floor.data || !menu.data || !session) {
    return (
      <>
        {header}
        <ErrorState message={queries.find((q) => q.error)?.error?.message} onRetry={() => queries.forEach((q) => q.reload())} />
      </>
    );
  }

  const me = session.user;
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const setActive = (user: StaffUser, active: boolean) =>
    run(async () => {
      await getApi().setStaffActive(user.id, active);
      toast.show({ tone: 'success', title: t(active ? 'staff.enabledToast' : 'staff.disabledToast', { name: user.name }) });
    });
  const resend = (user: StaffUser) => run(async () => setShownLink({ link: await getApi().resendInvite(user.id), name: user.name }));
  const revoke = (user: StaffUser) =>
    run(async () => {
      await getApi().revokeInvite(user.id);
      toast.show({ tone: 'success', title: t('staff.revokedToast', { name: user.name }) });
    });
  const resetPin = (user: StaffUser) => run(async () => setShownLink({ link: await getApi().resetStaffPin(user.id), name: user.name }));
  const remove = (user: StaffUser) =>
    run(async () => {
      const result = await getApi().removeStaff(user.id);
      toast.show({ tone: 'success', title: t(result === 'ARCHIVED' ? 'staff.archivedToast' : 'staff.deletedToast', { name: user.name }) });
    });

  const onAction = (action: StaffAction, { user }: StaffMember) => {
    const input: StaffInput = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email ?? '',
      branchId: user.branchId,
      role: user.role,
      stationIds: user.stationIds,
      tableIds: user.tableIds,
      permissions: user.permissions,
    };
    if (action === 'edit' || action === 'permissions') return setEditing({ input, employeeCode: user.employeeCode, step: action === 'edit' ? 1 : 3 });
    if (action === 'resend') return void resend(user);
    if (action === 'reactivate') return void setActive(user, true);
    const kinds = { revoke: 'revoke', resetPin: 'resetPin', deactivate: 'disable', delete: 'remove' } as const;
    setConfirm({ kind: kinds[action], user });
  };

  const tabButton = (value: 'people' | 'roles', label: string, Icon: typeof Users) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold',
        tab === value ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-900',
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );

  return (
    <>
      {header}
      <div role="tablist" aria-label={t('staff.title')} className="mb-4 inline-flex gap-1 rounded-2xl bg-slate-100 p-1">
        {tabButton('people', t('staff.tabs.people', { n: staff.data.filter((m) => m.user.role !== 'RIDER').length }), Users)}
        {tabButton('roles', t('staff.tabs.roles'), ShieldCheck)}
      </div>
      {!canManage && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('staff.ownerOnly')}</p>}

      {tab === 'people' ? (
        <StaffList
          members={staff.data}
          me={me}
          branchName={session.branch.name}
          tables={floor.data.tables.map((e) => e.table)}
          stations={menu.data.stations}
          canManage={canManage}
          busy={busy}
          onAction={onAction}
        />
      ) : (
        <RolePermissions entries={roles.data} members={staff.data} canEdit={canManage} />
      )}
      <p className="mt-3 text-xs text-slate-500">{t('staff.securityNote')}</p>

      {editing && (
        <StaffWizard
          initial={editing.input}
          employeeCode={editing.employeeCode}
          startStep={editing.step}
          me={me}
          session={session}
          tables={floor.data.tables.map((e) => e.table)}
          stations={menu.data.stations}
          roles={roles.data}
          onClose={() => setEditing(null)}
          onSaved={(saved, link) => {
            setEditing(null);
            toast.show({ tone: 'success', title: t('staff.saved', { name: saved.name }) });
            if (link) setShownLink({ link, name: saved.name });
          }}
        />
      )}

      {confirm && (
        <Dialog
          open
          onClose={() => setConfirm(null)}
          title={t(`staff.confirm.${confirm.kind}Title`, { name: confirm.user.name })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                {t('nav.close')}
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  void (confirm.kind === 'disable'
                    ? setActive(confirm.user, false)
                    : confirm.kind === 'resetPin'
                      ? resetPin(confirm.user)
                      : confirm.kind === 'remove'
                        ? remove(confirm.user)
                        : revoke(confirm.user))
                }
              >
                {t(`staff.confirm.${confirm.kind}Button`)}
              </Button>
            </>
          }
        >
          {t(`staff.confirm.${confirm.kind}Body`, { name: confirm.user.name })}
        </Dialog>
      )}

      {shownLink && <LinkDialog shown={shownLink} onClose={() => setShownLink(null)} />}
    </>
  );
}

/**
 * Shown once after Add / Resend / Reset PIN. Email is NOT CONNECTED yet, so the Owner sends the link
 * himself (copy, or his own WhatsApp — no paid service). A PIN is never shown or sent.
 */
function LinkDialog({ shown, onClose }: { shown: NonNullable<ShownLink>; onClose: () => void }) {
  const toast = useToast();
  const url = `${window.location.origin}/activate?token=${shown.link.token}`;
  const message = t(shown.link.kind === 'PIN_RESET' ? 'staff.link.whatsappPinReset' : 'staff.link.whatsappActivation', { name: shown.name, url });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ tone: 'success', title: t('staff.link.copied') });
    } catch {
      toast.show({ tone: 'error', title: t('staff.link.copyFailed') });
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t(shown.link.kind === 'PIN_RESET' ? 'staff.link.pinResetTitle' : 'staff.link.activationTitle', { name: shown.name })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('nav.close')}
        </Button>
      }
    >
      <div className="space-y-3">
        <p>{t('staff.link.body', { time: shortDateTime(shown.link.expiresAt) })}</p>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 font-bold text-slate-900">
            <Link2 className="size-4" aria-hidden />
            {t('staff.link.label')}
          </span>
          <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void copy()}>
            <Copy className="size-4" aria-hidden />
            {t('staff.link.copy')}
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-green-600 px-4 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {t('staff.link.whatsapp')}
          </a>
        </div>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('staff.link.notConnected')}</p>
      </div>
    </Dialog>
  );
}
