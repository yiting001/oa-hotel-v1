export const ORDER_CIRCULATION_ROUTE_NAMES = {
  list: 'order-circulation-list',
  create: 'order-circulation-create',
  edit: 'order-circulation-edit',
} as const;

export const ORDER_CIRCULATION_API = {
  orders: '/order-circulations',
  order: (id: string) => `/order-circulations/${id}`,
  ccRecipients: '/order-circulations/cc-recipients',
} as const;
