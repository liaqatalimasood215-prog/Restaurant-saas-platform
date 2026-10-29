'use client';

import { useState } from 'react';
import { Copy, KeyRound, Link2, Pencil, Send, Trash2, UserPlus, XCircle } from 'lucide-react';
import {
  PHONE_EXAMPLE,
  STAFF_ROLES,
  can,
  canManageStaffAccount,
  normalizePhone,
  type DiningTable,
  type KitchenStation,
  type StaffMember,
  type StaffRole,
  type StaffUser,
} from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t, type MessageKey } from '@/i18n';
import { getApi, type Session, type StaffInput, type StaffLink } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';

/** Riders are added on the Riders page (MASTER_PROMPT.md §5.6), so the staff form leaves them out. */
const STAFF_FORM_ROLES = STAFF_ROLES.filter((r) => r !== 'RIDER');
const isWaiter = (role: StaffRole) => role === 'WAITER' || role === 'SERVICE_WAITER';

type Confirm = { kind: 'disable' | 'resetPin' | 'revoke' | 'remove'; user: StaffUser } | null;
type ShownLink = { link: StaffLink; name: string } | null;

/** "30 Oct, 18:05" */
const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Staff (owner, 2026-10-29): only the Owner adds and edits staff, gives roles, sends activation and
 * PIN-reset links and enables / disables accounts; the Manager sees the list read-only. The last active
 * Owner is protected. Links are single-use and expire; nobody ever sees a PIN.
 * DEMO: links are not emailed (no email service yet) — the Owner copies or shares them.
 */
export function StaffScreen() {
  const { data: session } = useSession();
  const staff = useApiQuery(() => getApi().listStaff(), []);
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const toast = useToast();
  const [editing, setEditing] = useState<StaffInput | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [shownLink, setShownLink] = useState<ShownLink>(null);
  const [busy, setBusy] = useState(false);
  const canManage = session ? can(session.user.role, 'staff.manage') : false;

  const header = (
    <ScreenHeader
      title={t('nav.staff')}
      status="DEMO_PROTOTYPE"
      description={t('staff.description')}
      actions={
        canManage && (
          <Button
            onClick={() =>
              setEditing({ id: null, name: '', phone: '', email: '', branchId: session?.branch.id ?? null, role: 'WAITER', stationIds: [], tableIds: [] })
            }
            disabled={!floor.data || !menu.data}
          >
            <UserPlus className="size-5" aria-hidden />
            {t('staff.add')}
          </Button>
        )
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

  const toggleActive = (user: StaffUser) =>
    run(async () => {
      await getApi().setStaffActive(user.id, !user.isActive);
      toast.show({ tone: 'success', title: t(user.isActive ? 'staff.disabledToast' : 'staff.enabledToast', { name: user.name }) });
    });
  const resend = (user: StaffUser) => run(async () => setShownLink({ link: await getApi().resendInvite(user.id), name: user.name }));
  const revoke = (user: StaffUser) =>
    run(async () => {
      await getApi().revokeInvite(user.id);
      toast.show({ tone: 'success', title: t('staff.revokedToast', { name: user.name }) });
    });
  const remove = (user: StaffUser) =>
    run(async () => {
      const result = await getApi().removeStaff(user.id);
      toast.show({ tone: 'success', title: t(result === 'ARCHIVED' ? 'staff.archivedToast' : 'staff.deletedToast', { name: user.name }) });
    });
  const resetPin = (user: StaffUser) => run(async () => setShownLink({ link: await getApi().resetStaffPin(user.id), name: user.name }));

  return (
    <>
      {header}
      {!canManage && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('staff.ownerOnly')}</p>}
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-slate-100">
            {staff.data
              .filter((m) => m.user.role !== 'RIDER')
              .map((member) => {
                const { user } = member;
                const editable = canManageStaffAccount(me.role, user.role);
                const pending = member.invite?.status === 'PENDING';
                return (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-48 flex-1">
                      <p className={cn('font-bold', user.isActive ? 'text-slate-900' : 'text-slate-400 line-through')}>
                        {user.name} {user.id === me.id && <span className="text-xs font-semibold text-slate-500">{t('staff.you')}</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.phone}
                        {user.email && ` · ${user.email}`}
                      </p>
                      <p className="text-xs text-slate-500">{user.branchId ? session.branch.name : t('staff.allBranches')}</p>
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
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={user.isActive ? 'green' : 'red'}>{user.isActive ? t('staff.active') : t('staff.disabled')}</Badge>
                      <AccountBadge member={member} />
                    </div>
                    {editable && (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setEditing({
                              id: user.id,
                              name: user.name,
                              phone: user.phone,
                              email: user.email ?? '',
                              branchId: user.branchId,
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
                        {user.isActive && !user.activatedAt && (
                          <Button variant="ghost" disabled={busy} onClick={() => void resend(user)} aria-label={t('staff.resendName', { name: user.name })}>
                            <Send className="size-4" aria-hidden />
                            {t('staff.resend')}
                          </Button>
                        )}
                        {user.isActive && pending && (
                          <Button variant="ghost" disabled={busy} onClick={() => setConfirm({ kind: 'revoke', user })} aria-label={t('staff.revokeName', { name: user.name })}>
                            <XCircle className="size-4" aria-hidden />
                            {t('staff.revoke')}
                          </Button>
                        )}
                        {/* Not on your own account: resetting it would lock you out (and the last Owner out of the restaurant). */}
                        {user.isActive && user.activatedAt && user.id !== me.id && (
                          <Button variant="ghost" disabled={busy} onClick={() => setConfirm({ kind: 'resetPin', user })} aria-label={t('staff.resetPinName', { name: user.name })}>
                            <KeyRound className="size-4" aria-hidden />
                            {t('staff.resetPin')}
                          </Button>
                        )}
                        {user.id !== me.id && (
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => (user.isActive ? setConfirm({ kind: 'disable', user }) : void toggleActive(user))}
                            aria-label={`${user.isActive ? t('staff.disable') : t('staff.enable')} ${user.name}`}
                          >
                            {user.isActive ? t('staff.disable') : t('staff.enable')}
                          </Button>
                        )}
                        {user.id !== me.id && (
                          <Button
                            variant="ghost"
                            className="text-red-700"
                            disabled={busy}
                            onClick={() => setConfirm({ kind: 'remove', user })}
                            aria-label={t('staff.deleteName', { name: user.name })}
                          >
                            <Trash2 className="size-4" aria-hidden />
                            {t('staff.delete')}
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
      <p className="mt-3 text-xs text-slate-500">{t('staff.securityNote')}</p>

      {editing && (
        <StaffDialog
          initial={editing}
          me={me}
          session={session}
          tables={tables}
          stations={stations}
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
                    ? toggleActive(confirm.user)
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

const INVITE_BADGES: Record<string, { tone: Tone; key: MessageKey }> = {
  'ACTIVATION-PENDING': { tone: 'amber', key: 'staff.invite.activationPending' },
  'ACTIVATION-EXPIRED': { tone: 'red', key: 'staff.invite.expired' },
  'ACTIVATION-REVOKED': { tone: 'grey', key: 'staff.invite.revoked' },
  'PIN_RESET-PENDING': { tone: 'amber', key: 'staff.invite.pinResetPending' },
  'PIN_RESET-EXPIRED': { tone: 'red', key: 'staff.invite.expired' },
  'PIN_RESET-REVOKED': { tone: 'grey', key: 'staff.invite.revoked' },
};

/** Activated, or where the person's activation / PIN-reset link stands. */
function AccountBadge({ member }: { member: StaffMember }) {
  if (member.user.activatedAt) return <Badge tone="green">{t('staff.invite.activated')}</Badge>;
  const invite = member.invite;
  const badge = invite && INVITE_BADGES[`${invite.kind}-${invite.status}`];
  if (!invite || !badge) return <Badge tone="grey">{t('staff.invite.notActivated')}</Badge>;
  return (
    <Badge tone={badge.tone} className="whitespace-normal">
      {t(badge.key, { time: shortDateTime(invite.expiresAt) })}
    </Badge>
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

function StaffDialog({
  initial,
  me,
  session,
  tables,
  stations,
  onClose,
  onSaved,
}: {
  initial: StaffInput;
  me: StaffUser;
  session: Session;
  tables: DiningTable[];
  stations: KitchenStation[];
  onClose: () => void;
  onSaved: (user: StaffUser, link: StaffLink | null) => void;
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
      const saved = await getApi().saveStaff({ ...form, branchId: form.role === 'OWNER' ? null : (form.branchId ?? session.branch.id) });
      onSaved(saved.user, saved.link);
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
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100 disabled:text-slate-500';

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
            {initial.id ? t('staff.save') : t('staff.saveAndInvite')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('staff.name')}</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('staff.mobile')}</span>
            <input
              value={form.phone}
              inputMode="tel"
              placeholder={PHONE_EXAMPLE}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              // 03001234567 or +92 300 1234567 is shown as 0300-1234567 once the field is left.
              onBlur={() => setForm((f) => ({ ...f, phone: normalizePhone(f.phone) ?? f.phone }))}
              className={field}
            />
            <span className="mt-1 block text-xs text-slate-500">{t('staff.mobileHint')}</span>
          </label>
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('staff.email')}</span>
            <input
              value={form.email}
              type="email"
              inputMode="email"
              placeholder={t('staff.emailPlaceholder')}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('staff.branch')}</span>
          <select
            value={form.role === 'OWNER' ? '' : (form.branchId ?? session.branch.id)}
            disabled={form.role === 'OWNER'}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            className={field}
          >
            {form.role === 'OWNER' ? <option value="">{t('staff.allBranches')}</option> : <option value={session.branch.id}>{session.branch.name}</option>}
          </select>
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

        {!initial.id && <p className="text-xs text-slate-500">{t('staff.inviteHint')}</p>}
        {error && (
          <p role="alert" className="font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
