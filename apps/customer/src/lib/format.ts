import { formatPaisa } from '@restaurant-saas/shared';

/** Money on the website: "Rs 1,300". The amount always comes from the shared function; only the look differs. */
export const rs = (paisa: number): string => formatPaisa(paisa).replace('Rs. ', 'Rs ');
