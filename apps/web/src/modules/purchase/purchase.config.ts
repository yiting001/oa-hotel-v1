export const PURCHASE_ROUTE_NAMES = {
  list: 'purchase-list',
  create: 'purchase-create',
  edit: 'purchase-edit',
} as const;

export const PURCHASE_API = {
  purchases: '/purchases',
  purchase: (id: string) => `/purchases/${id}`,
} as const;
