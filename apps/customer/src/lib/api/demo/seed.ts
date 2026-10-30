// DEMO
import { NO_TAX, rupeesToPaisa, type ItemVariant, type MenuCategory, type MenuItem, type ModifierGroup } from '@restaurant-saas/shared';
import type { CustomerBrand, CustomerStore, SampleRider, StoreDeal } from '../client';

/**
 * DEMO restaurants of the Customer website. Several on purpose: they show that one codebase serves many restaurants,
 * each with its own brand and menu. Sample data only — never a real customer, price or address.
 * Phase 4 replaces this with the same menu that Restaurant OS manages.
 */
type Seed = Omit<CustomerStore, 'onlineOrdersEnabled' | 'isOpen' | 'branches'>;

let nextId = 1;
const id = () => `10000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;

function build(config: {
  restaurant: { name: string; slug: string };
  branch?: { name: string; slug: string };
  phone: string;
  address: string;
  openingHours: string;
  brand: CustomerBrand;
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
  /** Item names; a deal uses the item's own menu price */
  deals: { tag: string; item: string; emoji: string[] }[];
  popular: string[];
  bestsellers: string[];
  suggested: string[];
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
  const itemId = (name: string): string => {
    const item = items.find((i) => i.name === name);
    if (!item) throw new Error(`Demo data: no item called ${name}`);
    return item.id;
  };
  const deals: StoreDeal[] = config.deals.map((d) => ({ id: id(), tag: d.tag, itemId: itemId(d.item), emoji: d.emoji }));
  return {
    restaurant: { id: restaurantId, ...config.restaurant },
    branch: { id: branchId, name: config.branch?.name ?? 'Main Branch', slug: config.branch?.slug ?? 'main', phone: config.phone, address: config.address, openingHours: config.openingHours },
    brand: config.brand,
    deliveryFee: rupeesToPaisa(config.deliveryFee),
    minOrder: rupeesToPaisa(config.minOrder),
    defaultPrepMinutes: config.prepMinutes,
    pricing: { tax: NO_TAX, serviceChargeBps: 0, roundToRupee: true, deliveryFee: rupeesToPaisa(config.deliveryFee) },
    categories,
    items,
    addonGroups,
    deals,
    popularItemIds: config.popular.map(itemId),
    bestsellerItemIds: config.bestsellers.map(itemId),
    suggestedItemIds: config.suggested.map(itemId),
  };
}

/** Sizes and crust of the LALA sample pizzas: [small, medium, large] rupees. */
const pizzaSizes = (small: number, medium: number, large: number): [string, number][] => [
  ['Small 7"', small],
  ['Medium 10"', medium],
  ['Large 13"', large],
];
const PIZZA_CHOICES = ['Crust', 'Add extras'];

/** The owner's own brand as sample data only: the website's code knows nothing about LALA. */
const lalaMain = build({
  restaurant: { name: 'LALA Restaurant — DEMO', slug: 'lala-restaurant' },
  phone: '0300-2222222',
  address: 'Street 12, DHA, Lahore (DEMO address)',
  openingHours: 'Every day, 12:00 pm – 1:00 am',
  brand: {
    logoText: 'LA',
    primaryColor: '#e31e24',
    accentColor: '#ffc400',
    wordmark: 'LALA',
    headline: 'Good Food, Happier Days',
    tagline: 'Fresh meals, faster delivery, right to your doorstep.',
    heroEmoji: ['🍕', '🍔', '🍟', '🥤'],
  },
  deliveryFee: 150,
  minOrder: 500,
  prepMinutes: 30,
  addonGroups: [
    { name: 'Crust', min: 1, max: 1, addons: [['Pan', 0], ['Thin crust', 0], ['Stuffed', 200]] },
    { name: 'Add extras', min: 0, max: 4, addons: [['Extra cheese', 150], ['Jalapeños', 80], ['Mushrooms', 100], ['Onions', 60]] },
    { name: 'Burger extras', min: 0, max: 2, addons: [['Cheese slice', 50], ['Extra patty', 200]] },
  ],
  menu: [
    {
      category: 'Pizza',
      items: [
        { name: 'Chicken Tikka Pizza', description: 'Spicy tikka chunks, onion, green chilli and mozzarella on our hand-tossed base.', sizes: pizzaSizes(650, 1150, 1550), addons: PIZZA_CHOICES },
        { name: 'Fajita Pizza', description: 'Chicken, capsicum, onion', sizes: pizzaSizes(650, 1150, 1550), addons: PIZZA_CHOICES },
        { name: 'Malai Boti Pizza', description: 'Creamy chicken, herbs', sizes: pizzaSizes(700, 1200, 1600), addons: PIZZA_CHOICES },
        { name: 'Pepperoni Pizza', description: 'Beef pepperoni, cheese', sizes: pizzaSizes(750, 1250, 1650), addons: PIZZA_CHOICES },
        { name: 'Veggie Pizza', description: 'Capsicum, onion, mushroom', sizes: pizzaSizes(600, 1050, 1450), addons: PIZZA_CHOICES },
        { name: 'Cheese Lover Pizza', description: 'Extra cheese, oregano', sizes: pizzaSizes(700, 1150, 1550), addons: PIZZA_CHOICES },
      ],
    },
    {
      category: 'Burgers',
      items: [
        { name: 'Zinger Burger', description: 'Crispy fillet, mayo, lettuce', price: 650, addons: ['Burger extras'] },
        { name: 'Beef Burger', description: 'Beef patty, cheese', price: 700, addons: ['Burger extras'] },
        { name: 'Chicken Burger', description: 'Grilled chicken, slaw', price: 550, addons: ['Burger extras'] },
      ],
    },
    {
      category: 'Wings',
      items: [
        { name: 'Hot Wings', description: 'Six pieces, hot & crispy', price: 550 },
        { name: 'BBQ Wings', description: 'Six pieces, smoky sauce', price: 600, soldOut: true },
      ],
    },
    {
      category: 'Fries',
      items: [
        { name: 'Loaded Fries', description: 'Fries, cheese, sauce', price: 850 },
        { name: 'Regular Fries', description: 'Golden and salted', price: 300 },
        { name: 'Garlic Bread', description: 'Four slices, butter and herbs', price: 300 },
      ],
    },
    {
      category: 'Drinks',
      items: [
        { name: 'Cold Drink', description: 'Bottled, served chilled', price: 150 },
        { name: 'Mineral Water', description: '500 ml bottle', price: 80 },
      ],
    },
    { category: 'Desserts', items: [{ name: 'Choco Brownie', description: 'Warm, with chocolate sauce', price: 350 }] },
    {
      category: 'Deals',
      items: [
        { name: 'Family Feast', description: '1 Large Pizza + 4 Wings + 1.5L Drink', price: 2999 },
        { name: 'Pizza Party', description: '2 Medium Pizzas + 1.5L Drink', price: 2499 },
        { name: 'Student Deal', description: 'Zinger Burger + Fries + Drink', price: 899 },
      ],
    },
  ],
  deals: [
    { tag: 'Deal of the day', item: 'Family Feast', emoji: ['🍕', '🍗', '🥤'] },
    { tag: 'Weekend special', item: 'Pizza Party', emoji: ['🍕', '🍕', '🥤'] },
    { tag: 'Best value', item: 'Student Deal', emoji: ['🍔', '🍟', '🥤'] },
  ],
  popular: ['Chicken Tikka Pizza', 'Zinger Burger', 'Fajita Pizza', 'Loaded Fries'],
  bestsellers: ['Chicken Tikka Pizza'],
  suggested: ['Cold Drink', 'Choco Brownie', 'Garlic Bread', 'Regular Fries'],
});

/** The same menu at a second branch: its own address, phone and open / closed state. */
const lalaGulberg: Seed = {
  ...lalaMain,
  branch: { id: id(), name: 'Gulberg Branch', slug: 'gulberg', phone: '0300-3333333', address: 'Main Boulevard, Gulberg, Lahore (DEMO address)', openingHours: 'Every day, 4:00 pm – 12:00 am' },
};

/** The same sample menu as Restaurant OS (MASTER_PROMPT.md §12 test data). */
const azizPizza = build({
  restaurant: { name: 'Aziz Pizza — DEMO', slug: 'aziz-pizza' },
  phone: '0300-0000000',
  address: 'Main Market, Lahore (DEMO address)',
  openingHours: 'Every day, 12:00 pm – 2:00 am',
  brand: {
    logoText: 'AP',
    primaryColor: '#e31e24',
    accentColor: '#fbbf24',
    wordmark: null,
    headline: null,
    tagline: 'Hot pizza, crispy burgers, delivered to your door.',
    heroEmoji: ['🍕', '🍔', '🍟', '🥤'],
  },
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
  deals: [
    { tag: "Today's pick", item: 'Chicken Karahi', emoji: ['🍲', '🫓', '🥤'] },
    { tag: 'Customer favourite', item: 'Zinger Burger', emoji: ['🍔', '🍟', '🥤'] },
  ],
  popular: ['Classic Pizza', 'Zinger Burger', 'Chicken Tikka', 'Loaded Fries'],
  bestsellers: ['Classic Pizza'],
  suggested: ['Cold Drink', 'Mineral Water', 'Loaded Fries'],
});

/** A third made-up restaurant: another brand, another menu, the same code. */
const demoKarahi = build({
  restaurant: { name: 'Demo Karahi House', slug: 'demo-karahi' },
  phone: '0300-1111111',
  address: 'Food Street, Karachi (DEMO address)',
  openingHours: 'Every day, 1:00 pm – 1:00 am',
  brand: {
    logoText: 'KH',
    primaryColor: '#0f766e',
    accentColor: '#f59e0b',
    wordmark: null,
    headline: null,
    tagline: 'Slow-cooked karahi and fresh naan, the family way.',
    heroEmoji: ['🍲', '🫓', '🍢', '🥛'],
  },
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
  deals: [{ tag: 'House special', item: 'Mutton Karahi', emoji: ['🍲', '🫓', '🥛'] }],
  popular: ['Chicken Karahi', 'Seekh Kabab', 'Roghni Naan', 'Sweet Lassi'],
  bestsellers: ['Chicken Karahi'],
  suggested: ['Roghni Naan', 'Sweet Lassi'],
});

export const DEMO_STORES: readonly Seed[] = [lalaMain, lalaGulberg, azizPizza, demoKarahi];

/** "restaurant/branch" that starts closed, so the closed banner can be seen with one tap of the branch selector. */
export const DEMO_CLOSED_AT_START: readonly string[] = ['lala-restaurant/gulberg'];

export const DEMO_RIDER: SampleRider = { name: 'Faisal Riaz', plate: 'DEMO 123' };
