'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_SAFE_HOURS,
  MAX_SIZES,
  MENU_UNITS,
  defaultReuse,
  checkMenuItem,
  cleanName,
  paisaToInput,
  parseRupees,
  sameName,
  type MenuItem,
  type MenuSetup,
  type ReuseSetting,
} from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { getApi, type MenuItemInput } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Switch } from '@/components/ui/switch';
import { menuProblemText } from './menu-parts';

type SizeRow = { id: string | null; name: string; price: string };

/**
 * Add or edit one menu item (Preview 5): name, category, kitchen station, unit, description, one price or
 * sizes, add-on groups, in stock and online. Prices are typed in rupees; old bills keep their own copies.
 */
export function MenuItemDialog({
  setup,
  item,
  defaultCategoryId,
  canStock,
  onClose,
  onSaved,
}: {
  setup: MenuSetup;
  /** null = new item */
  item: MenuItem | null;
  defaultCategoryId: string | null;
  canStock: boolean;
  onClose: () => void;
  onSaved: (item: MenuItem) => void;
}) {
  const categories = setup.categories.map((c) => c.category);
  const inCategory = (categoryId: string) => setup.items.filter((i) => i.categoryId === categoryId);
  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '');
  const [stationId, setStationId] = useState(item?.stationId ?? setup.stations[0]?.id ?? '');
  const [unit, setUnit] = useState<MenuItemInput['unit']>(item?.unit ?? 'piece');
  const [description, setDescription] = useState(item?.description ?? '');
  const [hasSizes, setHasSizes] = useState((item?.variants.length ?? 0) > 0);
  const [price, setPrice] = useState(item && item.variants.length === 0 ? paisaToInput(item.basePrice) : '');
  const [sizes, setSizes] = useState<SizeRow[]>(
    item && item.variants.length > 0
      ? item.variants.map((v) => ({ id: v.id, name: v.name, price: paisaToInput(v.price) }))
      : [
          { id: null, name: t('menuSetup.item.small'), price: '' },
          { id: null, name: t('menuSetup.item.large'), price: '' },
        ],
  );
  const [groupIds, setGroupIds] = useState<string[]>(item?.modifierGroupIds ?? []);
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [isOnline, setIsOnline] = useState(item?.isOnline ?? true);
  // I4 (owner, 2026-11-09): made, cancelled, not served and safe → may go to another order of the same dish; null = the default by category
  const [reuse, setReuse] = useState<ReuseSetting | null>(item?.reuse ?? null);
  const [position, setPosition] = useState(item ? String(inCategory(item.categoryId).findIndex((i) => i.id === item.id) + 1) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const category = categories.find((c) => c.id === categoryId);
  const sameCategory = item?.categoryId === categoryId;
  const categorySize = inCategory(categoryId).length + (sameCategory ? 0 : 1);
  const reuseNow = reuse ?? defaultReuse(category?.name ?? '');

  const save = async () => {
    const input: MenuItemInput = {
      id: item?.id ?? null,
      name,
      categoryId,
      stationId,
      description,
      unit,
      price: hasSizes ? null : parseRupees(price),
      sizes: hasSizes ? sizes.map((s) => ({ id: s.id, name: s.name, price: parseRupees(s.price) })) : [],
      modifierGroupIds: groupIds,
      isAvailable,
      isOnline,
      reuse,
      position: /^\d+$/.test(position.trim()) ? Number(position) : null,
    };
    // One product once in the whole menu (owner, 2026-11-08): the message names the category that already has it
    const clash = setup.items.find((i) => i.id !== item?.id && sameName(i.name, name));
    const check = checkMenuItem({ name, description, price: input.price, sizes: input.sizes }, clash ? [clash.name] : []);
    if (check) return setError(menuProblemText(check, cleanName(name), (clash && categories.find((c) => c.id === clash.categoryId)?.name) || (category?.name ?? '')));
    setBusy(true);
    setError(null);
    try {
      onSaved(await getApi().saveMenuItem(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const label = 'mb-1 block font-bold text-slate-900';
  const rupeeField = (value: string, onChange: (v: string) => void, aria: string) => (
    <span className="flex">
      <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600" aria-hidden>
        Rs.
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder="0" aria-label={aria} className={cn(field, 'rounded-l-none')} />
    </span>
  );

  return (
    <Dialog
      open
      size="xl"
      onClose={onClose}
      title={item ? t('menuSetup.item.editTitle', { name: item.name }) : t('menuSetup.item.addTitle')}
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
      <form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="space-y-4">
          <label className="block">
            <span className={label}>{t('menuSetup.item.name')} *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('menuSetup.item.namePlaceholder')} aria-label={t('menuSetup.item.name')} className={field} autoFocus />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>{t('menuSetup.item.category')}</span>
              <select
                aria-label={t('menuSetup.item.category')}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPosition(e.target.value === item?.categoryId ? String(inCategory(e.target.value).findIndex((i) => i.id === item.id) + 1) : '');
                }}
                className={field}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isActive ? '' : ` (${t('menuSetup.hidden')})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>{t('menuSetup.item.station')}</span>
              <select value={stationId} onChange={(e) => setStationId(e.target.value)} aria-label={t('menuSetup.item.station')} className={field}>
                {setup.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>{t('menuSetup.item.unit')}</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value as MenuItemInput['unit'])} aria-label={t('menuSetup.item.unit')} className={field}>
                {MENU_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`menuSetup.units.${u}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>{t('menuSetup.item.position')}</span>
              <input value={position} onChange={(e) => setPosition(e.target.value)} inputMode="numeric" placeholder={String(categorySize)} aria-label={t('menuSetup.item.position')} className={field} />
              <span className="mt-1 block text-xs text-slate-500">{t('menuSetup.item.positionHint', { n: categorySize })}</span>
            </label>
          </div>
          <label className="block">
            <span className={label}>{t('menuSetup.item.description')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              aria-label={t('menuSetup.item.description')}
              rows={2}
              placeholder={t('menuSetup.item.descriptionPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
            />
          </label>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <Switch checked={isAvailable} onChange={setIsAvailable} disabled={!canStock} label={t('menuSetup.item.available')} hint={t('menuSetup.item.availableHint')} />
            <Switch checked={isOnline} onChange={setIsOnline} label={t('menuSetup.item.online')} hint={t('menuSetup.item.onlineHint')} />
            {item?.preparedItemId ? (
              <p className="text-xs text-slate-500">{t('menuSetup.item.reusePot')}</p>
            ) : (
              <div data-reuse-setting>
                <Switch checked={reuseNow.enabled} onChange={(on) => setReuse({ ...reuseNow, enabled: on })} label={t('menuSetup.item.reuse')} hint={t('menuSetup.item.reuseHint')} />
                {reuseNow.enabled && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 pl-1">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {t('menuSetup.item.reuseHours')}
                      <input
                        type="number"
                        min={1}
                        max={MAX_SAFE_HOURS}
                        value={reuseNow.safeHours}
                        onChange={(e) => setReuse({ ...reuseNow, safeHours: Math.round(Number(e.target.value)) })}
                        className="min-h-11 w-20 rounded-xl border border-slate-300 bg-white px-2 text-base"
                      />
                    </label>
                    <Switch checked={reuseNow.overnight} onChange={(on) => setReuse({ ...reuseNow, overnight: on })} label={t('menuSetup.item.reuseOvernight')} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <fieldset>
            <legend className={label}>{t('menuSetup.item.price')} *</legend>
            <div className="mb-2 flex gap-1 rounded-xl bg-slate-100 p-1">
              {[false, true].map((sized) => (
                <button
                  key={String(sized)}
                  type="button"
                  aria-pressed={hasSizes === sized}
                  onClick={() => setHasSizes(sized)}
                  className={cn('min-h-10 flex-1 rounded-lg text-sm font-bold', hasSizes === sized ? 'bg-white text-brand shadow-sm' : 'text-slate-600')}
                >
                  {sized ? t('menuSetup.item.sizes') : t('menuSetup.item.onePrice')}
                </button>
              ))}
            </div>
            {!hasSizes ? (
              rupeeField(price, setPrice, t('menuSetup.item.price'))
            ) : (
              <div className="space-y-2">
                {sizes.map((size, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={size.name}
                      onChange={(e) => setSizes((all) => all.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)))}
                      aria-label={t('menuSetup.item.sizeName', { n: index + 1 })}
                      className={cn(field, 'min-w-0 flex-1')}
                    />
                    <span className="w-36 shrink-0">
                      {rupeeField(size.price, (v) => setSizes((all) => all.map((s, i) => (i === index ? { ...s, price: v } : s))), t('menuSetup.item.sizePrice', { n: index + 1 }))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSizes((all) => all.filter((_, i) => i !== index))}
                      disabled={sizes.length <= 1}
                      aria-label={t('menuSetup.item.removeSize', { n: index + 1 })}
                      className="grid size-12 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" disabled={sizes.length >= MAX_SIZES} onClick={() => setSizes((all) => [...all, { id: null, name: '', price: '' }])}>
                  <Plus className="size-4" aria-hidden />
                  {t('menuSetup.item.addSize')}
                </Button>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className={label}>{t('menuSetup.item.addons')}</legend>
            {setup.addonGroups.length === 0 ? (
              <p className="text-sm text-slate-500">{t('menuSetup.item.noAddons')}</p>
            ) : (
              <div className="space-y-2">
                {setup.addonGroups.map(({ group }) => {
                  const on = groupIds.includes(group.id);
                  return (
                    <label key={group.id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3', on ? 'border-brand bg-brand-soft' : 'border-slate-200')}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setGroupIds((ids) => (on ? ids.filter((id) => id !== group.id) : [...ids, group.id]))}
                        className="mt-1 size-5 accent-[var(--color-brand)]"
                      />
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-900">{group.name}</span>
                        <span className="block text-xs text-slate-600">
                          {t('menuSetup.addons.rule', { min: group.minSelect, max: group.maxSelect })} · {group.modifiers.map((m) => m.name).join(', ')}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
