/**
 * Feature status labels shown to the owner (PROJECT_RULES.md §17).
 * Roman Urdu: Har feature pe saaf label — jo asli nahi, woh asli nahi kehlayega.
 */
export const FEATURE_STATUSES = ['REAL_VERIFIED', 'DEMO_PROTOTYPE', 'NOT_CONNECTED', 'PLACEHOLDER', 'BLOCKED'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  /** Works with the real backend and database and was tested */
  REAL_VERIFIED: 'REAL / VERIFIED',
  /** Visible and clickable with demo data; not connected to the backend */
  DEMO_PROTOTYPE: 'DEMO / PROTOTYPE',
  /** The screen or the backend part exists, but the two are not linked yet */
  NOT_CONNECTED: 'NOT CONNECTED',
  /** "Coming Soon" screen without function */
  PLACEHOLDER: 'PLACEHOLDER',
  /** Cannot continue; the report says why and what is needed */
  BLOCKED: 'BLOCKED',
};
