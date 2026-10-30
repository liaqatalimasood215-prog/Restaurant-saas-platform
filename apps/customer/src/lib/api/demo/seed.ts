import { NO_TAX, rupeesToPaisa, type ItemVariant, type MenuCategory, type MenuItem, type ModifierGroup, type PublicStore, type StoreBrand } from '@restaurant-saas/shared';

/**
 * DEMO restaurants of the Customer website. Two on purpose: they show that one website serves many restaurants,
 * each with its own brand and menu. Sample data only — never a real restaurant, customer or price.
 * Phase 4 replaces this with the same menu that Restaurant OS manages.
 */
type Seed = Omit<PublicStore, 'onlineOrdersEnabled' | 'isOpen'>;

let nextId = 1;
const id = () => `10000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;

function build(config: {
  restaurant: { name: string; slug: string };
  phone: string;
  address: string;
  openingHours: string;
  brand: StoreBrand;
  deliveryFee: number;
  minOrder: number;
  prepMinutes: number;
  addonGroups: { name: string; min: number; max: number; addons: [string, number][] }[];
  menu: {
    category: string;
    items: {
      name: string;
      description: string;
      price?: number;
      sizes?: [string, number][];
      unit?: MenuItem['unit'];
      addons?: string[];
      soldOut?: boolean;
      /** Not on the website: the screens must never show it */
      hidden?: boolean;
    }[];
  }[];
}): Seed {
  const restaurantId = id();
  const branchId = id();
  const stationId = id();
  const addonGroups: ModifierGroup[] = config.addonGroups.map((g) => ({
    id: id(),
    restaurantId,
    name: g.name,
    minSelect: g.min,
    maxSelect: g.max,
    modifiers: g.addons.map(([name, rupees]) => ({ id: id(), name, price: rupeesToPaisa(rupees), isAvailable: true })),
  }));
  const categories: MenuCategory[] = [];
  const items: MenuItem[] = [];
  config.menu.forEach((section, c) => {
    const category: MenuCategory = { id: id(), restaurantId, branchId: null, name: section.category, sort: c + 1, isActive: true };
    categories.push(category);
    for (const item of section.items) {
      const variants: ItemVariant[] = (item.sizes ?? []).map(([name, rupees], s) => ({ id: id(), name, price: rupeesToPaisa(rupees), sort: s + 1 }));
      items.push({
        id: id(),
        restaurantId,
        branchId: null,
        categoryId: category.id,
        stationId,
        name: item.name,
        description: item.description,
        basePrice: variants[0]?.price ?? rupeesToPaisa(item.price ?? 0),
        unit: item.unit ?? 'piece',
        isAvailable: !item.soldOut,
        isOnline: !item.hidden,
        sort: items.length + 1,
        variants,
        modifierGroupIds: addonGroups.filter((g) => item.addons?.includes(g.name)).map((g) => g.id),
        archivedAt: null,
      });
    }
  });
  return {
    restaurant: { id: restaurantId, ...config.restaurant },
    branch: { id: branchId, name: 'Main Branch', slug: 'main', phone: config.phone, address: config.address, openingHours: config.openingHours },
    brand: config.brand,
    deliveryFee: rupeesToPaisa(config.deliveryFee),
    minOrder: rupeesToPaisa(config.minOrder),
    defaultPrepMinutes: config.prepMinutes,
    pricing: { tax: NO_TAX, serviceChargeBps: 0, roundToRupee: true, deliveryFee: rupeesToPaisa(config.deliveryFee) },
    categories,
    items,
    addonGroups,
  };
}

/** The same sample menu as Restaurant OS (MASTER_PROMPT.md §12 test data). */
const azizPizza = build({
  restaurant: { name: 'Aziz Pizza — DEMO', slug: 'aziz-pizza' },
  phone: '0300-0000000',
  address: 'Main Market, Lahore (DEMO address)',
  openingHours: 'Every day, 12:00 pm – 2:00 am',
  brand: { logoText: 'AP', primaryColor: '#e31e24', tagline: 'Hot pizza, crispy burgers, delivered to your door.', heroEmoji: ['🍕', '🍔', '🍟', '🥤'] },
  deliveryFee: 150,
  minOrder: 500,
  prepMinutes: 30,
  addonGroups: [
    { name: 'Pizza extras', min: 0, max: 3, addons: [['Extra cheese', 150], ['Jalapeños', 50], ['Olives', 50]] },
    { name: 'Burger extras', min: 0, max: 2, addons: [['Cheese slice', 50], ['Extra patty', 200]] },
  ],
  menu: [
    {
      category: 'Pizza',
      items: [
        { name: 'Classic Pizza', description: 'Cheese, tomato sauce', sizes: [['Small', 600], ['Medium', 850], ['Large', 1200]], addons: ['Pizza extras'] },
        { name: 'Fajita Pizza', description: 'Chicken, capsicum, onion', sizes: [['Small', 700], ['Medium', 950], ['Large', 1350]], addons: ['Pizza extras'] },
      ],
    },
    {
      category: 'Burgers',
      items: [
        { name: 'Zinger Burger', description: 'Crispy chicken, lettuce', price: 450, addons: ['Burger extras'] },
        { name: 'Beef Burger', description: 'Beef patty, cheese', price: 550, addons: ['Burger extras'] },
      ],
    },
    {
      category: 'Chicken',
      items: [
        { name: 'Chicken Karahi', description: 'Spicy & traditional, per kg', price: 2600, unit: 'kg' },
        { name: 'Chicken Tikka', description: 'Grilled chicken pieces', price: 450 },
      ],
    },
    {
      category: 'Fries & Sides',
      items: [
        { name: 'Loaded Fries', description: 'Fries, cheese, sauce', price: 350 },
        { name: 'Wings', description: 'Hot & crispy', price: 550, soldOut: true },
      ],
    },
    { category: 'Pasta', items: [{ name: 'Alfredo Pasta', description: 'Creamy white sauce', price: 600 }] },
    {
      category: 'Drinks',
      items: [
        { name: 'Cold Drink', description: 'Bottled, served chilled', price: 125 },
        { name: 'Mineral Water', description: '500 ml bottle', price: 80 },
        { name: 'Staff Meal', description: 'Not for customers', price: 100, hidden: true },
      ],
    },
  ],
});

/** A second made-up restaurant: another brand, another menu, the same website. */
const demoKarahi = build({
  restaurant: { name: 'Demo Karahi House', slug: 'demo-karahi' },
  phone: '0300-1111111',
  address: 'Food Street, Karachi (DEMO address)',
  openingHours: 'Every day, 1:00 pm – 1:00 am',
  brand: { logoText: 'KH', primaryColor: '#0f766e', tagline: 'Slow-cooked karahi and fresh naan, the family way.', heroEmoji: ['🍲', '🫓', '🍢', '🥛'] },
  deliveryFee: 100,
  minOrder: 800,
  prepMinutes: 40,
  addonGroups: [{ name: 'Sides', min: 0, max: 2, addons: [['Raita', 80], ['Salad', 60]] }],
  menu: [
    {
      category: 'Karahi',
      items: [
        { name: 'Chicken Karahi', description: 'Tomato, green chilli, ginger', sizes: [['Half kg', 1400], ['1 kg', 2600]], addons: ['Sides'] },
        { name: 'Mutton Karahi', description: 'Tender mutton, black pepper', sizes: [['Half kg', 2300], ['1 kg', 4400]], addons: ['Sides'] },
      ],
    },
    {
      category: 'BBQ',
      items: [
        { name: 'Chicken Tikka', description: 'Charcoal grilled leg piece', price: 420 },
        { name: 'Seekh Kabab', description: 'Four pieces, mint chutney', price: 520 },
      ],
    },
    {
      category: 'Naan & Drinks',
      items: [
        { name: 'Roghni Naan', description: 'Fresh from the tandoor', price: 60 },
        { name: 'Sweet Lassi', description: 'Chilled glass', price: 180 },
      ],
    },
  ],
});

export const DEMO_STORES: readonly Seed[] = [azizPizza, demoKarahi];
