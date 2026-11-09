'use client';

import { useState, type FormEvent } from 'react';
import { Bike, ExternalLink, Pencil, Phone, Send, Smartphone, Trash2, UserCheck, UserPlus, UserX, Wallet } from 'lucide-react';
import { PHONE_EXAMPLE, customerAppPath, formatPaisa, riderAssignBlock, type RiderOverview } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { AppPreviewFrame } from '@/components/app-preview-frame';
import { getApi, type StaffLink } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { ORDER_TONES } from '@/lib/tones';
import { QrImage } from '../online-app/website-qr';
import { StaffAvatar } from '../staff/staff-parts';
import { LinkDialog } from '../staff/staff-screen';
import { RIDER_APP_ORIGIN, riderShareUrl } from './rider-bridge';
import { newId } from '@/lib/new-id';

type Confirm = { kind: 'disable' | 'remove'; rider: RiderOverview } | null;

/**
 * Riders page (MASTER_PROMPT.md §5.6; owner, 2026-11-01): the Owner adds riders and changes them, there is no public
 * sign-up. Owner and Manager see who is Online, what each rider carries and the cash to settle, next to the real Rider
 * App in a phone frame. DEMO: the link to the app works only in this browser; the backend joins them in Phase 4.
 */
export function RidersScreen() {
  const { data: session, allowed } = useSession();
  const riders = useApiQuery(() => getApi().listRiders(), []);
  const toast = useToast();
  const [form, setForm] = useState<{ rider: RiderOverview | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [shownLink, setShownLink] = useState<{ link: StaffLink; name: string } | null>(null);
  const [settleKeys, setSettleKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const canManage = allowed('staff.manage');

  const header = (
    <ScreenHeader
      title={t('nav.riders')}
      status="DEMO_PROTOTYPE"
      description={t('riders.description')}
      actions={
        canManage && (
          <Button onClick={() => setForm({ rider: null })} disabled={!riders.data}>
            <UserPlus className="size-5" aria-hidden />
            {t('riders.add')}
          </Button>
        )
      }
    />
  );
  if (riders.loading && !riders.data) return (<>{header}<LoadingState /></>);
  if (!riders.data || !session) return (<>{header}<ErrorState message={riders.error?.message} onRetry={riders.reload} /></>);

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
  const setActive = ({ account }: RiderOverview, active: boolean) =>
    run(async () => {
      await getApi().setStaffActive(account.id, active);
      toast.show({ tone: 'success', title: t(active ? 'riders.enabledToast' : 'riders.disabledToast', { name: account.name }) });
    });
  const remove = ({ account }: RiderOverview) =>
    run(async () => {
      const result = await getApi().removeStaff(account.id);
      toast.show({ tone: 'success', title: t(result === 'ARCHIVED' ? 'riders.archivedToast' : 'riders.deletedToast', { name: account.name }) });
    });
  const settle = ({ account }: RiderOverview) =>
    run(async () => {
      // One key per handover: a double tap never records the cash twice.
      const key = settleKeys[account.id] ?? newId();
      setSettleKeys((keys) => ({ ...keys, [account.id]: key }));
      const settlement = await getApi().settleRiderCash(account.id, key);
      setSettleKeys((keys) => ({ ...keys, [account.id]: newId() }));
      toast.show({ tone: 'success', title: t('riders.settled', { amount: formatPaisa(settlement.amount), name: account.name }) });
    });

  const list = riders.data;
  const appPath = customerAppPath(session.restaurant.slug, session.branch.slug);
  const tile = (label: string, value: string | number) => (
    <Card>
      <CardBody className="py-3">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="text-2xl font-black tabular-nums text-slate-900">{value}</p>
      </CardBody>
    </Card>
  );

  return (
    <>
      {header}
      {!canManage && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('riders.ownerOnly')}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(310px,340px)]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3" data-rider-summary>
            {tile(t('riders.summaryOnline'), list.filter(({ account }) => riderAssignBlock(account) === null).length)}
            {tile(t('riders.summaryRunning'), list.reduce((sum, r) => sum + r.running.length, 0))}
            {tile(t('riders.summaryCash'), formatPaisa(list.reduce((sum, r) => sum + r.cashToSettle, 0)))}
          </div>
          {list.length === 0 ? (
            <Card>
              <EmptyState icon={<Bike className="size-8 text-slate-400" aria-hidden />} title={t('riders.empty')}>
                {t('riders.emptyBody')}
              </EmptyState>
            </Card>
          ) : (
            list.map((rider) => (
              <RiderCard
                key={rider.account.id}
                rider={rider}
                busy={busy}
                canManage={canManage}
                canSettle={allowed('riderCash.settle')}
                onEdit={() => setForm({ rider })}
                onEnable={() => void setActive(rider, true)}
                onDisable={() => setConfirm({ kind: 'disable', rider })}
                onRemove={() => setConfirm({ kind: 'remove', rider })}
                onSettle={() => void settle(rider)}
                onResend={() => void run(async () => setShownLink({ link: await getApi().resendInvite(rider.account.id), name: rider.account.name }))}
              />
            ))
          )}
        </div>
        <div className="min-w-0 space-y-4 self-start">
          <RiderAppPreview riders={list} path={appPath} />
          <PhoneLink path={appPath} />
        </div>
      </div>

      {form && (
        <RiderForm
          rider={form.rider}
          branchId={session.branch.id}
          onClose={() => setForm(null)}
          onSaved={(name, link) => {
            setForm(null);
            toast.show({ tone: 'success', title: t('riders.savedToast', { name }) });
            if (link) setShownLink({ link, name });
          }}
        />
      )}

      {confirm && (
        <Dialog
          open
          onClose={() => setConfirm(null)}
          title={t(confirm.kind === 'disable' ? 'riders.disableTitle' : 'riders.removeTitle', { name: confirm.rider.account.name })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                {t('riders.cancel')}
              </Button>
              <Button disabled={busy} onClick={() => void (confirm.kind === 'disable' ? setActive(confirm.rider, false) : remove(confirm.rider))}>
                {t(confirm.kind === 'disable' ? 'riders.disable' : 'riders.remove')}
              </Button>
            </>
          }
        >
          {t(confirm.kind === 'disable' ? 'riders.disableBody' : 'riders.removeBody', { name: confirm.rider.account.name })}
        </Dialog>
      )}

      {shownLink && <LinkDialog shown={shownLink} onClose={() => setShownLink(null)} />}
    </>
  );
}

function RiderCard({
  rider,
  busy,
  canManage,
  canSettle,
  onEdit,
  onEnable,
  onDisable,
  onRemove,
  onSettle,
  onResend,
}: {
  rider: RiderOverview;
  busy: boolean;
  canManage: boolean;
  canSettle: boolean;
  onEdit: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onRemove: () => void;
  onSettle: () => void;
  onResend: () => void;
}) {
  const { account, running, cashToSettle, deliveredToday, employeeCode } = rider;
  const block = riderAssignBlock(account);
  return (
    <Card data-rider-card={account.name}>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <StaffAvatar name={account.name} />
            <div className="min-w-0">
              <p className="truncate font-extrabold text-slate-900">{account.name}</p>
              <a href={`tel:${account.phone}`} className="flex min-h-6 items-center gap-1 text-sm font-semibold text-brand">
                <Phone className="size-3.5" aria-hidden />
                {account.phone}
              </a>
              <p className="text-xs text-slate-500">{employeeCode}</p>
            </div>
          </div>
          <span data-rider-state={block ?? 'ONLINE'}>
            {block === null && <Badge tone="green">{t('riders.online')}</Badge>}
            {block === 'OFFLINE' && <Badge>{t('riders.offline')}</Badge>}
            {block === 'DISABLED' && <Badge tone="red">{t('riders.disabled')}</Badge>}
            {block === 'NOT_ACTIVATED' && <Badge tone="amber">{t('riders.invited')}</Badge>}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 sm:col-span-1">
            <p className="text-xs font-bold text-slate-500">{t('riders.running')}</p>
            {running.length === 0 ? (
              <p className="text-sm text-slate-600">{t('riders.none')}</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {running.map((d) => (
                  <li key={d.orderId} className="flex flex-wrap items-center gap-1 text-sm font-bold text-slate-900">
                    #{d.dailyNumber}
                    <Badge tone={ORDER_TONES[d.status]}>{t(`orderStatus.${d.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">{t('riders.deliveredToday')}</p>
            <p className="text-xl font-black tabular-nums text-slate-900" data-rider-delivered>{deliveredToday}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">{t('riders.cashToSettle')}</p>
            <p className="text-xl font-black tabular-nums text-slate-900" data-rider-cash>{formatPaisa(cashToSettle)}</p>
          </div>
        </div>

        {(canManage || canSettle) && (
          <div className="flex flex-wrap gap-2">
            {canSettle && cashToSettle > 0 && (
              <Button disabled={busy} onClick={onSettle}>
                <Wallet className="size-4" aria-hidden />
                {t('riders.settle')}
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="secondary" disabled={busy} onClick={onEdit}>
                  <Pencil className="size-4" aria-hidden />
                  {t('riders.edit')}
                </Button>
                {block === 'NOT_ACTIVATED' && (
                  <Button variant="secondary" disabled={busy} onClick={onResend}>
                    <Send className="size-4" aria-hidden />
                    {t('riders.resend')}
                  </Button>
                )}
                {account.isActive ? (
                  <Button variant="secondary" disabled={busy} onClick={onDisable}>
                    <UserX className="size-4" aria-hidden />
                    {t('riders.disable')}
                  </Button>
                ) : (
                  <Button variant="secondary" disabled={busy} onClick={onEnable}>
                    <UserCheck className="size-4" aria-hidden />
                    {t('riders.enable')}
                  </Button>
                )}
                <Button variant="ghost" className="text-red-700" disabled={busy} onClick={onRemove}>
                  <Trash2 className="size-4" aria-hidden />
                  {t('riders.remove')}
                </Button>
              </>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RiderForm({
  rider,
  branchId,
  onClose,
  onSaved,
}: {
  rider: RiderOverview | null;
  branchId: string;
  onClose: () => void;
  onSaved: (name: string, link: StaffLink | null) => void;
}) {
  const [name, setName] = useState(rider?.account.name ?? '');
  const [phone, setPhone] = useState(rider?.account.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await getApi().saveStaff({
        id: rider?.account.id ?? null,
        name,
        phone,
        email: rider?.email ?? '',
        branchId,
        role: 'RIDER',
        stationIds: [],
        tableIds: [],
        permissions: null,
      });
      onSaved(saved.user.name, saved.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={rider ? t('riders.editTitle', { name: rider.account.name }) : t('riders.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('riders.cancel')}
          </Button>
          <Button type="submit" form="rider-form" disabled={busy}>
            {t('riders.save')}
          </Button>
        </>
      }
    >
      <form id="rider-form" className="space-y-3" onSubmit={(e) => void submit(e)}>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('riders.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('riders.phone')}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" className={field} />
          <span className="mt-1 block text-xs text-slate-500">{t('riders.phoneHint', { example: PHONE_EXAMPLE })}</span>
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

/** The real Rider App in a phone frame, logged in as the rider chosen here. */
function RiderAppPreview({ riders, path }: { riders: RiderOverview[]; path: string }) {
  const usable = riders.filter((r) => r.account.isActive && r.account.activatedAt);
  const [wanted, setWanted] = useState('');
  const chosen = usable.find((r) => r.account.id === wanted) ?? usable[0];
  const url = chosen ? `${RIDER_APP_ORIGIN}${path}?rider=${chosen.account.id}` : '';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('riders.appTitle')}</CardTitle>
        <Badge tone="amber">{t('riders.appStatus')}</Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        {chosen ? (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-900">{t('riders.previewAs')}</span>
              <select value={chosen.account.id} onChange={(e) => setWanted(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-semibold">
                {usable.map((r) => (
                  <option key={r.account.id} value={r.account.id}>
                    {r.account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-center">
              {/* Inside the frame: exactly 390 × 800 at 70 %, so the app's bottom bar is never cut off. */}
              <div className="box-content h-[560px] w-[273px] overflow-hidden rounded-[2.25rem] border-[6px] border-slate-800 bg-white py-3" data-rider-phone>
                <AppPreviewFrame origin={RIDER_APP_ORIGIN} appName={t('appPreview.riderApp')}>
                  <iframe key={url} src={url} title={t('riders.previewFrame')} className="h-[800px] w-[390px] origin-top-left scale-[0.7] border-0" />
                </AppPreviewFrame>
              </div>
            </div>
            {/* rel="opener": the Rider App tab asks this page for its orders (rider-bridge.ts). */}
            <a href={url} target="_blank" rel="opener" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 font-bold text-slate-800 hover:bg-slate-50">
              <ExternalLink className="size-5" aria-hidden />
              {t('riders.openFullApp')}
            </a>
            <p className="text-xs text-slate-500">{t('riders.previewHint')}</p>
          </>
        ) : (
          <p className="text-sm text-slate-600">{t('riders.noPreview')}</p>
        )}
      </CardBody>
    </Card>
  );
}

function PhoneLink({ path }: { path: string }) {
  const url = riderShareUrl(path);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5" aria-hidden />
          {t('riders.phoneTitle')}
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-2 text-center">
        <QrImage text={url} label={t('riders.phoneQr', { url })} className="size-40" />
        <p className="break-all text-xs font-semibold text-slate-700" data-rider-phone-link>{url}</p>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-800">{t('riders.phoneHint2')}</p>
      </CardBody>
    </Card>
  );
}
