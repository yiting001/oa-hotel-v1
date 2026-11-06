import type { QueryRunner } from 'typeorm';
import { republishCatalogChains } from './hotel-approval-chain-2026';

type Dialect = 'sqlite' | 'postgres';

const PERMISSIONS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['permission-food-purchase-create', 'FOOD_PURCHASE_CREATE', '发起食材采购单', 'FOOD_PURCHASE'],
  ['permission-food-purchase-view', 'FOOD_PURCHASE_VIEW', '查看食材采购单', 'FOOD_PURCHASE'],
  ['permission-material-loss-create', 'MATERIAL_LOSS_CREATE', '发起物资报损单', 'MATERIAL_LOSS'],
  ['permission-material-loss-view', 'MATERIAL_LOSS_VIEW', '查看物资报损单', 'MATERIAL_LOSS'],
  [
    'permission-order-circulation-create',
    'ORDER_CIRCULATION_CREATE',
    '发起订单流转单',
    'ORDER_CIRCULATION',
  ],
  [
    'permission-order-circulation-view',
    'ORDER_CIRCULATION_VIEW',
    '查看订单流转单',
    'ORDER_CIRCULATION',
  ],
];

/** 新模块的查看权限下发给所有已有「查看单据」权限的角色，保证审批与抄送可达。 */
const VIEW_PERMISSION_IDS = [
  'permission-food-purchase-view',
  'permission-material-loss-view',
  'permission-order-circulation-view',
] as const;

const CREATE_PERMISSION_GRANTS: ReadonlyArray<readonly [string, string]> = [
  ['role-system-admin', 'permission-food-purchase-create'],
  ['role-system-admin', 'permission-material-loss-create'],
  ['role-system-admin', 'permission-order-circulation-create'],
  ['role-applicant', 'permission-food-purchase-create'],
  ['role-applicant', 'permission-material-loss-create'],
  ['role-applicant', 'permission-order-circulation-create'],
  ['role-initiator', 'permission-food-purchase-create'],
  ['role-initiator', 'permission-material-loss-create'],
  ['role-initiator', 'permission-order-circulation-create'],
  ['role-procurement', 'permission-food-purchase-create'],
  ['role-catering-approver', 'permission-food-purchase-create'],
];

const MENUS: ReadonlyArray<{
  id: string;
  name: string;
  path: string;
  permissionCode: string;
  icon: string;
  orderNum: number;
  permissionId: string;
}> = [
  {
    id: 'menu-food-purchase',
    name: '食材采购',
    path: '/food-purchase',
    permissionCode: 'DOCUMENT_VIEW,FOOD_PURCHASE_VIEW',
    icon: 'Food',
    orderNum: 6,
    permissionId: 'permission-food-purchase-view',
  },
  {
    id: 'menu-material-loss',
    name: '物资报损',
    path: '/material-loss',
    permissionCode: 'DOCUMENT_VIEW,MATERIAL_LOSS_VIEW',
    icon: 'Warning',
    orderNum: 7,
    permissionId: 'permission-material-loss-view',
  },
  {
    id: 'menu-order-circulation',
    name: '订单流转',
    path: '/order-circulation',
    permissionCode: 'DOCUMENT_VIEW,ORDER_CIRCULATION_VIEW',
    icon: 'Promotion',
    orderNum: 8,
    permissionId: 'permission-order-circulation-view',
  },
];

/**
 * 新增食材采购、物资报损、订单流转三个业务模块：
 * 建表、下发模块权限、补充业务中心菜单，并把请示批复改为
 * 部门负责人 → 办公室（勾选下一步部门）→ 主管领导。
 */
export async function applyBusinessExpansion(
  queryRunner: QueryRunner,
  dialect: Dialect,
): Promise<void> {
  const bool = dialect === 'postgres' ? 'true' : '1';
  const insertVerb = dialect === 'postgres' ? 'INSERT INTO' : 'INSERT OR IGNORE INTO';
  const conflictClause = dialect === 'postgres' ? 'ON CONFLICT DO NOTHING' : '';
  const createdAtDefault =
    dialect === 'postgres'
      ? 'TIMESTAMP NOT NULL DEFAULT now()'
      : "datetime NOT NULL DEFAULT (datetime('now'))";

  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS "food_purchases" (
      "id" text PRIMARY KEY,
      "number" text NOT NULL,
      "applicantId" text NOT NULL,
      "departmentId" text NOT NULL,
      "applicationDate" text NOT NULL,
      "teamName" text NOT NULL DEFAULT '',
      "totalAmountCents" integer NOT NULL DEFAULT 0,
      "attachments" text NOT NULL DEFAULT '[]'
    )`,
  );
  await queryRunner.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_food_purchases_number" ON "food_purchases" ("number")`,
  );
  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS "food_purchase_items" (
      "id" text PRIMARY KEY,
      "purchaseId" text NOT NULL,
      "sortOrder" integer NOT NULL DEFAULT 0,
      "category" text NOT NULL DEFAULT '',
      "name" text NOT NULL,
      "specification" text NOT NULL DEFAULT '',
      "unit" text NOT NULL DEFAULT '',
      "quantity" integer NOT NULL DEFAULT 1,
      "requirement" text NOT NULL DEFAULT '',
      "unitPriceCents" integer,
      "subtotalCents" integer NOT NULL DEFAULT 0,
      "remark" text NOT NULL DEFAULT ''
    )`,
  );
  await queryRunner.query(
    `CREATE INDEX IF NOT EXISTS "IDX_food_purchase_items_purchaseId" ON "food_purchase_items" ("purchaseId")`,
  );
  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS "food_purchase_change_logs" (
      "id" text PRIMARY KEY,
      "purchaseId" text NOT NULL,
      "actorId" text NOT NULL,
      "actorName" text NOT NULL,
      "action" text NOT NULL,
      "detail" text NOT NULL,
      "createdAt" ${createdAtDefault}
    )`,
  );
  await queryRunner.query(
    `CREATE INDEX IF NOT EXISTS "IDX_food_purchase_change_logs_purchaseId" ON "food_purchase_change_logs" ("purchaseId")`,
  );

  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS "material_losses" (
      "id" text PRIMARY KEY,
      "number" text NOT NULL,
      "applicantId" text NOT NULL,
      "departmentId" text NOT NULL,
      "applicationDate" text NOT NULL,
      "reason" text NOT NULL DEFAULT '',
      "totalAmountCents" integer NOT NULL DEFAULT 0,
      "attachments" text NOT NULL DEFAULT '[]'
    )`,
  );
  await queryRunner.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_material_losses_number" ON "material_losses" ("number")`,
  );
  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS "material_loss_items" (
      "id" text PRIMARY KEY,
      "lossId" text NOT NULL,
      "sortOrder" integer NOT NULL DEFAULT 0,
      "name" text NOT NULL,
      "specification" text NOT NULL DEFAULT '',
      "unit" text NOT NULL DEFAULT '',
      "quantity" integer NOT NULL DEFAULT 1,
      "unitPriceCents" integer,
      "subtotalCents" integer NOT NULL DEFAULT 0,
      "remark" text NOT NULL DEFAULT ''
    )`,
  );
  await queryRunner.query(
    `CREATE INDEX IF NOT EXISTS "IDX_material_loss_items_lossId" ON "material_loss_items" ("lossId")`,
  );

  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS "order_circulations" (
      "id" text PRIMARY KEY,
      "number" text NOT NULL,
      "applicantId" text NOT NULL,
      "departmentId" text NOT NULL,
      "applicationDate" text NOT NULL,
      "subject" text NOT NULL,
      "content" text NOT NULL DEFAULT '',
      "ccRecipients" text NOT NULL DEFAULT '[]',
      "attachments" text NOT NULL DEFAULT '[]'
    )`,
  );
  await queryRunner.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_order_circulations_number" ON "order_circulations" ("number")`,
  );

  for (const [id, code, name, module] of PERMISSIONS) {
    await queryRunner.query(
      `${insertVerb} "iam_permissions" ("id", "code", "name", "module", "description", "active")
        VALUES ('${id}', '${code}', '${name}', '${module}', NULL, ${bool}) ${conflictClause}`,
    );
  }

  for (const permissionId of VIEW_PERMISSION_IDS) {
    await queryRunner.query(
      `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
        SELECT "roleId", '${permissionId}' FROM "iam_role_permissions"
         WHERE "permissionId" = 'permission-document-view' ${conflictClause}`,
    );
  }

  for (const [roleId, permissionId] of CREATE_PERMISSION_GRANTS) {
    await queryRunner.query(
      `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
        SELECT '${roleId}', '${permissionId}'
         WHERE EXISTS (SELECT 1 FROM "iam_roles" WHERE "id" = '${roleId}')
           AND EXISTS (SELECT 1 FROM "iam_permissions" WHERE "id" = '${permissionId}')
        ${conflictClause}`,
    );
  }

  // 请示批复新增办公室审核节点：办公室角色必须能查看合同类单据
  await queryRunner.query(
    `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
      SELECT 'role-office-reviewer', 'permission-contract-view'
       WHERE EXISTS (SELECT 1 FROM "iam_roles" WHERE "id" = 'role-office-reviewer')
         AND EXISTS (SELECT 1 FROM "iam_permissions" WHERE "id" = 'permission-contract-view')
      ${conflictClause}`,
  );

  for (const menu of MENUS) {
    await queryRunner.query(
      `INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active")
        SELECT '${menu.id}', 'menu-business', '${menu.name}', 'MENU', '${menu.path}',
               '${menu.permissionCode}', '${menu.icon}', ${menu.orderNum}, ${bool}, ${bool}
        WHERE NOT EXISTS (SELECT 1 FROM "iam_menus" WHERE "id" = '${menu.id}')`,
    );
    await queryRunner.query(
      `INSERT INTO "iam_role_menus" ("roleId", "menuId")
        SELECT roles."roleId", '${menu.id}' FROM "iam_role_permissions" roles
         WHERE roles."permissionId" = '${menu.permissionId}'
           AND NOT EXISTS (
             SELECT 1 FROM "iam_role_menus" existing
             WHERE existing."roleId" = roles."roleId" AND existing."menuId" = '${menu.id}'
           )`,
    );
  }

  for (const [menuId, orderNum] of [
    ['menu-food-purchase', 6],
    ['menu-material-loss', 7],
    ['menu-order-circulation', 8],
    ['menu-supply', 9],
    ['menu-content', 10],
  ] as const) {
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = ${orderNum} WHERE "id" = '${menuId}'`,
    );
  }

  await republishCatalogChains(
    queryRunner,
    dialect,
    ['CONTRACT_REQUEST'],
    '请示批复改由办公室勾选下一步部门后报主管领导',
  );
}
