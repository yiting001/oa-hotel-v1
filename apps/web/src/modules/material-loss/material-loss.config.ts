export const MATERIAL_LOSS_ROUTE_NAMES = {
  list: 'material-loss-list',
  create: 'material-loss-create',
  edit: 'material-loss-edit',
} as const;

export const MATERIAL_LOSS_API = {
  losses: '/material-losses',
  loss: (id: string) => `/material-losses/${id}`,
} as const;
