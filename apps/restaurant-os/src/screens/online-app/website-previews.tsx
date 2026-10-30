'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { customerUrl } from './online-parts';

export type PreviewDevice = 'desktop' | 'mobile';

const SIZE: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1280, height: 440 },
  mobile: { width: 390, height: 560 },
};

/**
 * Both previews show the real customer website in a frame, never a copy of its homepage, so a change to the website
 * appears here by itself. It keeps its own sample data until the backend joins the two (Phase 4).
 */
export function LivePreview({ path, device, onDevice }: { path: string; device: PreviewDevice; onDevice: (device: PreviewDevice) => void }) {
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
          <Badge tone="amber">{t('onlineApp.linkStatus')}</Badge>
        </div>
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
        <p className="text-xs text-slate-500">{t('onlineApp.previewHint')}</p>
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
        <div className="relative h-[560px] w-[281px] overflow-hidden rounded-[2.25rem] border-[6px] border-slate-800 bg-white">
          <iframe src={customerUrl(path)} title={t('onlineApp.previewPhoneFrame')} loading="lazy" className="h-[800px] w-[390px] origin-top-left scale-[0.7] border-0" />
        </div>
      </CardBody>
    </Card>
  );
}
