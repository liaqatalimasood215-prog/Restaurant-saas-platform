'use client';

import { useState } from 'react';
import { Check, Clock, Globe } from 'lucide-react';
import { normalizeDomain, platformSubdomain } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { Heading, type OnlineTabProps } from './online-parts';

/**
 * The restaurant buys and owns its domain; the platform provides the website. These are DEMO steps of connecting one:
 * no real domain or DNS is touched, and the customer link and QR code keep the development address until hosting.
 */
export function DomainSection({ view, canPublish, busy, run }: OnlineTabProps) {
  const { customDomain, domainState } = view.publishing;
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slug = view.customerPath.split('/')[1] ?? '';

  const connect = () => {
    if (!normalizeDomain(domain)) return setError(t('onlineApp.site.domainInvalid'));
    setError(null);
    void run(() => getApi().connectDomain(domain));
  };
  const remove = (
    <Button variant="secondary" disabled={busy || !canPublish} onClick={() => void run(() => getApi().removeDomain())}>
      {t('onlineApp.site.domainRemove')}
    </Button>
  );

  return (
    <Card>
      <CardBody className="space-y-4" data-domain-state={domainState}>
        <div className="flex flex-wrap items-center gap-2">
          <Heading icon={Globe} title={t('onlineApp.site.names.domain')} />
          <Badge tone={domainState === 'CONNECTED' ? 'green' : 'amber'}>{t(`onlineApp.site.domainState.${domainState}`)}</Badge>
        </div>
        <p className="text-sm text-slate-700">{t('onlineApp.domainTab.ownership')}</p>
        {!canPublish && <p className="text-xs font-semibold text-slate-600">{t('onlineApp.site.ownerOnly')}</p>}

        {domainState === 'NONE' && (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-900">{t('onlineApp.site.domainLabel')}</span>
              <input
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setError(null);
                }}
                disabled={!canPublish}
                placeholder="yourrestaurant.com"
                autoCapitalize="none"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <Button disabled={busy || !canPublish} onClick={connect}>
              {t('onlineApp.connectDomain')}
            </Button>
          </div>
        )}

        {domainState === 'DNS_PENDING' && customDomain && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="size-4 text-amber-600" aria-hidden />
              {customDomain}
            </p>
            <div>
              <h3 className="mb-1 text-sm font-bold text-slate-900">{t('onlineApp.site.dnsTitle')}</h3>
              <p className="mb-2 text-xs text-slate-600">{t('onlineApp.site.dnsBody')}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm" data-dns-table>
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-bold">{t('onlineApp.site.dnsType')}</th>
                      <th className="px-3 py-2 font-bold">{t('onlineApp.site.dnsName')}</th>
                      <th className="px-3 py-2 font-bold">{t('onlineApp.site.dnsValue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 font-semibold">CNAME</td>
                      <td className="px-3 py-2">www</td>
                      <td className="px-3 py-2">sites.lalaorders.com</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold">A</td>
                      <td className="px-3 py-2">@</td>
                      <td className="px-3 py-2">{t('onlineApp.site.dnsLater')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('onlineApp.site.dnsExample')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || !canPublish} onClick={() => void run(() => getApi().markDomainConnected())}>
                {t('onlineApp.site.domainMark')}
              </Button>
              {remove}
            </div>
          </div>
        )}

        {domainState === 'CONNECTED' && customDomain && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Check className="size-4 text-green-600" aria-hidden />
              {customDomain}
            </p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('onlineApp.site.domainDemo')}</p>
            {remove}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">{platformSubdomain(slug)}</p>
            <Badge tone="amber">{t('onlineApp.planned')}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">{t('onlineApp.site.subdomainBody')}</p>
        </div>
      </CardBody>
    </Card>
  );
}
