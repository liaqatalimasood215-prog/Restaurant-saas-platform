'use client';

import { createContext, useContext } from 'react';
import type { CustomerStore } from '@/lib/api';
import type { Cart } from '@/lib/cart';
import type { Favourites } from '@/lib/favourites';

export interface StoreContextValue {
  store: CustomerStore;
  /** "/restaurant/branch" */
  base: string;
  cart: Cart;
  /** Pieces in the cart, counting only what is still on the menu */
  cartCount: number;
  /** Open and taking online orders */
  canOrder: boolean;
  favourites: Favourites;
  /** A short message that goes away by itself */
  notify: (text: string) => void;
  /** Back to the page before this one, or to the fallback when this is the first page of the visit */
  goBack: (fallback: string) => void;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreShell>');
  return value;
}
