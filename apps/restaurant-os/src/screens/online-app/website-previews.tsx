'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Monitor, Smartphone } from 'lucide-react';
import type { OnlineAppView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { customerUrl } from './online-parts';

export type PreviewDevice = 'desktop' | 'mobile';

const SIZE: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1280, height: 440 },
  mobile: { width: 390, height: 560 },
};

/**
 * Both previews show the real customer website in a frame, never a copy of its homepage. For this restaurant it shows
 * the Restaurant OS menu, prices and switches (website-bridge.ts); a sample restaurant keeps its own menu.
 */
export function LivePreview({ view, path, onPath, device, onDevice }: { view: OnlineAppView; path: string; onPath: (path: string) => void; device: PreviewDevice; onDevice: (device: PreviewDevice) => void }) {
  const { data: session } = useSession();
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry?.contentRect.width ?? 0));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const { width, height } = SIZE[device];
  const scale = device === 'desktop' ? boxWidth / width : Math.min(0.85, boxWidth / width);
  const choice = (value: PreviewDevice, Icon: typeof Monitor, label: string) => (
    <button
      type="button"
      aria-pressed={device === value}
      onClick={() => onDevice(value)}
      className={cn('flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold', device === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{t('onlineApp.previewTitle')}</CardTitle>
          <Badge tone="amber">{t('onlineApp.demo')}</Badge>
        </div>
        <label className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="sr-only">{t('onlineApp.previewRestaurant')}</span>
          <select value={path} onChange={(e) => onPath(e.target.value)} aria-label={t('onlineApp.previewRestaurant')} className="min-h-11 min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <option value={view.customerPath}>{t('onlineApp.previewYours', { name: session?.restaurant.name ?? '' })}</option>
            {view.samplePreviews.map((sample) => (
              <option key={sample.path} value={sample.path}>
                {t('onlineApp.previewSample', { name: sample.name })}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label={t('onlineApp.previewDevice')} className="flex gap-1">
          {choice('desktop', Monitor, t('onlineApp.desktop'))}
          {choice('mobile', Smartphone, t('onlineApp.mobile'))}
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <div ref={boxRef} className="w-full">
          {boxWidth > 0 && (
            <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white', device === 'mobile' && 'mx-auto')} style={{ width: width * scale, height }} data-preview-device={device}>
              <iframe src={customerUrl(path)} title={t('onlineApp.previewFrame')} className="origin-top-left border-0" style={{ width, height: height / scale, transform: `scale(${scale})` }} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-56 flex-1 text-xs text-slate-500" data-preview-hint>
            {path === view.customerPath ? t('onlineApp.previewHint') : t('onlineApp.previewHintSample')}
          </p>
          <a href={customerUrl(path)} target="_blank" rel="opener" data-preview-open className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-brand hover:bg-brand-soft">
            <ExternalLink className="size-4" aria-hidden />
            {t('onlineApp.previewOpen')}
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

export function PhonePreview({ path }: { path: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onlineApp.previewPhone')}</CardTitle>
      </CardHeader>
      <CardBody className="flex justify-center">
        {/* Inside the frame: exactly 390 × 800 at 70 %, with white above and below, so the website's bottom bar is never cut off. */}
        <div className="box-content h-[560px] w-[273px] overflow-hidden rounded-[2.25rem] border-[6px] border-slate-800 bg-white py-3" data-phone-screen>
          <iframe src={customerUrl(path)} title={t('onlineApp.previewPhoneFrame')} loading="lazy" className="h-[800px] w-[390px] origin-top-left scale-[0.7] border-0" />
        </div>
      </CardBody>
    </Card>
  );
}
