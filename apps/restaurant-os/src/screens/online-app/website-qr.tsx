'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Eye, QrCode } from 'lucide-react';
import qrcode from 'qrcode-generator';
import type { OnlineAppView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { Heading, customerShareUrl } from './online-parts';

const QUIET_MODULES = 4;

function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) => Array.from({ length: count }, (__, col) => qr.isDark(row, col)));
}

/** Drawn in the browser (free library, no outside service), with a clean edge for printing. */
function downloadPng(text: string, fileName: string): void {
  const modules = qrModules(text);
  const scale = 12;
  const size = (modules.length + QUIET_MODULES * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  modules.forEach((row, y) => row.forEach((dark, x) => dark && ctx.fillRect((x + QUIET_MODULES) * scale, (y + QUIET_MODULES) * scale, scale, scale)));
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = fileName;
  link.click();
}

export function QrSection({ view }: { view: OnlineAppView }) {
  const toast = useToast();
  const [previewing, setPreviewing] = useState(false);
  const url = customerShareUrl(view.customerPath);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ tone: 'success', title: t('onlineApp.copied') });
    } catch {
      toast.show({ tone: 'error', title: t('onlineApp.copyFailed') });
    }
  };
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Heading icon={QrCode} title={t('onlineApp.linkTitle')} />
          <Badge tone="amber">{t('onlineApp.linkStatus')}</Badge>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <QrImage text={url} label={t('onlineApp.qrLabel', { url })} className="size-40" />
          <div className="min-w-56 flex-1 space-y-2">
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('onlineApp.linkLabel')}</span>
              <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t('onlineApp.linkLabel')} className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void copy()}>
                <Copy className="size-4" aria-hidden />
                {t('onlineApp.copy')}
              </Button>
              <Button variant="secondary" onClick={() => setPreviewing(true)}>
                <Eye className="size-4" aria-hidden />
                {t('onlineApp.site.qrPreview')}
              </Button>
              <Button variant="secondary" onClick={() => downloadPng(url, `customer-qr${view.customerPath.replace(/\//g, '-')}.png`)}>
                <Download className="size-4" aria-hidden />
                {t('onlineApp.site.qrDownload')}
              </Button>
            </div>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('onlineApp.linkHint')}</p>
          </div>
        </div>
      </CardBody>
      {previewing && (
        <Dialog open onClose={() => setPreviewing(false)} title={t('onlineApp.site.qrPreview')} footer={<Button onClick={() => setPreviewing(false)}>{t('onlineApp.site.close')}</Button>}>
          <div className="flex flex-col items-center gap-2 text-center" data-qr-preview>
            <QrImage text={url} label={t('onlineApp.qrLabel', { url })} className="size-64" />
            <p className="text-sm font-bold text-slate-900">{t('onlineApp.site.qrScan')}</p>
            <p className="break-all text-xs text-slate-500">{url}</p>
          </div>
        </Dialog>
      )}
    </Card>
  );
}

export function QrImage({ text, label, className }: { text: string; label: string; className: string }) {
  const { size, path } = useMemo(() => {
    const modules = qrModules(text);
    let d = '';
    modules.forEach((row, y) => row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    }));
    return { size: modules.length, path: d };
  }, [text]);
  return (
    <svg
      role="img"
      aria-label={label}
      data-qr={text}
      viewBox={`${-QUIET_MODULES} ${-QUIET_MODULES} ${size + QUIET_MODULES * 2} ${size + QUIET_MODULES * 2}`}
      shapeRendering="crispEdges"
      className={`${className} shrink-0 rounded-xl border border-slate-200 bg-white`}
    >
      <path d={path} fill="#000" />
    </svg>
  );
}
