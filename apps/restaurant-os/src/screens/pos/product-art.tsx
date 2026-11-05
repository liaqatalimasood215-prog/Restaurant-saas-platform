import { Coffee, CupSoda, Drumstick, Fish, Hamburger, Pizza, Popcorn, Salad, Soup, UtensilsCrossed, Wheat } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Picture area of a product, chosen from its name and then its category (Wings → chicken, even in
 * "Fries & Sides"): a large food emoji on a soft colour. Real menu photos come with photo upload
 * (MASTER_PROMPT.md §7, Phase 7). The line icon is used on the category tabs.
 */
const ART: { match: RegExp; icon: typeof Pizza; emoji: string; tone: string }[] = [
  { match: /pizza/i, icon: Pizza, emoji: '🍕', tone: 'from-orange-100 to-red-100' },
  { match: /burger/i, icon: Hamburger, emoji: '🍔', tone: 'from-amber-100 to-orange-100' },
  { match: /karahi|handi|salan/i, icon: Soup, emoji: '🍲', tone: 'from-orange-100 to-red-50' },
  { match: /tikka|kabab|kebab|boti|bbq|seekh/i, icon: Drumstick, emoji: '🍢', tone: 'from-orange-100 to-amber-50' },
  { match: /fish/i, icon: Fish, emoji: '🐟', tone: 'from-sky-100 to-orange-50' },
  { match: /daal|lentil/i, icon: Soup, emoji: '🍛', tone: 'from-amber-100 to-yellow-50' },
  { match: /mutton|muttan|gosht/i, icon: Soup, emoji: '🍖', tone: 'from-orange-100 to-red-50' },
  { match: /sabzi|vegetable|salad/i, icon: Salad, emoji: '🥗', tone: 'from-green-100 to-lime-50' },
  { match: /roti|naan|paratha|tandoor/i, icon: Wheat, emoji: '🫓', tone: 'from-amber-100 to-orange-50' },
  { match: /raita/i, icon: Soup, emoji: '🥣', tone: 'from-slate-100 to-sky-50' },
  { match: /chai|tea|coffee/i, icon: Coffee, emoji: '☕', tone: 'from-amber-100 to-stone-50' },
  { match: /chicken|wing/i, icon: Drumstick, emoji: '🍗', tone: 'from-orange-100 to-amber-50' },
  { match: /fries|side/i, icon: Popcorn, emoji: '🍟', tone: 'from-yellow-100 to-amber-50' },
  { match: /pasta/i, icon: Soup, emoji: '🍝', tone: 'from-rose-100 to-orange-50' },
  { match: /water/i, icon: CupSoda, emoji: '💧', tone: 'from-sky-100 to-cyan-50' },
  { match: /drink|juice/i, icon: CupSoda, emoji: '🥤', tone: 'from-sky-100 to-cyan-50' },
];
const FALLBACK = { icon: UtensilsCrossed, emoji: '🍽️', tone: 'from-slate-100 to-slate-50' };

export function artFor(name: string, categoryName = '') {
  return ART.find((a) => a.match.test(name)) ?? ART.find((a) => a.match.test(categoryName)) ?? FALLBACK;
}

export function ProductArt({
  name,
  categoryName,
  className,
  emojiClassName,
  soft = false,
}: {
  name: string;
  categoryName: string;
  className?: string;
  /** Font size of the emoji, e.g. text-5xl */
  emojiClassName?: string;
  /** The same soft red background for every product (POS cards, Red & White design) */
  soft?: boolean;
}) {
  const { emoji, tone } = artFor(name, categoryName);
  return (
    <span className={cn('flex items-center justify-center bg-linear-to-br', soft ? 'from-brand-soft via-rose-50 to-white' : tone, className)} aria-hidden>
      <span className={cn('leading-none drop-shadow-md', emojiClassName)}>{emoji}</span>
    </span>
  );
}
