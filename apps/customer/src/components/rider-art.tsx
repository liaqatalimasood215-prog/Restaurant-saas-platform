/** Our own drawing of a delivery rider in the restaurant's colours, with its short name on the box. */
export function RiderArt({ label, className }: { label: string; className?: string }) {
  const primary = 'var(--store-primary)';
  const dark = 'color-mix(in srgb, var(--store-primary) 75%, black)';
  return (
    <svg viewBox="0 0 280 190" className={className} aria-hidden>
      <ellipse cx="140" cy="176" rx="118" ry="9" fill="#1c1917" opacity="0.1" />
      {/* Delivery box */}
      <rect x="22" y="66" width="80" height="62" rx="10" fill="var(--store-accent)" />
      <rect x="22" y="66" width="80" height="16" rx="8" fill="#1c1917" opacity="0.12" />
      <text x="62" y="112" textAnchor="middle" fontSize="19" fontWeight="900" fill="#1c1917">
        {label}
      </text>
      {/* Wheels */}
      <circle cx="72" cy="150" r="24" fill="#292524" />
      <circle cx="72" cy="150" r="10" fill="#d6d3d1" />
      <circle cx="218" cy="150" r="24" fill="#292524" />
      <circle cx="218" cy="150" r="10" fill="#d6d3d1" />
      {/* Scooter */}
      <path d="M38 134c0-9 7-14 16-14h76c6 0 10-3 12-8l18-46h20l24 66c-20-6-42 4-46 24H98c-2-14-14-22-28-22-12 0-24 0-32 0z" fill={primary} />
      <path d="M186 132c14-10 44-10 58 10-20-6-40-6-58-10z" fill={dark} />
      <path d="M170 66l18-16" stroke="#292524" strokeWidth="7" strokeLinecap="round" />
      <circle cx="193" cy="46" r="7" fill="#292524" />
      <rect x="62" y="112" width="70" height="12" rx="6" fill="#292524" />
      {/* Rider */}
      <path d="M108 114l8-44c2-12 12-18 24-16 12 2 18 12 16 24l-6 36z" fill={primary} />
      <path d="M126 112l40 2 8 28h-16l-6-16-34-2z" fill="#44403c" />
      <rect x="156" y="136" width="26" height="10" rx="5" fill="#292524" />
      {/* Arm on the handle, arm waving */}
      <path d="M146 72l34-12" stroke={primary} strokeWidth="12" strokeLinecap="round" />
      <circle cx="183" cy="58" r="7" fill="#f2b48c" />
      <path d="M122 72L92 44" stroke={primary} strokeWidth="11" strokeLinecap="round" />
      <circle cx="88" cy="38" r="8" fill="#f2b48c" />
      {/* Head and helmet */}
      <circle cx="138" cy="34" r="21" fill="#f2b48c" />
      <path d="M115 36c-3-20 10-33 25-33 16 0 26 12 24 28-14-8-32-8-49 5z" fill={primary} />
      <rect x="112" y="31" width="54" height="7" rx="3.5" fill={dark} />
      <circle cx="146" cy="42" r="2.4" fill="#292524" />
      <circle cx="133" cy="43" r="2.4" fill="#292524" />
      <path d="M133 49c4 4 10 4 14 0" fill="none" stroke="#292524" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
