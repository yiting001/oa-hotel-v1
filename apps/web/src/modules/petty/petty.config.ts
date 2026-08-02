export const PETTY_ROUTE_NAMES = {
  list: 'petty-list',
  create: 'petty-create',
  edit: 'petty-edit',
  materials: 'petty-materials',
} as const;

export const PETTY_API = {
  materials: '/petty/materials',
  material: (id: string) => `/petty/materials/${id}`,
  materialImport: '/petty/materials/import',
  procurements: '/petty/procurements',
  procurement: (id: string) => `/petty/procurements/${id}`,
  procurementItem: (id: string, itemId: string) => `/petty/procurements/${id}/items/${itemId}`,
} as const;
