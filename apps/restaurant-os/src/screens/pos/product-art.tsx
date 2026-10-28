import { CupSoda, Drumstick, Hamburger, Pizza, Popcorn, Soup, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Picture area of a product, chosen from its name and then its category (Wings → chicken, even in
 * "Fries & Sides"). Real menu photos come with photo upload (MASTER_PROMPT.md §7, Phase 7); until
 * then every product shows a food illustration.
 */
const ART: { match: RegExp; icon: typeof Pizza; tone: string }[] = [
  { match: /pizza/i, icon: Pizza, tone: 'from-orange-100 to-red-100 text-red-600' },
  { match: /burger/i, icon: Hamburger, tone: 'from-amber-100 to-orange-100 text-amber-700' },
  { match: /chicken|wing|karahi|tikka/i, icon: Drumstick, tone: 'from-orange-100 to-amber-50 text-orange-700' },
  { match: /fries|side/i, icon: Popcorn, tone: 'from-yellow-100 to-amber-50 text-yellow-700' },
  { match: /pasta/i, icon: Soup, tone: 'from-rose-100 to-orange-50 text-rose-600' },
  { match: /drink|water|juice/i, icon: CupSoda, tone: 'from-sky-100 to-cyan-50 text-sky-700' },
];
const FALLBACK = { icon: UtensilsCrossed, tone: 'from-slate-100 to-slate-50 text-slate-500' };

export function artFor(name: string, categoryName = '') {
  return ART.find((a) => a.match.test(name)) ?? ART.find((a) => a.match.test(categoryName)) ?? FALLBACK;
}

export function ProductArt({
  name,
  categoryName,
  className,
  iconClassName,
}: {
  name: string;
  categoryName: string;
  className?: string;
  iconClassName?: string;
}) {
  const { icon: Icon, tone } = artFor(name, categoryName);
  return (
    <span className={cn('flex items-center justify-center bg-linear-to-br', tone, className)} aria-hidden>
      <Icon className={cn('drop-shadow-sm', iconClassName)} strokeWidth={1.75} />
    </span>
  );
}
