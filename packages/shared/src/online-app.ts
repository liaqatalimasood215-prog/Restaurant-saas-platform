/**
 * Online App / Website: publishing states of one restaurant (owner's brief, 2026-10-30).
 * Website and Android app are two separate publishing flows on one business system: publishing the website
 * never looks at, needs or changes anything of the Android app.
 * These are states only: nothing here deploys a website, builds an app or talks to Google Play.
 * Roman Urdu: Website aur Android app alag alag publish hote hain; website ko Android ki zaroorat nahi.
 */
import { normalizePhone } from './phone';
import { isValidEmail } from './staff';
import type { MenuCategory, MenuItem, ModifierGroup, OrderPricing, Paisa } from './types';

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

/** DEMO steps of connecting a domain: nothing here touches a real domain or its DNS. */
export type DomainState = 'NONE' | 'DNS_PENDING' | 'CONNECTED';

export interface OnlinePublishing {
  websiteState: WebsitePublishState;
  websitePublishedAt: string | null;
  /** The domain the restaurant bought and owns; null until it connects one */
  customDomain: string | null;
  domainState: DomainState;
  pwaState: PwaState;
  androidState: AndroidAppState;
  subscription: SubscriptionState;
}

export const NEW_ONLINE_PUBLISHING: OnlinePublishing = {
  websiteState: 'DRAFT',
  websitePublishedAt: null,
  customDomain: null,
  domainState: 'NONE',
  pwaState: 'PLANNED',
  androidState: 'NOT_CONFIGURED',
  subscription: 'ACTIVE',
};

/** How one restaurant's website looks and works. Products, prices and categories stay in the Menu; never copied here. */
export const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export interface DayHours {
  closed: boolean;
  /** "HH:MM"; a close before the open means after midnight */
  open: string;
  close: string;
}

export interface WebsiteConfig {
  brand: {
    /** Short text in the logo circle until a real logo (upload: Phase 7) */
    logoText: string;
    /** Optional short name shown instead of the logo letters and full name */
    wordmark: string;
    primaryColor: string;
    accentColor: string;
    tagline: string;
    description: string;
    /** Big line on the login screen */
    headline: string;
  };
  homepage: {
    showCategories: boolean;
    showDeals: boolean;
    showPopular: boolean;
    popularItemIds: string[];
    /** Each deal is a menu item, with its own menu price, and a short label */
    deals: { itemId: string; tag: string }[];
  };
  menu: { showDescriptions: boolean; showSoldOut: boolean };
  modes: { delivery: boolean; pickup: boolean; dineIn: boolean };
  hours: Record<WeekDay, DayHours>;
  contact: { whatsapp: string; email: string; facebook: string; instagram: string };
  seo: { title: string; description: string };
}

export const MAX_POPULAR_ITEMS = 4;
export const MAX_DEALS = 3;
export const MAX_SEO_TITLE = 60;
export const MAX_SEO_DESCRIPTION = 160;
const MAX_SHORT_TEXT = 60;
const MAX_LONG_TEXT = 300;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function luminance(hex: string): number {
  const channel = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** How well two colours read on each other: 1 (same) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

function isWebLink(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export type WebsiteProblem =
  | 'LOGO_REQUIRED'
  | 'TEXT_TOO_LONG'
  | 'COLOR_INVALID'
  | 'PRIMARY_TOO_LIGHT'
  | 'ACCENT_TOO_DARK'
  | 'TOO_MANY_POPULAR'
  | 'TOO_MANY_DEALS'
  | 'DEAL_TAG_REQUIRED'
  | 'MODES_REQUIRED'
  | 'HOURS_INVALID'
  | 'WHATSAPP_INVALID'
  | 'EMAIL_INVALID'
  | 'LINK_INVALID'
  | 'SEO_TOO_LONG';

/** The server checks the same when it saves. Colours must stay readable: white text on the main one, dark text on the second. */
export function checkWebsiteConfig(c: WebsiteConfig): WebsiteProblem | null {
  const { brand, homepage, modes, contact, seo } = c;
  if (!brand.logoText.trim()) return 'LOGO_REQUIRED';
  if (brand.logoText.trim().length > 4 || brand.wordmark.trim().length > 12) return 'TEXT_TOO_LONG';
  if ([brand.tagline, brand.headline].some((text) => text.trim().length > MAX_SHORT_TEXT) || brand.description.trim().length > MAX_LONG_TEXT) return 'TEXT_TOO_LONG';
  if (!HEX_COLOR.test(brand.primaryColor) || !HEX_COLOR.test(brand.accentColor)) return 'COLOR_INVALID';
  if (contrastRatio(brand.primaryColor, '#ffffff') < 3) return 'PRIMARY_TOO_LIGHT';
  if (contrastRatio(brand.accentColor, '#1c1917') < 4.5) return 'ACCENT_TOO_DARK';
  if (homepage.popularItemIds.length > MAX_POPULAR_ITEMS) return 'TOO_MANY_POPULAR';
  if (homepage.deals.length > MAX_DEALS) return 'TOO_MANY_DEALS';
  if (homepage.deals.some((d) => !d.tag.trim() || d.tag.trim().length > 24)) return 'DEAL_TAG_REQUIRED';
  if (!modes.delivery && !modes.pickup && !modes.dineIn) return 'MODES_REQUIRED';
  if (WEEK_DAYS.some((day) => !c.hours[day].closed && (!TIME.test(c.hours[day].open) || !TIME.test(c.hours[day].close) || c.hours[day].open === c.hours[day].close))) return 'HOURS_INVALID';
  if (contact.whatsapp.trim() && !normalizePhone(contact.whatsapp)) return 'WHATSAPP_INVALID';
  if (contact.email.trim() && !isValidEmail(contact.email)) return 'EMAIL_INVALID';
  if ([contact.facebook, contact.instagram].some((link) => link.trim() && !isWebLink(link.trim()))) return 'LINK_INVALID';
  if (seo.title.trim().length > MAX_SEO_TITLE || seo.description.trim().length > MAX_SEO_DESCRIPTION) return 'SEO_TOO_LONG';
  return null;
}

function clock(time: string): string {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

const DAY_NAMES: Record<WeekDay, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

/** "Every day, 12:00 pm – 2:00 am", or days that share their hours grouped: "Mon–Fri, 12:00 pm – 11:00 pm · Sat closed". */
export function formatOpeningHours(hours: Record<WeekDay, DayHours>): string {
  const text = (day: WeekDay) => (hours[day].closed ? 'closed' : `${clock(hours[day].open)} – ${clock(hours[day].close)}`);
  const groups: { first: WeekDay; last: WeekDay; text: string }[] = [];
  for (const day of WEEK_DAYS) {
    const group = groups[groups.length - 1];
    if (group?.text === text(day)) group.last = day;
    else groups.push({ first: day, last: day, text: text(day) });
  }
  const only = groups.length === 1 ? groups[0] : undefined;
  if (only) return only.text === 'closed' ? 'Closed' : `Every day, ${only.text}`;
  return groups.map((g) => `${DAY_NAMES[g.first]}${g.first === g.last ? '' : `–${DAY_NAMES[g.last]}`}${g.text === 'closed' ? ' closed' : `, ${g.text}`}`).join(' · ');
}

/** "https://www.Lala-Restaurant.com/" → "www.lala-restaurant.com"; null when it cannot be a domain. */
export function normalizeDomain(input: string): string | null {
  const domain = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return domain.length <= 253 && /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain) ? domain : null;
}

/** The planned free address before a restaurant connects its own domain. The platform's domain is an example until it is bought. */
export function platformSubdomain(restaurantSlug: string): string {
  return `${restaurantSlug.replace(/-/g, '')}.lalaorders.com`;
}

/** A saved look or text change waits for Publish Website; a draft stays a draft. */
export function withWebsiteChanges(publishing: OnlinePublishing): OnlinePublishing {
  return publishing.websiteState === 'LIVE' ? { ...publishing, websiteState: 'CHANGES_PENDING' } : publishing;
}

/**
 * DEMO link between Restaurant OS and the website's preview, until the backend joins them (Phase 4): the website says it
 * is ready, and Restaurant OS answers with its menu, prices and switches. Never staff, customers or orders.
 */
export const WEBSITE_PREVIEW_READY = 'lala-website-preview-ready';
export const WEBSITE_PREVIEW_DATA = 'lala-website-preview-data';

export interface WebsitePreviewData {
  restaurant: { name: string; slug: string };
  branch: { name: string; slug: string; phone: string; address: string };
  onlineOrdersEnabled: boolean;
  deliveryFee: Paisa;
  minOrder: Paisa;
  defaultPrepMinutes: number;
  pricing: OrderPricing;
  categories: MenuCategory[];
  items: MenuItem[];
  addonGroups: ModifierGroup[];
  website: WebsiteConfig;
}

/** The whole check of the settings, also on a broken message: their colours end up in the page's style. */
function websiteConfigIsSound(website: unknown): boolean {
  try {
    return checkWebsiteConfig(website as WebsiteConfig) === null;
  } catch {
    return false;
  }
}

/** A message from another window is not trusted: the website checks its shape before showing it. */
export function isWebsitePreviewData(value: unknown): value is WebsitePreviewData {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Partial<WebsitePreviewData>;
  const money = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
  return (
    typeof d.restaurant?.slug === 'string' &&
    typeof d.restaurant.name === 'string' &&
    typeof d.branch?.slug === 'string' &&
    typeof d.onlineOrdersEnabled === 'boolean' &&
    money(d.deliveryFee) &&
    money(d.minOrder) &&
    typeof d.pricing === 'object' &&
    d.pricing !== null &&
    Array.isArray(d.categories) &&
    Array.isArray(d.items) &&
    Array.isArray(d.addonGroups) &&
    websiteConfigIsSound(d.website) &&
    d.items.every((i) => typeof i?.id === 'string' && typeof i.name === 'string' && money(i.basePrice) && Array.isArray(i.variants))
  );
}

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
