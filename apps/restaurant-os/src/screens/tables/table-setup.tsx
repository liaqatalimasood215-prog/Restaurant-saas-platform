'use client';

import { cloneElement, useId, useState, type ReactElement } from 'react';
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import {
  MAX_BULK_TABLES,
  MAX_NAME_LENGTH,
  MAX_TABLE_SEATS,
  checkBulkTables,
  checkName,
  checkSeats,
  cleanName,
  nextTableNumber,
  type AreaSetupEntry,
  type TableSetup,
  type TableSetupProblem,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * Area and table setup on the Tables screen (owner, 2026-10-29): Manage Areas, Add Table (one or many)
 * and Edit table. Owner and Manager only; the ApiClient checks every rule again.
 */
const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100 disabled:text-slate-500';

function errorText(problem: TableSetupProblem, name: string, areaName: string | null): string {
  if (problem === 'NAME_TAKEN') {
    return areaName ? t('tableSetup.errors.NAME_TAKEN', { area: areaName, name }) : t('tableSetup.errors.AREA_TAKEN', { name });
  }
  return t(`tableSetup.errors.${problem}`, {
    max: problem === 'NAME_TOO_LONG' ? MAX_NAME_LENGTH : problem === 'TOO_MANY' ? MAX_BULK_TABLES : MAX_TABLE_SEATS,
  });
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : t('states.errorBody'));

/** "12" → 12; anything that is not a whole number → NaN, so the shared rules refuse it. */
const wholeNumber = (text: string) => (/^\s*\d+\s*$/.test(text) ? Number(text) : Number.NaN);

/** A labelled form control; the label and hint are linked to the input by id. */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactElement<{ id?: string; 'aria-describedby'?: string }> }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold text-slate-900">
        {label}
      </label>
      {cloneElement(children, { id, 'aria-describedby': hint ? `${id}-hint` : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {message}
    </p>
  );
}

// ── Manage Areas ─────────────────────────────────────────────────────────────────────────────

export function ManageAreasDialog({ setup, onClose }: { setup: TableSetup; onClose: () => void }) {
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const areas = setup.areas;
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      return true;
    } catch (err) {
      setError(messageOf(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const otherNames = (id: string | null) => areas.filter((a) => a.area.id !== id).map((a) => a.area.name);

  const addArea = async () => {
    const name = cleanName(newName);
    const problem = checkName(name, otherNames(null));
    if (problem) return setError(errorText(problem, name, null));
    if (await run(() => getApi().saveArea({ id: null, name }))) {
      setNewName('');
      toast.show({ tone: 'success', title: t('tableSetup.areaAdded', { name }) });
    }
  };

  const saveRename = async () => {
    if (!renaming) return;
    const name = cleanName(renaming.name);
    const problem = checkName(name, otherNames(renaming.id));
    if (problem) return setError(errorText(problem, name, null));
    if (await run(() => getApi().saveArea({ id: renaming.id, name }))) setRenaming(null);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('tableSetup.areasTitle')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('nav.close')}
        </Button>
      }
    >
      <p className="mb-3 text-xs text-slate-600">{t('tableSetup.areasHint')}</p>
      <div className="space-y-3">
          <FormError message={error} />
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {areas.map((entry, index) => (
              <AreaRow
                key={entry.area.id}
                entry={entry}
                first={index === 0}
                last={index === areas.length - 1}
                busy={busy}
                renaming={renaming?.id === entry.area.id ? renaming.name : null}
                onRenameStart={() => (setError(null), setRenaming({ id: entry.area.id, name: entry.area.name }))}
                onRenameChange={(name) => setRenaming({ id: entry.area.id, name })}
                onRenameSave={() => void saveRename()}
                onRenameCancel={() => setRenaming(null)}
                onMove={(position) => void run(() => getApi().moveArea(entry.area.id, position))}
                onActive={(active) => void run(() => getApi().setAreaActive(entry.area.id, active))}
                position={index + 1}
              />
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addArea();
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('tableSetup.newArea')}
              aria-label={t('tableSetup.newArea')}
              maxLength={MAX_NAME_LENGTH + 10}
              className={field}
            />
            <Button type="submit" disabled={busy || !newName.trim()} className="shrink-0">
              {t('tableSetup.addArea')}
            </Button>
          </form>
      </div>
    </Dialog>
  );
}

function AreaRow({
  entry,
  first,
  last,
  busy,
  renaming,
  position,
  onRenameStart,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  onMove,
  onActive,
}: {
  entry: AreaSetupEntry;
  first: boolean;
  last: boolean;
  busy: boolean;
  /** The name being typed, or null when not renaming */
  renaming: string | null;
  position: number;
  onRenameStart: () => void;
  onRenameChange: (name: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onMove: (position: number) => void;
  onActive: (active: boolean) => void;
}) {
  const { area, tableCount, openBills } = entry;
  const iconButton = 'grid size-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30';

  if (renaming !== null) {
    return (
      <li className="p-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onRenameSave();
          }}
        >
          <input value={renaming} onChange={(e) => onRenameChange(e.target.value)} aria-label={t('tableSetup.renameLabel', { name: area.name })} autoFocus className={field} />
          <Button type="submit" disabled={busy} className="shrink-0">
            {t('tableSetup.save')}
          </Button>
          <Button variant="ghost" onClick={onRenameCancel} className="shrink-0">
            {t('tableSetup.cancel')}
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 p-2 pl-3">
      <div className="min-w-32 flex-1">
        <p className={cn('font-bold', area.isActive ? 'text-slate-900' : 'text-slate-400')}>
          {area.name} {!area.isActive && <Badge tone="grey">{t('tableSetup.inactive')}</Badge>}
        </p>
        <p className="text-xs text-slate-500">{t('tableSetup.areaTables', { n: tableCount })}</p>
        {openBills > 0 && area.isActive && <p className="text-xs font-semibold text-amber-700">{t('tableSetup.areaOpenBills', { n: openBills })}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={iconButton} disabled={busy || first} onClick={() => onMove(position - 1)} aria-label={t('tableSetup.moveUp', { name: area.name })}>
          <ArrowUp className="size-5" aria-hidden />
        </button>
        <button type="button" className={iconButton} disabled={busy || last} onClick={() => onMove(position + 1)} aria-label={t('tableSetup.moveDown', { name: area.name })}>
          <ArrowDown className="size-5" aria-hidden />
        </button>
        <button type="button" className={iconButton} disabled={busy} onClick={onRenameStart} aria-label={`${t('tableSetup.rename')} ${area.name}`}>
          <Pencil className="size-4" aria-hidden />
        </button>
        <Button
          variant="ghost"
          disabled={busy || (area.isActive && openBills > 0)}
          onClick={() => onActive(!area.isActive)}
          aria-label={`${area.isActive ? t('tableSetup.deactivate') : t('tableSetup.activate')} ${area.name}`}
        >
          {area.isActive ? t('tableSetup.deactivate') : t('tableSetup.activate')}
        </Button>
      </div>
    </li>
  );
}

// ── Add Table (one or many) ──────────────────────────────────────────────────────────────────

export function AddTableDialog({ setup, defaultAreaId, onClose }: { setup: TableSetup; defaultAreaId: string | null; onClose: () => void }) {
  const toast = useToast();
  const areas = setup.areas.filter((a) => a.area.isActive).map((a) => a.area);
  // Suggest the next number of the whole branch (T17), so a new table never looks like one in another area.
  const next = nextTableNumber('T', setup.tables.map((e) => e.table.name));
  const [mode, setMode] = useState<'one' | 'many'>('one');
  const [areaId, setAreaId] = useState(areas.find((a) => a.id === defaultAreaId)?.id ?? areas[0]?.id ?? '');
  const [name, setName] = useState(`T${next}`);
  const [seats, setSeats] = useState('4');
  const [prefix, setPrefix] = useState('T');
  const [from, setFrom] = useState(String(next));
  const [to, setTo] = useState(String(next + 9));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const area = areas.find((a) => a.id === areaId);
  const taken = setup.tables.filter((e) => e.table.areaId === areaId).map((e) => e.table.name);
  const bulk = { prefix, from: wholeNumber(from), to: wholeNumber(to), seats: wholeNumber(seats) };
  const bulkCheck = checkBulkTables(bulk, taken);

  const submit = async () => {
    if (!area) return;
    let problem: TableSetupProblem | null;
    let problemName = cleanName(name);
    if (mode === 'one') {
      problem = checkName(name, taken) ?? checkSeats(bulk.seats);
    } else {
      problem = bulkCheck.ok ? null : bulkCheck.problem;
      problemName = bulkCheck.ok ? '' : (bulkCheck.name ?? '');
    }
    if (problem) return setError(errorText(problem, problemName, area.name));
    setBusy(true);
    setError(null);
    try {
      if (mode === 'one') {
        const table = await getApi().saveTable({ id: null, name, areaId, seats: bulk.seats, position: null });
        toast.show({ tone: 'success', title: t('tableSetup.addedOne', { name: table.name }) });
      } else {
        const tables = await getApi().addTables({ areaId, ...bulk });
        toast.show({ tone: 'success', title: t('tableSetup.added', { n: tables.length }) });
      }
      onClose();
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  const tab = (value: 'one' | 'many', label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => (setMode(value), setError(null))}
      className={cn('min-h-11 flex-1 rounded-lg text-sm font-bold', mode === value ? 'bg-white text-brand shadow-sm' : 'text-slate-600')}
    >
      {label}
    </button>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('tableSetup.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('tableSetup.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !area}>
            {t('tableSetup.add')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tab('one', t('tableSetup.oneTable'))}
          {tab('many', t('tableSetup.manyTables'))}
        </div>
        <Field label={t('tableSetup.area')}>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={field}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {mode === 'one' ? (
          <Field label={t('tableSetup.name')}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tableSetup.namePlaceholder')} className={field} />
          </Field>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('tableSetup.prefix')}>
              <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={field} />
            </Field>
            <Field label={t('tableSetup.from')}>
              <input value={from} onChange={(e) => setFrom(e.target.value)} inputMode="numeric" className={field} />
            </Field>
            <Field label={t('tableSetup.to')}>
              <input value={to} onChange={(e) => setTo(e.target.value)} inputMode="numeric" className={field} />
            </Field>
          </div>
        )}
        <Field label={t('tableSetup.seats')}>
          <input value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" className={field} />
        </Field>
        {mode === 'many' && bulkCheck.ok && (
          <p className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
            {bulkCheck.names.length === 1
              ? t('tableSetup.manyPreviewOne', { first: bulkCheck.names[0] ?? '', seats: bulk.seats })
              : t('tableSetup.manyPreview', {
                  first: bulkCheck.names[0] ?? '',
                  last: bulkCheck.names[bulkCheck.names.length - 1] ?? '',
                  n: bulkCheck.names.length,
                  seats: bulk.seats,
                })}
          </p>
        )}
        <FormError message={error} />
        {/* Enter in a field adds the table(s) */}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

// ── Edit one table ───────────────────────────────────────────────────────────────────────────

export function EditTableDialog({ setup, tableId, onClose }: { setup: TableSetup; tableId: string; onClose: () => void }) {
  const toast = useToast();
  const entry = setup.tables.find((e) => e.table.id === tableId);
  const table = entry?.table;
  const inArea = (areaId: string) => setup.tables.filter((e) => e.table.areaId === areaId);
  const [name, setName] = useState(table?.name ?? '');
  const [areaId, setAreaId] = useState(table?.areaId ?? '');
  const [seats, setSeats] = useState(String(table?.seats ?? 4));
  const [position, setPosition] = useState(String(inArea(table?.areaId ?? '').findIndex((e) => e.table.id === tableId) + 1));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!entry || !table) {
    return (
      <Dialog open onClose={onClose} title={t('tableSetup.editTitle', { name: '' })}>
        <ErrorState message={t('states.errorBody')} />
      </Dialog>
    );
  }

  const areas = setup.areas.map((a) => a.area).filter((a) => a.isActive || a.id === table.areaId);
  const area = areas.find((a) => a.id === areaId);
  const moved = areaId !== table.areaId;
  // In another area the table goes to the end unless a position is typed.
  const areaSize = inArea(areaId).length + (moved ? 1 : 0);
  const locked = entry.hasOpenBill;

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      toast.show({ tone: 'success', title: await work() });
      onClose();
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  const save = () => {
    const seatCount = wholeNumber(seats);
    const taken = inArea(areaId).filter((e) => e.table.id !== tableId).map((e) => e.table.name);
    const problem = checkName(name, taken) ?? checkSeats(seatCount);
    if (problem) return setError(errorText(problem, cleanName(name), area?.name ?? ''));
    const typed = wholeNumber(position);
    void run(async () => {
      const saved = await getApi().saveTable({ id: tableId, name, areaId, seats: seatCount, position: Number.isNaN(typed) ? null : typed });
      return t('tableSetup.saved', { name: saved.name });
    });
  };

  if (confirmRemove) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={t('tableSetup.removeTitle', { name: table.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
              {t('tableSetup.cancel')}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await getApi().removeTable(tableId);
                  return t(result === 'ARCHIVED' ? 'tableSetup.archived' : 'tableSetup.deleted', { name: table.name });
                })
              }
            >
              {t('tableSetup.removeConfirm')}
            </Button>
          </>
        }
      >
        <p>{t(entry.used ? 'tableSetup.removeArchived' : 'tableSetup.removeDeleted', { name: table.name })}</p>
        <FormError message={error} />
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('tableSetup.editTitle', { name: table.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('tableSetup.cancel')}
          </Button>
          <Button onClick={save} disabled={busy}>
            {t('tableSetup.save')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {locked && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t('tableSetup.openBillLock')}</p>}
        <Field label={t('tableSetup.name')}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </Field>
        <Field label={t('tableSetup.area')}>
          <select
            value={areaId}
            disabled={locked}
            onChange={(e) => {
              setAreaId(e.target.value);
              setPosition(String(e.target.value === table.areaId ? inArea(table.areaId).findIndex((x) => x.table.id === tableId) + 1 : inArea(e.target.value).length + 1));
            }}
            className={field}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('tableSetup.seats')}>
            <input value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" className={field} />
          </Field>
          <Field label={t('tableSetup.position')} hint={t('tableSetup.positionHint', { n: areaSize })}>
            <input value={position} onChange={(e) => setPosition(e.target.value)} inputMode="numeric" className={field} />
          </Field>
        </div>
        <FormError message={error} />
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Button
            variant="secondary"
            disabled={busy || (locked && table.isActive)}
            onClick={() =>
              void run(async () => {
                await getApi().setTableInService(tableId, !table.isActive);
                return t(table.isActive ? 'tableSetup.nowOutOfService' : 'tableSetup.nowInService', { name: table.name });
              })
            }
          >
            {table.isActive ? t('tableSetup.outOfService') : t('tableSetup.backInService')}
          </Button>
          <Button variant="ghost" className="text-red-700" disabled={busy || locked} onClick={() => (setError(null), setConfirmRemove(true))}>
            {t('tableSetup.remove')}
          </Button>
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
