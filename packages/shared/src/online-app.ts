/**
 * Online App / Website: publishing states of one restaurant (owner's brief, 2026-10-30).
 * Website and Android app are two separate publishing flows on one business system: publishing the website
 * never looks at, needs or changes anything of the Android app.
 * These are states only: nothing here deploys a website, builds an app or talks to Google Play.
 * Roman Urdu: Website aur Android app alag alag publish hote hain; website ko Android ki zaroorat nahi.
 */

export type WebsitePublishState = 'DRAFT' | 'PUBLISHING' | 'LIVE' | 'CHANGES_PENDING' | 'FAILED' | 'DOMAIN_REQUIRED';

export type PwaState = 'ENABLED' | 'DISABLED' | 'PLANNED';

export type AndroidAppState =
  | 'NOT_CONFIGURED'
  | 'SETUP_REQUIRED'
  | 'READY_TO_BUILD'
  | 'BUILDING'
  | 'BUILD_READY'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'UPDATE_AVAILABLE'
  | 'REJECTED'
  | 'ACTION_REQUIRED';

/** The future Android flow, in order (brief §22 B). */
export const ANDROID_FLOW_STEPS = ['SETUP', 'BUILD_READINESS', 'REVIEW', 'GOOGLE_PLAY', 'SUBMIT'] as const;
export type AndroidFlowStep = (typeof ANDROID_FLOW_STEPS)[number];

/** An expired subscription suspends the service; the restaurant's own domain always stays the restaurant's. */
export type SubscriptionState = 'ACTIVE' | 'SUSPENDED';

export interface OnlinePublishing {
  websiteState: WebsitePublishState;
  websitePublishedAt: string | null;
  /** The domain the restaurant bought and owns; null until it connects one */
  customDomain: string | null;
  pwaState: PwaState;
  androidState: AndroidAppState;
  subscription: SubscriptionState;
}

export const NEW_ONLINE_PUBLISHING: OnlinePublishing = {
  websiteState: 'DRAFT',
  websitePublishedAt: null,
  customDomain: null,
  pwaState: 'PLANNED',
  androidState: 'NOT_CONFIGURED',
  subscription: 'ACTIVE',
};

/** What the status header shows: the website's state, unless something bigger stops customers from ordering. */
export type OnlineStatus = WebsitePublishState | 'OFFLINE' | 'SUBSCRIPTION_SUSPENDED';

export function onlineStatus(publishing: OnlinePublishing, onlineOrdersEnabled: boolean): OnlineStatus {
  if (publishing.subscription === 'SUSPENDED') return 'SUBSCRIPTION_SUSPENDED';
  const published = publishing.websiteState === 'LIVE' || publishing.websiteState === 'CHANGES_PENDING';
  return published && !onlineOrdersEnabled ? 'OFFLINE' : publishing.websiteState;
}

/** Nothing new to publish, or the service is suspended: the Publish Website button stays off. */
export function canPublishWebsite(publishing: OnlinePublishing): boolean {
  return publishing.subscription === 'ACTIVE' && publishing.websiteState !== 'LIVE' && publishing.websiteState !== 'PUBLISHING';
}

/** Publish Website: changes the website only. Every Android field stays as it was. */
export function publishedWebsite(publishing: OnlinePublishing, at: string): OnlinePublishing {
  return { ...publishing, websiteState: 'LIVE', websitePublishedAt: at };
}
