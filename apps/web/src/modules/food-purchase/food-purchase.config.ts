export const FOOD_PURCHASE_ROUTE_NAMES = {
  list: 'food-purchase-list',
  create: 'food-purchase-create',
  edit: 'food-purchase-edit',
} as const;

export const FOOD_PURCHASE_API = {
  purchases: '/food-purchases',
  purchase: (id: string) => `/food-purchases/${id}`,
  items: (id: string) => `/food-purchases/${id}/items`,
} as const;
