'use client';

import { useEffect } from 'react';
import { RIDER_LINK_ASK, RIDER_LINK_COMMAND, RIDER_LINK_DATA, RIDER_LINK_RESULT } from '@restaurant-saas/shared';
import { getDemoControls } from '@/lib/api';

/** The Rider App's development address (PROJECT_RULES.md §3); the real address comes with hosting. */
export const RIDER_APP_ORIGIN = 'http://localhost:3002';

const LAN_ADDRESS = process.env.NEXT_PUBLIC_LAN_ADDRESS;

/** The link for a phone on the same Wi-Fi: it shows sample data, because the link below needs this browser. */
export const riderShareUrl = (path: string) => (LAN_ADDRESS ? `http://${LAN_ADDRESS}:3002${path}` : `${RIDER_APP_ORIGIN}${path}`);

/**
 * DEMO link until the backend joins the apps (Phase 4): a Rider App frame, or a tab opened from the Riders page, asks
 * for its data every moment and sends the rider's steps here. It lives in the shell, so it keeps working on every
 * Restaurant OS page. Only the Rider App's address is believed. This is not security: the real checks are on the server.
 */
export function useRiderBridge(): void {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== RIDER_APP_ORIGIN || !event.source || !getDemoControls().linkReady()) return;
      const page = event.source as Window;
      const message = event.data as { type?: string; riderId?: unknown; id?: unknown; command?: Parameters<ReturnType<typeof getDemoControls>['riderLinkCommand']>[0] } | null;
      if (message?.type === RIDER_LINK_ASK) {
        const riderId = typeof message.riderId === 'string' ? message.riderId : null;
        page.postMessage({ type: RIDER_LINK_DATA, data: getDemoControls().riderLinkData(riderId) }, RIDER_APP_ORIGIN);
      } else if (message?.type === RIDER_LINK_COMMAND && message.command) {
        const answer = (error: string | null) => page.postMessage({ type: RIDER_LINK_RESULT, id: message.id, error }, RIDER_APP_ORIGIN);
        getDemoControls()
          .riderLinkCommand(message.command)
          .then(
            () => answer(null),
            (err: unknown) => answer(err instanceof Error ? err.message : 'That did not work. Try again.'),
          );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
