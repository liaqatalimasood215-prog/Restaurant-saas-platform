'use client';

import { useState } from 'react';
import { t } from '@/i18n';
import { Button } from './button';
import { Dialog } from './dialog';

/** Risky actions (reject, cancel) ask for confirmation and a written reason (MASTER_PROMPT.md §11). */
export function ReasonDialog({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => (reason.trim() ? onConfirm(reason.trim()) : setError(true))}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="mb-3">{body}</p>
      <label className="block">
        <span className="mb-1 block font-bold text-slate-900">{t('waiter.voidReason')}</span>
        <input
          value={reason}
          maxLength={140}
          onChange={(e) => {
            setReason(e.target.value);
            setError(false);
          }}
          className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-red-700">
          {t('waiter.voidReasonRequired')}
        </p>
      )}
    </Dialog>
  );
}
