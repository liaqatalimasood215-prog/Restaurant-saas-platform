import { Bike, LocateFixed, MapPin } from 'lucide-react';
import { t } from '@/i18n';

const STREETS = ['M0 60H360', 'M0 150H360', 'M0 240H360', 'M0 330H360', 'M60 0V420', 'M150 0V420', 'M240 0V420', 'M320 0V420', 'M0 400L360 20'];

/**
 * DEMO MAP: a drawn picture that follows the owner's design, not a map service and not a location. No coordinates and no
 * paid maps. A real map replaces this drawing when GPS and a map service are approved (Phase 11).
 */
export function DemoMap({ onLocate }: { onLocate: () => void }) {
  return (
    <div className="relative h-[46dvh] min-h-64 overflow-hidden bg-map" data-demo-map>
      <svg viewBox="0 0 360 420" preserveAspectRatio="xMidYMid slice" role="img" aria-label={t('tracking.mapLabel')} className="size-full">
        <g className="fill-success-soft">
          <rect x="70" y="70" width="70" height="70" rx="6" />
          <rect x="250" y="250" width="60" height="70" rx="6" />
          <rect x="10" y="250" width="40" height="70" rx="6" />
        </g>
        <g fill="none" strokeWidth="7" className="stroke-card">
          {STREETS.map((d) => <path key={d} d={d} />)}
        </g>
        <path d="M60 345V330H150V240H240V110H285" fill="none" strokeWidth="6" strokeLinejoin="round" className="stroke-success" />
        <circle cx="60" cy="345" r="8" strokeWidth="3" className="fill-info stroke-card" />
        <circle cx="150" cy="240" r="34" fillOpacity="0.25" className="fill-success" />
        <circle cx="150" cy="240" r="19" className="fill-card" />
        <Bike x="137" y="227" width="26" height="26" className="text-brand" aria-hidden />
        <MapPin x="263" y="72" width="44" height="44" strokeWidth="1.5" className="fill-brand text-card" aria-hidden />
      </svg>
      <p className="absolute left-3 top-3 max-w-[58%] rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800" data-demo-map-label>
        {t('tracking.badge')}
        <span className="block font-semibold">{t('tracking.badgeNote')}</span>
      </p>
      <button type="button" onClick={onLocate} aria-label={t('tracking.locate')} className="absolute bottom-3 right-3 grid size-12 place-items-center rounded-full bg-card text-ink shadow-md">
        <LocateFixed className="size-6" aria-hidden />
      </button>
    </div>
  );
}
