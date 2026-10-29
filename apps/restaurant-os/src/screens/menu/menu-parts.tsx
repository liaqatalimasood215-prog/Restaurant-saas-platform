'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  MAX_ADDONS_PER_GROUP,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SIZES,
  checkAddonGroup,
  checkName,
  cleanName,
  formatPaisa,
  paisaToInput,
  parseRupees,
  type MenuCheck,
  type MenuItem,
  type MenuProblem,
  type MenuSetup,
  type ModifierGroup,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';

/** An ON / OFF switch with a label (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  compact,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Only the switch is shown; the label is for screen readers */
  compact?: boolean;
}) {
  return (
    <label className={cn('flex items-center gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-green-600' : 'bg-slate-300')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
      {!compact && (
        <span>
          <span className="block text-sm font-bold text-slate-900">{label}</span>
          {hint && <span className="block text-xs text-slate-500">{hint}</span>}
        </span>
      )}
    </label>
  );
}

/** Menu mistakes in the words of the screen (the demo server gives the same rules). */
export function menuProblemText(check: NonNullable<MenuCheck>, name: string, where: string): string {
  const p: MenuProblem = check.problem;
  const detail = check.detail ?? name;
  if (p === 'NAME_TAKEN') {
    if (where === 'category') return t('menuSetup.errors.categoryTaken', { name });
    if (where === 'group') return t('menuSetup.errors.groupTaken', { name });
    return t('menuSetup.errors.itemTaken', { name, category: where });
  }
  if (p === 'PRICE_INVALID') return check.detail ? t('menuSetup.errors.priceFor', { name: detail }) : t('menuSetup.errors.price');
  return t(`menuSetup.errors.${p}`, { max: p === 'NAME_TOO_LONG' ? MAX_NAME_LENGTH : p === 'TOO_MANY_SIZES' ? MAX_SIZES : p === 'TOO_MANY_ADDONS' ? MAX_ADDONS_PER_GROUP : MAX_DESCRIPTION_LENGTH, name: detail });
}

/** "Rs. 850" or "Small Rs. 600 · Large Rs. 1,200" */
export function priceText(item: MenuItem): string {
  if (item.variants.length === 0) return formatPaisa(item.basePrice);
  return item.variants.map((v) => `${v.name} ${formatPaisa(v.price)}`).join(' · ');
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : t('states.errorBody'));

// ── Categories ───────────────────────────────────────────────────────────────────────────────

/** Add, rename, reorder, hide / show and delete (only when empty) categories. */
export function CategoriesPanel({ setup, canManage }: { setup: MenuSetup; canManage: boolean }) {
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const entries = setup.categories;
  const others = (id: string | null) => entries.filter((e) => e.category.id !== id).map((e) => e.category.name);

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
  const save = async (id: string | null, name: string) => {
    const problem = checkName(name, others(id));
    if (problem) {
      setError(menuProblemText({ problem: problem as MenuProblem }, cleanName(name), 'category'));
      return false;
    }
    return run(() => getApi().saveMenuCategory({ id, name }));
  };
  const iconButton = 'grid size-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30';

  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="text-sm text-slate-600">{t('menuSetup.categories.hint')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {entries.map(({ category, itemCount }, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-2 p-2 pl-3" data-category-row={category.name}>
              {renaming?.id === category.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await save(category.id, renaming.name)) setRenaming(null);
                  }}
                >
                  <input
                    value={renaming.name}
                    onChange={(e) => setRenaming({ id: category.id, name: e.target.value })}
                    aria-label={t('menuSetup.categories.renameLabel', { name: category.name })}
                    autoFocus
                    className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3"
                  />
                  <Button type="submit" disabled={busy}>
                    {t('menuSetup.save')}
                  </Button>
                  <Button variant="ghost" onClick={() => setRenaming(null)}>
                    {t('menuSetup.cancel')}
                  </Button>
                </form>
              ) : (
                <>
                  <div className="min-w-32 flex-1">
                    <p className={cn('font-bold', category.isActive ? 'text-slate-900' : 'text-slate-400')}>
                      {category.name} {!category.isActive && <Badge tone="grey">{t('menuSetup.hidden')}</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">{t('menuSetup.categories.items', { n: itemCount })}</p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-1">
                      <button type="button" className={iconButton} disabled={busy || index === 0} onClick={() => void run(() => getApi().moveMenuCategory(category.id, index))} aria-label={t('menuSetup.categories.moveUp', { name: category.name })}>
                        <ArrowUp className="size-5" aria-hidden />
                      </button>
                      <button type="button" className={iconButton} disabled={busy || index === entries.length - 1} onClick={() => void run(() => getApi().moveMenuCategory(category.id, index + 2))} aria-label={t('menuSetup.categories.moveDown', { name: category.name })}>
                        <ArrowDown className="size-5" aria-hidden />
                      </button>
                      <button type="button" className={iconButton} disabled={busy} onClick={() => (setError(null), setRenaming({ id: category.id, name: category.name }))} aria-label={t('menuSetup.categories.rename', { name: category.name })}>
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <Button variant="ghost" disabled={busy} onClick={() => void run(() => getApi().setMenuCategoryActive(category.id, !category.isActive))} aria-label={`${category.isActive ? t('menuSetup.categories.hide') : t('menuSetup.categories.show')} ${category.name}`}>
                        {category.isActive ? t('menuSetup.categories.hide') : t('menuSetup.categories.show')}
                      </Button>
                      <button
                        type="button"
                        className={cn(iconButton, 'text-red-700')}
                        disabled={busy || itemCount > 0}
                        title={itemCount > 0 ? t('menuSetup.categories.notEmpty') : undefined}
                        onClick={() =>
                          void run(async () => {
                            await getApi().removeMenuCategory(category.id);
                            toast.show({ tone: 'success', title: t('menuSetup.categories.deleted', { name: category.name }) });
                          })
                        }
                        aria-label={t('menuSetup.categories.delete', { name: category.name })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save(null, newName)) {
                toast.show({ tone: 'success', title: t('menuSetup.categories.added', { name: cleanName(newName) }) });
                setNewName('');
              }
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('menuSetup.categories.newName')}
              aria-label={t('menuSetup.categories.newName')}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 px-3"
            />
            <Button type="submit" disabled={busy || !newName.trim()}>
              <Plus className="size-4" aria-hidden />
              {t('menuSetup.categories.add')}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

// ── Add-on groups ────────────────────────────────────────────────────────────────────────────

/** Add-on groups ("Pizza extras: choose 0–3"), each used by several items. */
export function AddonGroupsPanel({ setup, canManage }: { setup: MenuSetup; canManage: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState<ModifierGroup | 'new' | null>(null);
  const [removing, setRemoving] = useState<{ group: ModifierGroup; itemCount: number } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-slate-600">{t('menuSetup.addons.hint')}</p>
        {canManage && (
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />
            {t('menuSetup.addons.add')}
          </Button>
        )}
      </div>
      {setup.addonGroups.length === 0 ? (
        <EmptyState title={t('menuSetup.addons.empty')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {setup.addonGroups.map(({ group, itemCount }) => (
            <Card key={group.id} data-addon-group={group.name}>
              <CardBody className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-500">
                      {t('menuSetup.addons.rule', { min: group.minSelect, max: group.maxSelect })} · {t('menuSetup.addons.usedBy', { n: itemCount })}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setEditing(group)} className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t('menuSetup.addons.edit', { name: group.name })}>
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setRemoving({ group, itemCount })} className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50" aria-label={t('menuSetup.addons.delete', { name: group.name })}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
                <ul className="flex flex-wrap gap-1">
                  {group.modifiers.map((m) => (
                    <li key={m.id}>
                      <Badge tone={m.isAvailable ? 'grey' : 'red'} className={cn(!m.isAvailable && 'line-through')}>
                        {m.name} · {m.price === 0 ? t('menuSetup.addons.free') : formatPaisa(m.price)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <AddonGroupDialog
          group={editing === 'new' ? null : editing}
          takenNames={setup.addonGroups.filter((g) => editing === 'new' || g.group.id !== editing.id).map((g) => g.group.name)}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            toast.show({ tone: 'success', title: t('menuSetup.addons.saved', { name: saved.name }) });
          }}
        />
      )}
      {removing && (
        <Dialog
          open
          onClose={() => setRemoving(null)}
          title={t('menuSetup.addons.deleteTitle', { name: removing.group.name })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                {t('menuSetup.cancel')}
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await getApi().removeAddonGroup(removing.group.id);
                    toast.show({ tone: 'success', title: t('menuSetup.addons.deleted', { name: removing.group.name }) });
                    setRemoving(null);
                  } catch (err) {
                    toast.show({ tone: 'error', title: messageOf(err) });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t('menuSetup.delete')}
              </Button>
            </>
          }
        >
          {t('menuSetup.addons.deleteBody', { name: removing.group.name, n: removing.itemCount })}
        </Dialog>
      )}
    </>
  );
}

type AddonRow = { id: string | null; name: string; price: string; isAvailable: boolean };

function AddonGroupDialog({
  group,
  takenNames,
  onClose,
  onSaved,
}: {
  group: ModifierGroup | null;
  takenNames: string[];
  onClose: () => void;
  onSaved: (group: ModifierGroup) => void;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [min, setMin] = useState(String(group?.minSelect ?? 0));
  const [max, setMax] = useState(String(group?.maxSelect ?? 1));
  const [rows, setRows] = useState<AddonRow[]>(
    group?.modifiers.map((m) => ({ id: m.id, name: m.name, price: paisaToInput(m.price), isAvailable: m.isAvailable })) ?? [{ id: null, name: '', price: '', isAvailable: true }],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const whole = (text: string) => (/^\s*\d+\s*$/.test(text) ? Number(text) : Number.NaN);

  const save = async () => {
    const input = {
      id: group?.id ?? null,
      name,
      minSelect: whole(min),
      maxSelect: whole(max),
      addons: rows.map((r) => ({ id: r.id, name: r.name, price: r.price.trim() === '' ? 0 : parseRupees(r.price), isAvailable: r.isAvailable })),
    };
    const check = checkAddonGroup(input, takenNames);
    if (check) return setError(menuProblemText(check, cleanName(name), 'group'));
    setBusy(true);
    setError(null);
    try {
      onSaved(await getApi().saveAddonGroup(input));
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={group ? t('menuSetup.addons.editTitle', { name: group.name }) : t('menuSetup.addons.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('menuSetup.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t('menuSetup.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('menuSetup.addons.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('menuSetup.addons.namePlaceholder')} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('menuSetup.addons.min')}</span>
            <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('menuSetup.addons.max')}</span>
            <input value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" className={field} />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 font-bold text-slate-900">{t('menuSetup.addons.list')}</legend>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(e) => setRows((all) => all.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))}
                aria-label={t('menuSetup.addons.addonName', { n: index + 1 })}
                placeholder={t('menuSetup.addons.addonPlaceholder')}
                className={cn(field, 'min-w-0 flex-1')}
              />
              <input
                value={row.price}
                onChange={(e) => setRows((all) => all.map((r, i) => (i === index ? { ...r, price: e.target.value } : r)))}
                aria-label={t('menuSetup.addons.addonPrice', { n: index + 1 })}
                placeholder={t('menuSetup.addons.freePlaceholder')}
                inputMode="decimal"
                className={cn(field, 'w-24 shrink-0')}
              />
              <Switch compact checked={row.isAvailable} onChange={(on) => setRows((all) => all.map((r, i) => (i === index ? { ...r, isAvailable: on } : r)))} label={t('menuSetup.addons.addonAvailable', { n: index + 1 })} />
              <button
                type="button"
                disabled={rows.length <= 1}
                onClick={() => setRows((all) => all.filter((_, i) => i !== index))}
                aria-label={t('menuSetup.addons.removeAddon', { n: index + 1 })}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <Button variant="ghost" disabled={rows.length >= MAX_ADDONS_PER_GROUP} onClick={() => setRows((all) => [...all, { id: null, name: '', price: '', isAvailable: true }])}>
            <Plus className="size-4" aria-hidden />
            {t('menuSetup.addons.addAddon')}
          </Button>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
