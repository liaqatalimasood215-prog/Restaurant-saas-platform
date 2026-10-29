'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, RotateCcw, Upload } from 'lucide-react';
import {
  PHONE_EXAMPLE,
  STAFF_ROLES,
  canManageStaffAccount,
  cleanPermissions,
  isValidEmail,
  normalizePhone,
  samePermissions,
  type DiningTable,
  type KitchenStation,
  type Permission,
  type RolePermissionsEntry,
  type StaffRole,
  type StaffUser,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { getApi, type Session, type StaffInput, type StaffLink } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PermissionMatrix } from './permission-matrix';
import { ROLE_ICONS, StaffAvatar } from './staff-parts';

/** Riders are added on the Riders page (MASTER_PROMPT.md §5.6), so the staff form leaves them out. */
const STAFF_FORM_ROLES = STAFF_ROLES.filter((r) => r !== 'RIDER');
const isWaiter = (role: StaffRole) => role === 'WAITER' || role === 'SERVICE_WAITER';
const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];

/**
 * Add / edit a staff member in three steps (owner's reference picture, panel 2):
 * 1 Personal information · 2 Role & branch · 3 Access & permissions. The permissions start from the
 * role's set and can be changed for this one person ("Custom"). New staff get a single-use activation link.
 */
export function StaffWizard({
  initial,
  employeeCode,
  startStep = 1,
  me,
  session,
  tables,
  stations,
  roles,
  onClose,
  onSaved,
}: {
  initial: StaffInput;
  /** Existing person's number; empty for a new one (given when saved) */
  employeeCode: string | null;
  startStep?: Step;
  me: StaffUser;
  session: Session;
  tables: DiningTable[];
  stations: KitchenStation[];
  roles: RolePermissionsEntry[];
  onClose: () => void;
  onSaved: (user: StaffUser, link: StaffLink | null) => void;
}) {
  const roleSet = (role: StaffRole): Permission[] => roles.find((r) => r.role === role)?.permissions ?? [];
  const [form, setForm] = useState(initial);
  // The ticks shown in step 3: the person's own set, or their role's set.
  const [ticks, setTicks] = useState<Permission[]>(initial.permissions ?? roleSet(initial.role));
  const [step, setStep] = useState<Step>(startStep);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ownAccount = initial.id === me.id;
  const editing = initial.id !== null;
  const formRoles = STAFF_FORM_ROLES.filter((r) => canManageStaffAccount(me.role, r) || r === initial.role);
  const custom = form.role !== 'OWNER' && !samePermissions(cleanPermissions(form.role, ticks), roleSet(form.role));

  const chooseRole = (role: StaffRole) => {
    setForm((f) => ({ ...f, role }));
    // A new role starts from that role's permissions.
    setTicks(roleSet(role));
  };

  /** Checks the current step; returns an error text or null. */
  const problem = (s: Step): string | null => {
    if (s === 1) {
      if (form.name.trim().length < 2) return t('staff.wizard.nameRequired');
      if (!normalizePhone(form.phone)) return t('staff.wizard.phoneInvalid');
      if (form.email.trim() && !isValidEmail(form.email)) return t('staff.wizard.emailInvalid');
    }
    return null;
  };

  const goTo = (next: Step) => {
    // Going forward checks every step on the way; going back is always allowed.
    for (const s of STEPS) {
      if (s >= next) break;
      const p = problem(s);
      if (p) {
        setStep(s);
        return setError(p);
      }
    }
    setError(null);
    setStep(next);
  };

  const save = async () => {
    for (const s of STEPS) {
      const p = problem(s);
      if (p) {
        setStep(s);
        return setError(p);
      }
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await getApi().saveStaff({
        ...form,
        branchId: form.role === 'OWNER' ? null : (form.branchId ?? session.branch.id),
        permissions: custom ? cleanPermissions(form.role, ticks) : null,
      });
      onSaved(saved.user, saved.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100 disabled:text-slate-500';
  const label = 'mb-1 block font-bold text-slate-900';

  return (
    <Dialog
      open
      size="xl"
      onClose={onClose}
      title={editing ? t('staff.wizard.editTitle', { name: initial.name }) : t('staff.wizard.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="mr-auto">
            {t('staff.wizard.cancel')}
          </Button>
          {step > 1 && (
            <Button variant="secondary" onClick={() => goTo((step - 1) as Step)}>
              <ArrowLeft className="size-4" aria-hidden />
              {t('staff.wizard.back')}
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => goTo((step + 1) as Step)}>
              {t('staff.wizard.next')}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={() => void save()} disabled={busy}>
              <Check className="size-4" aria-hidden />
              {editing ? t('staff.save') : t('staff.saveAndInvite')}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[13rem_1fr]">
        {/* Step rail */}
        <ol className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:border-r md:border-slate-100 md:pr-4" aria-label={t('staff.wizard.steps')}>
          {STEPS.map((s) => {
            const done = s < step;
            const current = s === step;
            return (
              <li key={s} className="min-w-44 md:min-w-0">
                <button
                  type="button"
                  onClick={() => goTo(s)}
                  aria-current={current ? 'step' : undefined}
                  className={cn('flex w-full items-start gap-3 rounded-xl p-2 text-left', current ? 'bg-brand-soft' : 'hover:bg-slate-50')}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold',
                      current ? 'bg-brand text-white' : done ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {done ? <Check className="size-4" aria-hidden /> : s}
                  </span>
                  <span>
                    <span className={cn('block text-sm font-bold', current ? 'text-brand' : 'text-slate-800')}>{t(`staff.wizard.step${s}`)}</span>
                    <span className="block text-xs text-slate-500">{t(`staff.wizard.step${s}Hint`)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">{t('staff.wizard.stepOf', { n: step })}</p>
            <h3 className="text-xl font-extrabold text-slate-900">{t(`staff.wizard.step${step}Title`)}</h3>
            <p className="text-sm text-slate-500">{t(`staff.wizard.step${step}Body`)}</p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className={label}>{t('staff.wizard.fullName')} *</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} autoFocus />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>{t('staff.mobile')} *</span>
                  <span className="flex">
                    <span className="flex items-center gap-2 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600" aria-hidden>
                      <PakistanFlag />
                      +92
                    </span>
                    <input
                      value={form.phone}
                      inputMode="tel"
                      placeholder={PHONE_EXAMPLE}
                      aria-label={t('staff.mobile')}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      // 03001234567 or +92 300 1234567 is shown as 0300-1234567 once the field is left.
                      onBlur={() => setForm((f) => ({ ...f, phone: normalizePhone(f.phone) ?? f.phone }))}
                      className={cn(field, 'rounded-l-none')}
                    />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{t('staff.mobileHint')}</span>
                </label>
                <label className="block">
                  <span className={label}>{t('staff.email')}</span>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className={label}>{t('staff.wizard.employeeId')}</span>
                  <p className="flex min-h-12 items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 font-semibold text-slate-600">
                    {employeeCode ? `#${employeeCode}` : t('staff.wizard.employeeIdAuto')}
                  </p>
                </div>
                <div>
                  <span className={label}>{t('staff.wizard.photo')}</span>
                  <div className="flex items-center gap-3">
                    <StaffAvatar name={form.name || '?'} size="lg" />
                    <div>
                      <Button variant="secondary" disabled>
                        <Upload className="size-4" aria-hidden />
                        {t('staff.wizard.uploadPhoto')}
                      </Button>
                      <p className="mt-1 text-xs text-slate-500">{t('staff.wizard.photoLater')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block">
                <span className={label}>{t('staff.branch')}</span>
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
                <legend className={label}>{t('staff.role')}</legend>
                {ownAccount && <p className="mb-2 text-xs text-slate-500">{t('staff.ownRole')}</p>}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {formRoles.map((role) => {
                    const Icon = ROLE_ICONS[role];
                    const selected = form.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => chooseRole(role)}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border-2 p-3 text-left disabled:opacity-60',
                          selected ? 'border-brand bg-brand-soft' : 'border-slate-200 hover:border-slate-300',
                        )}
                      >
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', selected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600')}>
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className={cn('block font-bold', selected ? 'text-brand' : 'text-slate-900')}>{t(`roles.${role}`)}</span>
                          <span className="block text-xs text-slate-600">{t(`roleHints.${role}`)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              {isWaiter(form.role) && (
                <ChipPicker
                  legend={t('staff.assignedTables')}
                  hint={t('staff.assignedTablesHint')}
                  allLabel={t('staff.allTables')}
                  options={tables.map((tb) => ({ id: tb.id, name: tb.name }))}
                  value={form.tableIds}
                  onChange={(tableIds) => setForm({ ...form, tableIds })}
                />
              )}
              {form.role === 'KITCHEN' && (
                <ChipPicker
                  legend={t('staff.kitchenStations')}
                  allLabel={t('staff.allStations')}
                  options={stations.map((s) => ({ id: s.id, name: s.name }))}
                  value={form.stationIds}
                  onChange={(stationIds) => setForm({ ...form, stationIds })}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {form.role === 'OWNER' ? (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('staff.perms.ownerAll')}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={custom ? 'amber' : 'green'}>{custom ? t('staff.perms.customFor', { name: form.name || '—' }) : t('staff.perms.followsRole', { role: t(`roles.${form.role}`) })}</Badge>
                    <span className="ml-auto" />
                    <Button variant="ghost" onClick={() => setTicks(roleSet(form.role))} disabled={!custom}>
                      <RotateCcw className="size-4" aria-hidden />
                      {t('staff.perms.useRole')}
                    </Button>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Copy className="size-4" aria-hidden />
                      <select
                        value=""
                        onChange={(e) => e.target.value && setTicks(cleanPermissions(form.role, roleSet(e.target.value as StaffRole)))}
                        aria-label={t('staff.perms.copyFrom')}
                        className="min-h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm"
                      >
                        <option value="">{t('staff.perms.copyFrom')}</option>
                        {roles
                          .filter((r) => r.role !== form.role)
                          .map((r) => (
                            <option key={r.role} value={r.role}>
                              {t(`roles.${r.role}`)}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <PermissionMatrix role={form.role} value={cleanPermissions(form.role, ticks)} onChange={setTicks} />
                </>
              )}
              {!editing && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-bold text-slate-900">{t('staff.wizard.accessTitle')}</p>
                  <p>{t('staff.inviteHint')}</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/** Small Pakistan flag (Windows does not draw flag emoji). */
function PakistanFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-sm" aria-hidden>
      <rect width="30" height="20" fill="#01411C" />
      <rect width="7.5" height="20" fill="#fff" />
      <circle cx="19" cy="10" r="5.6" fill="#fff" />
      <circle cx="20.6" cy="8.8" r="5" fill="#01411C" />
      <path d="M22.6 6.2l.6 1.8 1.9 0-1.5 1.1.6 1.8-1.6-1.1-1.5 1.1.6-1.8-1.6-1.1 1.9 0z" fill="#fff" />
    </svg>
  );
}

function ChipPicker({
  legend,
  hint,
  allLabel,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  allLabel: string;
  options: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const chip = (selected: boolean) =>
    cn('min-h-11 rounded-xl border-2 px-3 text-sm font-bold', selected ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-700');
  return (
    <fieldset>
      <legend className="mb-1 font-bold text-slate-900">{legend}</legend>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(value.length === 0)} onClick={() => onChange([])}>
          {allLabel}
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={chip(value.includes(o.id))}
            onClick={() => onChange(value.includes(o.id) ? value.filter((x) => x !== o.id) : [...value, o.id])}
          >
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
