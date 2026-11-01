// DEMO
import { rupeesToPaisa, type RiderAccount, type RiderDelivery } from '@restaurant-saas/shared';
import type { RiderBranch } from '../client';

/** Sample data only: never real customers, riders or prices. */
export interface DemoBranch {
  restaurantSlug: string;
  branchSlug: string;
  branch: RiderBranch;
  riders: RiderAccount[];
  /** The first sample order number; missing = 11 */
  firstNumber?: number;
  /** What each rider starts with; times are filled in when the sample starts */
  deliveries: SampleDelivery[];
}

export type SampleDelivery = Pick<RiderDelivery, 'riderId' | 'status' | 'customerName' | 'customerPhone' | 'customerAddress' | 'note' | 'items' | 'total' | 'amountToCollect' | 'cashCollected' | 'cashSettled' | 'area' | 'distanceKm' | 'etaMinutes'>;

/** No PIN is checked in the prototype; the DEMO account buttons fill in this one. */
export const DEMO_PIN = '482915';

const ACTIVATED = '2026-10-01T09:00:00.000Z';

const rider = (id: string, name: string, phone: string, over: Partial<RiderAccount> = {}): RiderAccount => ({
  id,
  name,
  phone,
  isActive: true,
  activatedAt: ACTIVATED,
  riderOnline: true,
  ...over,
});

/** [label, price in rupees] as saved on the sample order */
type SampleItem = [string, number];

const items = (list: SampleItem[]) => list.map(([label, rupees], i) => ({ id: `item-${i + 1}`, label, note: '', lineTotal: rupeesToPaisa(rupees) }));

const delivery = (riderId: string, status: SampleDelivery['status'], customerName: string, customerPhone: string, customerAddress: string, list: SampleItem[], rupees: number, over: Partial<SampleDelivery> = {}): SampleDelivery => {
  const total = rupeesToPaisa(rupees);
  const done = status === 'DELIVERED';
  return {
    riderId,
    status,
    customerName,
    customerPhone,
    customerAddress,
    note: '',
    items: items(list),
    total,
    amountToCollect: done ? 0 : total,
    cashCollected: done ? total : 0,
    cashSettled: false,
    ...over,
  };
};

const USMAN = 'sample-rider-usman';
const FAISAL = 'sample-rider-faisal';
const NAVEED = 'sample-rider-naveed';
const HAMID = 'sample-rider-hamid';

export const DEMO_BRANCHES: DemoBranch[] = [
  {
    restaurantSlug: 'lala-restaurant',
    branchSlug: 'main',
    branch: { restaurantName: 'LALA Restaurant — DEMO', branchName: 'Main Branch', logoText: 'LA', primaryColor: '#e31e24', phone: '0300-2222222', heroImage: '/brand/lala-rider-hero.webp' },
    riders: [rider(USMAN, 'Usman Ali', '0300-1234567'), rider('sample-rider-kamran', 'Kamran Shah', '0300-1234568')],
    firstNumber: 1058,
    deliveries: [
      delivery(USMAN, 'OUT_FOR_DELIVERY', 'Ali Khan (DEMO)', '0300-0000401', 'House 9, Block 3, Gulshan', [['1 × Zinger Burger', 450], ['1 × Cold Drink', 125]], 575, { area: 'Block 3, Gulshan', distanceKm: 2.1, etaMinutes: 8 }),
      delivery(USMAN, 'DELIVERED', 'Hina Tariq (DEMO)', '0300-0000402', '45-C, Model Town', [['1 × Classic Pizza (Large)', 1650]], 1650, { area: 'Model Town', cashSettled: true }),
      delivery(USMAN, 'DELIVERED', 'Bilal Raza (DEMO)', '0300-0000403', '7 Canal View', [['3 × Zinger Burger', 1350]], 1350, { area: 'Canal View' }),
      delivery(USMAN, 'RIDER_ASSIGNED', 'Sara Malik (DEMO)', '0300-0000404', 'Gulshan Block 7, House 24', [['2 × Chicken Burger', 1000], ['1 × Fries', 350]], 1350, { area: 'Gulshan Block 7', distanceKm: 3.4, etaMinutes: 12, note: 'Ring the bell twice' }),
      delivery(USMAN, 'RIDER_ASSIGNED', 'Hamza Saeed (DEMO)', '0300-0000405', 'Street 7, Model Town', [['1 × Classic Pizza (Medium)', 950]], 950, { area: 'Model Town', distanceKm: 4.8, etaMinutes: 16, amountToCollect: 0 }),
    ],
  },
  {
    restaurantSlug: 'aziz-pizza',
    branchSlug: 'main',
    branch: { restaurantName: 'Aziz Pizza — DEMO', branchName: 'Main Branch', logoText: 'AP', primaryColor: '#e31e24', phone: '0300-0000100' },
    riders: [
      rider(FAISAL, 'Faisal Riaz', '0300-0000107'),
      rider(NAVEED, 'Naveed Akhtar', '0300-0000108'),
      rider('sample-rider-zubair', 'Zubair Khan', '0300-0000113', { isActive: false }),
    ],
    deliveries: [
      delivery(FAISAL, 'RIDER_ASSIGNED', 'Sara Malik (DEMO)', '0300-0000201', 'House 12, Street 3, Gulberg III, Lahore', [['1 × Classic Pizza (Medium)', 1000], ['1 × Cold Drink', 125]], 1350, { note: 'Ring the bell twice' }),
      delivery(FAISAL, 'OUT_FOR_DELIVERY', 'Ahmed Raza (DEMO)', '0300-0000202', 'Flat 4B, Askari 11, Lahore', [['2 × Zinger Burger', 900], ['1 kg Chicken Karahi', 2200]], 3100),
      delivery(FAISAL, 'DELIVERED', 'Hina Tariq (DEMO)', '0300-0000203', '45-C, Model Town, Lahore', [['1 × Classic Pizza (Large)', 1650]], 1650, { cashSettled: true }),
      delivery(FAISAL, 'DELIVERED', 'Usman Ali (DEMO)', '0300-0000204', '7 Canal View, Lahore', [['3 × Zinger Burger', 1500]], 1500),
      delivery(NAVEED, 'RIDER_ASSIGNED', 'Maria Shah (DEMO)', '0300-0000205', '22 Johar Town, Lahore', [['1 × Classic Pizza (Small)', 900]], 900, { amountToCollect: 0, note: 'Paid by wallet transfer' }),
    ],
  },
  {
    restaurantSlug: 'demo-karahi',
    branchSlug: 'main',
    branch: { restaurantName: 'Demo Karahi House', branchName: 'Main Branch', logoText: 'DK', primaryColor: '#0f766e', phone: '0300-0000300' },
    riders: [rider(HAMID, 'Hamid Ali', '0300-0000301')],
    deliveries: [delivery(HAMID, 'RIDER_ASSIGNED', 'Bilal Ahmad (DEMO)', '0300-0000302', '9 Saddar Road, Karachi', [['1 kg Mutton Karahi', 3000], ['4 × Naan', 200]], 3200)],
  },
];

/** Sample older days for Delivery History; every sample rider sees them. COD cash of older days was handed over. */
export const DEMO_PAST_DELIVERIES: { daysAgo: number; number: number; area: string; rupees: number; cod: boolean }[] = [
  { daysAgo: 1, number: 1043, area: 'DHA Phase 5', rupees: 1800, cod: true },
  { daysAgo: 1, number: 1042, area: 'Block 3, Gulshan', rupees: 900, cod: false },
  { daysAgo: 1, number: 1041, area: 'Model Town', rupees: 1250, cod: true },
  { daysAgo: 2, number: 1028, area: 'Canal View', rupees: 2100, cod: true },
  { daysAgo: 2, number: 1027, area: 'Gulshan Block 7', rupees: 650, cod: false },
];

/** Sample rupees only: nothing here decides how a real rider is paid. Older days have none. */
export const DEMO_EARNINGS: { daysAgo: number; fees: number; tips: number; bonus: number }[] = [
  { daysAgo: 0, fees: 1000, tips: 200, bonus: 450 },
  { daysAgo: 1, fees: 800, tips: 150, bonus: 300 },
  { daysAgo: 2, fees: 900, tips: 0, bonus: 450 },
];

/** The DEMO "new order" button takes these in turn. */
export const DEMO_NEW_ORDERS: { customerName: string; customerPhone: string; customerAddress: string; items: SampleItem[]; rupees: number }[] = [
  { customerName: 'Ayesha Noor (DEMO)', customerPhone: '0300-0000211', customerAddress: '15 Garden Town, Lahore', items: [['1 × Classic Pizza (Medium)', 1200], ['2 × Cold Drink', 250]], rupees: 1450 },
  { customerName: 'Kamran Iqbal (DEMO)', customerPhone: '0300-0000212', customerAddress: '88 DHA Phase 5, Lahore', items: [['1 kg Chicken Karahi', 2600]], rupees: 2600 },
  { customerName: 'Nida Hassan (DEMO)', customerPhone: '0300-0000213', customerAddress: '3 Faisal Town, Lahore', items: [['2 × Zinger Burger', 1000]], rupees: 1000 },
];
