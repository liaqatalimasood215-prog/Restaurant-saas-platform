'use client';

import { useEffect } from 'react';
import { CUSTOMER_LINK_ORDER, CUSTOMER_LINK_RESULT, CUSTOMER_LINK_STATUS, CUSTOMER_LINK_TRACK, isCustomerLinkOrder } from '@restaurant-saas/shared';
import { getDemoControls } from '@/lib/api';
import { CUSTOMER_APP_ORIGIN } from './online-parts';

/**
 * DEMO link until the backend joins the apps (Phase 4): the customer website sends its order here and asks for the steps of
 * its own tracking links. Only the website's address is believed and the shape is checked. This is not security.
 */
export function useCustomerLink(): void {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CUSTOMER_APP_ORIGIN || !event.source) return;
      const page = event.source as Window;
      const message = event.data as { type?: string; id?: unknown; order?: unknown; tokens?: unknown } | null;
      if (message?.type === CUSTOMER_LINK_ORDER && isCustomerLinkOrder(message.order)) {
        const answer = (placed: unknown, error: string | null) => page.postMessage({ type: CUSTOMER_LINK_RESULT, id: message.id, placed, error }, CUSTOMER_APP_ORIGIN);
        getDemoControls()
          .receiveCustomerOrder(message.order)
          .then(
            (placed) => answer(placed, null),
            (err: unknown) => answer(null, err instanceof Error ? err.message : 'That did not work. Try again.'),
          );
      } else if (message?.type === CUSTOMER_LINK_TRACK && Array.isArray(message.tokens) && getDemoControls().linkReady()) {
        const tokens = message.tokens.filter((token): token is string => typeof token === 'string');
        page.postMessage({ type: CUSTOMER_LINK_STATUS, orders: getDemoControls().customerLinkStatus(tokens) }, CUSTOMER_APP_ORIGIN);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
