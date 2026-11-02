'use client';

import { getDemoControls } from '@/lib/api';
import { useWebsiteBridge } from '@/screens/online-app/website-bridge';

/**
 * DEMO only, until the backend (Phase 4): the customer website and the Rider App open this page in a hidden frame on the same
 * computer, so they reach the Restaurant OS data of this browser while no Restaurant OS tab is their parent. The shell answers
 * orders and rider steps (useCustomerLink, useRiderBridge); this page answers the menu.
 */
export default function DemoLinkPage() {
  useWebsiteBridge(() => getDemoControls().websiteLinkData());
  return null;
}
