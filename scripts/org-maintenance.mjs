#!/usr/bin/env node
/**
 * 一次性组织维护脚本（在服务器上执行，直接改 PostgreSQL）。
 *
 * 做三件事：
 *   1. 餐饮部负责人改为「彭博」，并给彭博写入手机号 13810271599、补部门负责人角色；
 *   2. 「曹铮」的主任职改为「保卫部 / 保卫部副经理」；
 *   3. 诊断销售部所有销售经理为什么用不了系统，并在 --apply 时补齐缺失的申请人角色。
 *
 * 用法（在 API 容器里跑，容器内已有 pg 依赖和 OA_DATABASE_URL）：
 *   docker cp scripts/org-maintenance.mjs oa-hotel-api:/app/org-maintenance.mjs
 *   docker exec oa-hotel-api node /app/org-maintenance.mjs            # 只预检，不改数据
 *   docker exec oa-hotel-api node /app/org-maintenance.mjs --apply    # 真正执行
 *   docker exec oa-hotel-api node /app/org-maintenance.mjs --apply --grant-sales
 *        # 额外：给销售部里没有任何有效角色的人补「申请人」角色
 *
 * 说明：脚本只做最小改动，可重复执行；每次执行都会打印改动前后的对照。
 */

import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { Client } from 'pg';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const GRANT_SALES = args.has('--grant-sales');

const TARGET = {
  cateringDepartment: '餐饮部',
  cateringManager: '彭博',
  cateringManagerPhone: '13810271599',
  securityDepartment: '保卫部',
  securityPosition: '保卫部副经理',
  securityUser: '曹铮',
  salesDepartment: '销售部',
  applicantRoleCode: 'APPLICANT',
  managerRoleCode: 'DEPARTMENT_MANAGER',
};

const connectionString = process.env.OA_DATABASE_URL;
if (!connectionString) {
  fail('缺少环境变量 OA_DATABASE_URL（请在 API 容器内执行本脚本）。');
  process.exit(1);
}

const client = new Client({ connectionString });

function log(...values) {
  process.stdout.write(`${values.map(String).join(' ')}\n`);
}

function fail(...values) {
  process.stderr.write(`${values.map(String).join(' ')}\n`);
}

function section(title) {
  log(`\n=== ${title} ===`);
}

async function loadState() {
  const departments = await client.query(
    `SELECT id, name, "managerUserId" FROM departments ORDER BY name`,
  );
  const positions = await client.query(
    `SELECT id, code, name, "departmentId", active FROM iam_positions ORDER BY name`,
  );
  const users = await client.query(
    `SELECT id, username, "displayName", phone, "departmentId", active FROM users ORDER BY username`,
  );
  const memberships = await client.query(
    `SELECT id, "userId", "departmentId", "positionId", "isPrimary", "isDepartmentHead", active
       FROM iam_memberships`,
  );
  const roles = await client.query(`SELECT id, code, name, active FROM iam_roles ORDER BY code`);
  const userRoles = await client.query(
    `SELECT id, "userId", "roleId", "dataScope", "scopeDepartmentId" FROM iam_user_roles`,
  );
  const rolePermissionCounts = await client.query(
    `SELECT "roleId", count(*)::int AS total FROM iam_role_permissions GROUP BY "roleId"`,
  );
  const profiles = await client.query(`SELECT "departmentId", active FROM iam_department_profiles`);
  return {
    departments: departments.rows,
    positions: positions.rows,
    users: users.rows,
    memberships: memberships.rows,
    roles: roles.rows,
    userRoles: userRoles.rows,
    rolePermissionCounts: rolePermissionCounts.rows,
    profiles: profiles.rows,
  };
}

function findByName(rows, name, key = 'name') {
  return rows.filter((row) => (row[key] ?? '').trim() === name);
}

function activeRolesOf(state, userId) {
  const roleById = new Map(state.roles.map((role) => [role.id, role]));
  const permissionCount = new Map(
    state.rolePermissionCounts.map((row) => [row.roleId, Number(row.total)]),
  );
  return state.userRoles
    .filter((link) => link.userId === userId)
    .map((link) => {
      const role = roleById.get(link.roleId);
      return role
        ? {
            link,
            role,
            permissionCount: permissionCount.get(role.id) ?? 0,
          }
        : null;
    })
    .filter((item) => item !== null && item.role.active);
}

function describeUser(state, user) {
  const memberships = state.memberships.filter((item) => item.userId === user.id);
  const departmentName = (id) => state.departments.find((d) => d.id === id)?.name ?? id;
  const positionName = (id) =>
    id ? (state.positions.find((p) => p.id === id)?.name ?? id) : '无岗位';
  const roles = activeRolesOf(state, user.id);
  return {
    memberships: memberships.map((item) => ({
      department: departmentName(item.departmentId),
      position: positionName(item.positionId),
      isPrimary: item.isPrimary,
      isDepartmentHead: item.isDepartmentHead,
      active: item.active,
    })),
    roles: roles.map((item) => ({
      code: item.role.code,
      name: item.role.name,
      dataScope: item.link.dataScope,
      permissionCount: item.permissionCount,
    })),
  };
}

async function main() {
  await client.connect();
  log(APPLY ? '模式：执行（会写库）' : '模式：预检（只读，不改数据）');
  const state = await loadState();
  const actions = [];
  const warnings = [];

  // ---------- 1. 餐饮部负责人 ----------
  section('1. 餐饮部负责人 → 彭博');
  const cateringDepartments = findByName(state.departments, TARGET.cateringDepartment);
  const pengboUsers = state.users.filter(
    (user) => user.displayName.trim() === TARGET.cateringManager,
  );
  if (cateringDepartments.length !== 1) {
    warnings.push(`部门「${TARGET.cateringDepartment}」匹配到 ${cateringDepartments.length} 条`);
  }
  if (pengboUsers.length !== 1) {
    warnings.push(`用户「${TARGET.cateringManager}」匹配到 ${pengboUsers.length} 条`);
  }
  if (cateringDepartments.length === 1 && pengboUsers.length === 1) {
    const department = cateringDepartments[0];
    const pengbo = pengboUsers[0];
    const currentManager = state.users.find((user) => user.id === department.managerUserId);
    log(
      `当前负责人：${currentManager ? currentManager.displayName : (department.managerUserId ?? '未设置')}`,
    );
    log(`目标负责人：${pengbo.displayName}（${pengbo.username}）`);
    let membership = state.memberships.find(
      (item) => item.userId === pengbo.id && item.departmentId === department.id,
    );
    if (!membership) {
      warnings.push(
        `彭博在「${TARGET.cateringDepartment}」没有任职记录，脚本会补一条（主部门保持他原来的部门）`,
      );
      actions.push({
        kind: 'membership-insert',
        label: `为彭博补一条「${TARGET.cateringDepartment}」任职（部门负责人）`,
        run: async () => {
          await client.query(
            `INSERT INTO iam_memberships (id, "userId", "departmentId", "positionId", "isPrimary", "isDepartmentHead", active)
             VALUES ($1, $2, $3, NULL, false, true, true)`,
            [randomUUID(), pengbo.id, department.id],
          );
        },
      });
    } else {
      log(
        `任职现状：${describeUser(state, pengbo)
          .memberships.map(
            (m) =>
              `${m.department}/${m.position}${m.isPrimary ? '（主）' : ''}${m.isDepartmentHead ? '（负责人）' : ''}`,
          )
          .join('、')}`,
      );
      if (!membership.isDepartmentHead || !membership.active) {
        actions.push({
          kind: 'membership-update',
          label: '把彭博在餐饮部的任职标记为部门负责人并启用',
          run: async () => {
            await client.query(
              `UPDATE iam_memberships SET "isDepartmentHead" = true, active = true WHERE id = $1`,
              [membership.id],
            );
          },
        });
      }
    }
    if (department.managerUserId !== pengbo.id) {
      actions.push({
        kind: 'department-manager',
        label: `设置「${TARGET.cateringDepartment}」负责人为彭博`,
        run: async () => {
          await client.query(`UPDATE departments SET "managerUserId" = $1 WHERE id = $2`, [
            pengbo.id,
            department.id,
          ]);
        },
      });
    }
    // 部门负责人角色：工作流节点会按 WORKFLOW_APPROVE 过滤候选人，缺角色时审批会无人可办
    const managerRole = state.roles.find((role) => role.code === TARGET.managerRoleCode);
    if (managerRole) {
      const hasManagerRole = state.userRoles.some(
        (link) => link.userId === pengbo.id && link.roleId === managerRole.id,
      );
      if (!hasManagerRole) {
        actions.push({
          kind: 'role-grant',
          label: `给彭博授予「${managerRole.name}」角色（数据范围=餐饮部）`,
          run: async () => {
            await client.query(
              `INSERT INTO iam_user_roles (id, "userId", "roleId", "dataScope", "scopeDepartmentId")
               VALUES ($1, $2, $3, 'DEPARTMENT', $4)`,
              [randomUUID(), pengbo.id, managerRole.id, department.id],
            );
          },
        });
      }
    } else {
      warnings.push(`找不到角色 ${TARGET.managerRoleCode}`);
    }
    if (pengbo.phone !== TARGET.cateringManagerPhone && 'phone' in pengbo) {
      actions.push({
        kind: 'phone',
        label: `写入彭博手机号 ${TARGET.cateringManagerPhone}（可作为登录账号）`,
        run: async () => {
          await client.query(`UPDATE users SET phone = $1 WHERE id = $2`, [
            TARGET.cateringManagerPhone,
            pengbo.id,
          ]);
        },
      });
    }
  }

  // ---------- 2. 曹铮 → 保卫部副经理 ----------
  section('2. 曹铮 → 保卫部 / 保卫部副经理');
  const securityDepartments = findByName(state.departments, TARGET.securityDepartment);
  const caozhengUsers = state.users.filter(
    (user) => user.displayName.trim() === TARGET.securityUser,
  );
  if (securityDepartments.length !== 1) {
    warnings.push(`部门「${TARGET.securityDepartment}」匹配到 ${securityDepartments.length} 条`);
  }
  if (caozhengUsers.length !== 1) {
    warnings.push(`用户「${TARGET.securityUser}」匹配到 ${caozhengUsers.length} 条`);
  }
  if (securityDepartments.length === 1 && caozhengUsers.length === 1) {
    const department = securityDepartments[0];
    const target = caozhengUsers[0];
    log(
      `现状：${
        describeUser(state, target)
          .memberships.map((m) => `${m.department}/${m.position}${m.isPrimary ? '（主）' : ''}`)
          .join('、') || '无任职'
      }`,
    );
    let position = state.positions.find((item) => item.name.trim() === TARGET.securityPosition);
    if (!position) {
      warnings.push(`岗位「${TARGET.securityPosition}」不存在，脚本会新建`);
      actions.push({
        kind: 'position-insert',
        label: `新建岗位「${TARGET.securityPosition}」（归属保卫部）`,
        run: async () => {
          const id = randomUUID();
          await client.query(
            `INSERT INTO iam_positions (id, code, name, "departmentId", "sortOrder", active)
             VALUES ($1, $2, $3, $4, 0, true)`,
            [
              id,
              `ORG_${Date.now().toString(36).toUpperCase()}`,
              TARGET.securityPosition,
              department.id,
            ],
          );
          position = { id, name: TARGET.securityPosition, departmentId: department.id };
        },
      });
    }
    const membership = state.memberships.find(
      (item) => item.userId === target.id && item.departmentId === department.id,
    );
    const positionId = position?.id ?? null;
    if (membership) {
      if (membership.positionId === positionId && membership.isPrimary && membership.active) {
        log('保卫部任职已经是「保卫部副经理」且为主部门，无需改动。');
      } else {
        actions.push({
          kind: 'membership-update',
          label: `把曹铮在保卫部的任职岗位改为「${TARGET.securityPosition}」并设为主部门`,
          run: async () => {
            await client.query(
              `UPDATE iam_memberships SET "positionId" = $1, "isPrimary" = true, active = true WHERE id = $2`,
              [positionId, membership.id],
            );
            await client.query(
              `UPDATE iam_memberships SET "isPrimary" = false WHERE "userId" = $1 AND id <> $2`,
              [target.id, membership.id],
            );
          },
        });
      }
    } else {
      actions.push({
        kind: 'membership-insert',
        label: `为曹铮新增「保卫部 / ${TARGET.securityPosition}」任职并设为主部门（原主部门任职停用）`,
        run: async () => {
          // 原主部门任职停用，避免他同时挂在两个部门下造成归属歧义
          await client.query(
            `UPDATE iam_memberships SET active = false, "isPrimary" = false
              WHERE "userId" = $1 AND "isPrimary" = true AND "departmentId" <> $2`,
            [target.id, department.id],
          );
          await client.query(`UPDATE iam_memberships SET "isPrimary" = false WHERE "userId" = $1`, [
            target.id,
          ]);
          await client.query(
            `INSERT INTO iam_memberships (id, "userId", "departmentId", "positionId", "isPrimary", "isDepartmentHead", active)
             VALUES ($1, $2, $3, $4, true, false, true)`,
            [randomUUID(), target.id, department.id, position?.id ?? null],
          );
        },
      });
    }
    if (target.departmentId !== department.id) {
      actions.push({
        kind: 'user-department',
        label: '同步 users.departmentId 到保卫部',
        run: async () => {
          await client.query(`UPDATE users SET "departmentId" = $1 WHERE id = $2`, [
            department.id,
            target.id,
          ]);
        },
      });
    }
  }

  // ---------- 3. 销售部诊断 ----------
  section('3. 销售部账号诊断');
  const salesDepartments = findByName(state.departments, TARGET.salesDepartment);
  if (salesDepartments.length !== 1) {
    warnings.push(`部门「${TARGET.salesDepartment}」匹配到 ${salesDepartments.length} 条`);
  } else {
    const department = salesDepartments[0];
    const head = state.users.find((user) => user.id === department.managerUserId);
    log(`部门负责人：${head ? `${head.displayName}（${head.username}）` : '未设置'}`);
    const memberIds = new Set(
      state.memberships
        .filter((item) => item.departmentId === department.id && item.active)
        .map((item) => item.userId),
    );
    const salesUsers = state.users.filter(
      (user) => user.departmentId === department.id || memberIds.has(user.id),
    );
    const applicantRole = state.roles.find((role) => role.code === TARGET.applicantRoleCode);
    if (salesUsers.length === 0) {
      warnings.push('销售部下没有找到任何用户');
    }
    for (const user of salesUsers) {
      const detail = describeUser(state, user);
      const isHead = user.id === department.managerUserId;
      const roleText =
        detail.roles.length > 0
          ? detail.roles
              .map((role) => `${role.name}[${role.dataScope},${role.permissionCount}项权限]`)
              .join('、')
          : '无任何有效角色';
      const problems = [];
      if (!user.active) problems.push('账号已停用');
      if (detail.memberships.length === 0) problems.push('没有任何部门任职');
      if (!detail.memberships.some((item) => item.isPrimary && item.active)) {
        problems.push('没有生效的主部门任职');
      }
      if (detail.roles.length === 0) problems.push('没有角色（登录后菜单和接口都会是空的）');
      if (detail.roles.length > 0 && detail.roles.every((role) => role.permissionCount === 0)) {
        problems.push('角色没有任何权限');
      }
      log(
        `- ${user.displayName}（${user.username}）${isHead ? '【负责人】' : ''} ${problems.length === 0 ? '✅ 正常' : `❌ ${problems.join('；')}`}`,
      );
      log(
        `    任职：${detail.memberships.map((m) => `${m.department}/${m.position}${m.isPrimary ? '（主）' : ''}${m.active ? '' : '（停用）'}`).join('、') || '无'}`,
      );
      log(`    角色：${roleText}`);

      if (GRANT_SALES && user.active && detail.roles.length === 0 && applicantRole) {
        actions.push({
          kind: 'role-grant',
          label: `给销售部 ${user.displayName} 授予「${applicantRole.name}」（数据范围=仅本人）`,
          run: async () => {
            await client.query(
              `INSERT INTO iam_user_roles (id, "userId", "roleId", "dataScope", "scopeDepartmentId")
               VALUES ($1, $2, $3, 'SELF', NULL)`,
              [randomUUID(), user.id, applicantRole.id],
            );
          },
        });
      }
    }
    if (!GRANT_SALES) {
      log('提示：加 --grant-sales 可自动给「没有任何角色」的销售补申请人角色。');
    }
  }

  // ---------- 汇总 ----------
  section('计划改动');
  if (actions.length === 0) log('无需改动。');
  for (const action of actions) log(`- ${action.label}`);
  if (warnings.length > 0) {
    section('⚠ 需要人工确认');
    for (const warning of warnings) log(`- ${warning}`);
  }

  if (!APPLY) {
    section('预检结束');
    log('确认无误后重新执行并加 --apply 才会写库。');
    return;
  }
  if (actions.length === 0) return;

  section('执行');
  await client.query('BEGIN');
  try {
    for (const action of actions) {
      await action.run();
      log(`✔ ${action.label}`);
    }
    await client.query('COMMIT');
    log('全部改动已提交。');
  } catch (error) {
    await client.query('ROLLBACK');
    fail('执行失败，已回滚：', error);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    fail(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
