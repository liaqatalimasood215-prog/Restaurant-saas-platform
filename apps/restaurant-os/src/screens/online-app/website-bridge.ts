'use client';

import { useEffect, useRef } from 'react';
import { WEBSITE_PREVIEW_DATA, WEBSITE_PREVIEW_READY } from '@restaurant-saas/shared';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { CUSTOMER_APP_ORIGIN } from './online-parts';

/**
 * DEMO link until the backend joins the two apps (Phase 4): a website preview frame, or a website tab opened from this
 * page, says it is ready; this page answers with its menu, prices and switches, and again after every change.
 * While this page is closed, the website falls back to the last menu it got, or its own sample data.
 */
export function useWebsiteBridge(): void {
  const preview = useApiQuery(() => getApi().getWebsitePreview(), []);
  const pages = useRef(new Set<Window>());
  const latest = useRef(preview.data);

  useEffect(() => {
    latest.current = preview.data;
    if (!preview.data) return;
    for (const page of pages.current) {
      if (page.closed) pages.current.delete(page);
      else page.postMessage({ type: WEBSITE_PREVIEW_DATA, data: preview.data }, CUSTOMER_APP_ORIGIN);
    }
  }, [preview.data]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CUSTOMER_APP_ORIGIN || event.data?.type !== WEBSITE_PREVIEW_READY || !event.source) return;
      const page = event.source as Window;
      pages.current.add(page);
      if (latest.current) page.postMessage({ type: WEBSITE_PREVIEW_DATA, data: latest.current }, CUSTOMER_APP_ORIGIN);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
