// DEMO
import { rupeesToPaisa, type RiderAccount, type RiderDelivery } from '@restaurant-saas/shared';
import type { RiderBranch } from '../client';

/** Sample data only: never real customers, riders or prices. */
export interface DemoBranch {
  restaurantSlug: string;
  branchSlug: string;
  branch: RiderBranch;
  riders: RiderAccount[];
  /** What each rider starts with; times are filled in when the sample starts */
  deliveries: SampleDelivery[];
}

export type SampleDelivery = Pick<RiderDelivery, 'riderId' | 'status' | 'customerName' | 'customerPhone' | 'customerAddress' | 'note' | 'items' | 'total' | 'amountToCollect' | 'cashCollected' | 'cashSettled'>;

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

const items = (...labels: string[]) => labels.map((label, i) => ({ id: `item-${i + 1}`, label, note: '' }));

const delivery = (riderId: string, status: SampleDelivery['status'], customerName: string, customerPhone: string, customerAddress: string, list: string[], rupees: number, over: Partial<SampleDelivery> = {}): SampleDelivery => {
  const total = rupeesToPaisa(rupees);
  const done = status === 'DELIVERED';
  return {
    riderId,
    status,
    customerName,
    customerPhone,
    customerAddress,
    note: '',
    items: items(...list),
    total,
    amountToCollect: done ? 0 : total,
    cashCollected: done ? total : 0,
    cashSettled: false,
    ...over,
  };
};

const FAISAL = 'sample-rider-faisal';
const NAVEED = 'sample-rider-naveed';
const HAMID = 'sample-rider-hamid';

export const DEMO_BRANCHES: DemoBranch[] = [
  {
    restaurantSlug: 'aziz-pizza',
    branchSlug: 'main',
    branch: { restaurantName: 'Aziz Pizza — DEMO', branchName: 'Main Branch', logoText: 'AP', primaryColor: '#e31e24' },
    riders: [
      rider(FAISAL, 'Faisal Riaz', '0300-0000107'),
      rider(NAVEED, 'Naveed Akhtar', '0300-0000108'),
      rider('sample-rider-zubair', 'Zubair Khan', '0300-0000113', { isActive: false }),
    ],
    deliveries: [
      delivery(FAISAL, 'RIDER_ASSIGNED', 'Sara Malik (DEMO)', '0300-0000201', 'House 12, Street 3, Gulberg III, Lahore', ['1 × Classic Pizza (Medium)', '1 × Cold Drink'], 1350, { note: 'Ring the bell twice' }),
      delivery(FAISAL, 'OUT_FOR_DELIVERY', 'Ahmed Raza (DEMO)', '0300-0000202', 'Flat 4B, Askari 11, Lahore', ['2 × Zinger Burger', '1 kg Chicken Karahi'], 3100),
      delivery(FAISAL, 'DELIVERED', 'Hina Tariq (DEMO)', '0300-0000203', '45-C, Model Town, Lahore', ['1 × Classic Pizza (Large)'], 1650, { cashSettled: true }),
      delivery(FAISAL, 'DELIVERED', 'Usman Ali (DEMO)', '0300-0000204', '7 Canal View, Lahore', ['3 × Zinger Burger'], 1500),
      delivery(NAVEED, 'RIDER_ASSIGNED', 'Maria Shah (DEMO)', '0300-0000205', '22 Johar Town, Lahore', ['1 × Classic Pizza (Small)'], 900, { amountToCollect: 0, note: 'Paid by wallet transfer' }),
    ],
  },
  {
    restaurantSlug: 'demo-karahi',
    branchSlug: 'main',
    branch: { restaurantName: 'Demo Karahi House', branchName: 'Main Branch', logoText: 'DK', primaryColor: '#0f766e' },
    riders: [rider(HAMID, 'Hamid Ali', '0300-0000301')],
    deliveries: [delivery(HAMID, 'RIDER_ASSIGNED', 'Bilal Ahmad (DEMO)', '0300-0000302', '9 Saddar Road, Karachi', ['1 kg Mutton Karahi', '4 × Naan'], 3200)],
  },
];

/** The DEMO "new order" button takes these in turn. */
export const DEMO_NEW_ORDERS: { customerName: string; customerPhone: string; customerAddress: string; items: string[]; rupees: number }[] = [
  { customerName: 'Ayesha Noor (DEMO)', customerPhone: '0300-0000211', customerAddress: '15 Garden Town, Lahore', items: ['1 × Classic Pizza (Medium)', '2 × Cold Drink'], rupees: 1450 },
  { customerName: 'Kamran Iqbal (DEMO)', customerPhone: '0300-0000212', customerAddress: '88 DHA Phase 5, Lahore', items: ['1 kg Chicken Karahi'], rupees: 2600 },
  { customerName: 'Nida Hassan (DEMO)', customerPhone: '0300-0000213', customerAddress: '3 Faisal Town, Lahore', items: ['2 × Zinger Burger'], rupees: 1000 },
];
