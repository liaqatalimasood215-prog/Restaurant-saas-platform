'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatPaisa, formatQuantity, normalizePhone, type DraftItemInput, type MenuItem, type MenuSnapshot, type Order } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { addToCart, describeLine, type CartLine } from '../waiter/cart';
import { ItemDialog } from '../waiter/item-dialog';
import { newId } from '@/lib/new-id';

/**
 * Takeaway at the counter or a delivery order taken on the phone (MASTER_PROMPT.md §5.3, §5.4).
 * It starts as ACCEPTED and goes straight to the kitchen. A known phone fills in name and address.
 */
export function CounterOrderDialog({
  type,
  menu,
  deliveryFee,
  onClose,
  onCreated,
}: {
  type: 'TAKEAWAY' | 'DELIVERY';
  menu: MenuSnapshot;
  deliveryFee: number;
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState(menu.categories[0]?.id ?? '');
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => newId());

  const views = cart.map((l) => describeLine(l, menu)).filter((v) => v !== null);
  const itemsTotal = views.reduce((sum, v) => sum + v.unitPrice * v.line.quantity, 0);

  const lookUp = async () => {
    if (!normalizePhone(phone) || name) return;
    try {
      const known = await getApi().findCustomer(phone);
      if (known) {
        setName(known.name);
        if (type === 'DELIVERY' && !address) setAddress(known.address);
      }
    } catch {
      // lookup is only a convenience
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const order = await getApi().createCounterOrder({
        type,
        channel: type === 'DELIVERY' ? 'PHONE' : 'POS',
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        note,
        items: cart.map((l): DraftItemInput => ({ menuItemId: l.menuItemId, variantId: l.variantId, modifierIds: l.modifierIds, note: l.note, quantity: l.quantity, ...(l.sizes ? { sizes: l.sizes } : {}) })),
        idempotencyKey: key,
      });
      onCreated(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base';

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={type === 'DELIVERY' ? t('online.newPhoneTitle') : t('online.newTakeawayTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('nav.close')}
            </Button>
            <Button onClick={create} disabled={busy || cart.length === 0}>
              {t('online.createOrder')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('staff.phone')}</span>
              <input value={phone} inputMode="tel" placeholder="0300-1234567" onChange={(e) => setPhone(e.target.value)} onBlur={lookUp} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('online.customerName')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </label>
          </div>
          {type === 'DELIVERY' && (
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('online.address')}</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
            </label>
          )}

          <div>
            <p className="mb-1 font-bold text-slate-900">{t('waiter.menu')}</p>
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {menu.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn('min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold', category === c.id ? 'bg-brand text-white' : 'border border-slate-200')}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {menu.items
                .filter((i) => i.categoryId === category)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.isAvailable}
                    onClick={() => setPicking(item)}
                    className="min-h-12 rounded-xl border border-slate-200 px-3 text-left text-sm font-semibold hover:border-brand disabled:opacity-40"
                  >
                    {item.name}
                  </button>
                ))}
            </div>
          </div>

          {views.length > 0 && (
            <ul className="space-y-2">
              {views.map((v) => (
                <li key={v.line.key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-bold">{v.name}</span>
                    {v.details && <span className="block text-xs text-slate-600">{v.details}</span>}
                    <span className="block text-xs">
                      {formatQuantity(v.line.quantity, v.unit)} · {formatPaisa(v.unitPrice * v.line.quantity)}
                    </span>
                  </span>
                  <QuantityStepper
                    size="sm"
                    value={v.line.quantity}
                    onChange={(n) => setCart((c) => c.map((l) => (l.key === v.line.key ? { ...l, quantity: n } : l)))}
                    label={t('waiter.quantity')}
                  />
                  <button
                    type="button"
                    aria-label={t('waiter.remove', { name: v.name })}
                    onClick={() => setCart((c) => c.filter((l) => l.key !== v.line.key))}
                    className="flex size-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('online.orderNote')}</span>
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={field} />
          </label>

          <p className="flex justify-between rounded-xl bg-slate-50 p-3 font-bold">
            <span>{type === 'DELIVERY' ? t('online.totalWithFee', { fee: formatPaisa(deliveryFee) }) : t('pos.total')}</span>
            <span>{formatPaisa(itemsTotal + (type === 'DELIVERY' && cart.length > 0 ? deliveryFee : 0))}</span>
          </p>
          {error && (
            <p role="alert" className="font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      </Dialog>
      {picking && (
        <ItemDialog
          item={picking}
          menu={menu}
          onClose={() => setPicking(null)}
          onAdd={(draft) => {
            setCart((c) => addToCart(c, draft));
            setPicking(null);
          }}
        />
      )}
    </>
  );
}
