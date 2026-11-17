#!/usr/bin/env node
/**
 * 批量新增员工账号（一次性工具，在服务器上执行）。
 *
 * 用法（在 API 容器里跑，容器内已有 pg / argon2 依赖和 OA_DATABASE_URL）：
 *   docker cp scripts/add-staff.mjs oa-hotel-api:/app/add-staff.mjs
 *   docker exec oa-hotel-api node /app/add-staff.mjs \
 *     --department 销售部 --position 销售经理 \
 *     --staff '[{"name":"徐婷","username":"xuting","phone":"15901201223"}]'
 *   # 确认预检结果后加 --apply 真正写库
 *   docker exec oa-hotel-api node /app/add-staff.mjs ... --apply
 *
 * 每个账号会：
 *   1. 在指定部门建立主任职，岗位为 --position（不存在会自动创建）；
 *   2. 授予「申请人」角色（数据范围=仅本人），保证登录后能用系统；
 *   3. 统一初始密码（默认 Dongfang2026），首次登录强制改密。
 *
 * 默认只预检不写库；同名账号或手机号已存在时会跳过并提示。
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { hash } from 'argon2';
import { Client } from 'pg';

const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.@-]+$/;
const DEFAULT_PASSWORD = 'Dongfang2026';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = { apply: false, department: '', position: '', staff: [], password: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      result.apply = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail(`参数 ${token} 缺少取值`);
    if (token === '--department') result.department = value;
    else if (token === '--position') result.position = value;
    else if (token === '--password') result.password = value;
    else if (token === '--staff') result.staff = JSON.parse(value);
    else if (token === '--staff-file') result.staff = JSON.parse(readFileSync(value, 'utf8'));
    else fail(`不支持的参数：${token}`);
    index += 1;
  }
  if (!result.department) fail('缺少 --department');
  if (!result.position) fail('缺少 --position');
  if (!Array.isArray(result.staff) || result.staff.length === 0)
    fail('缺少 --staff 或 --staff-file');
  return result;
}

const options = parseArgs(process.argv.slice(2));
const password = options.password || process.env.ORG_NEW_PASSWORD || DEFAULT_PASSWORD;

const client = new Client({ connectionString: process.env.OA_DATABASE_URL });
await client.connect();

process.stdout.write(options.apply ? '模式：执行（会写库）\n' : '模式：预检（只读，不改数据）\n');

const departments = (
  await client.query(`select id, name from departments where name = $1`, [options.department])
).rows;
if (departments.length !== 1) fail(`部门「${options.department}」匹配到 ${departments.length} 条`);
const department = departments[0];

const applicantRole = (
  await client.query(
    `select id, code, name from iam_roles where code = 'APPLICANT' and active = true`,
  )
).rows[0];
if (!applicantRole) fail('找不到启用状态的 APPLICANT（申请人）角色');

const positions = (
  await client.query(`select id, name from iam_positions where name = $1`, [options.position])
).rows;
let position = positions[0] ?? null;
process.stdout.write(`部门：${department.name}（${department.id}）\n`);
process.stdout.write(
  position
    ? `岗位：${position.name}（已存在，直接复用）\n`
    : `岗位：${options.position}（不存在，将新建并归属 ${department.name}）\n`,
);

const existingUsers = (await client.query(`select id, username, "displayName", phone from users`))
  .rows;
const usernames = new Set(existingUsers.map((user) => user.username));
const phones = new Map(
  existingUsers.filter((user) => user.phone).map((user) => [user.phone, user]),
);
const displayNames = new Map(existingUsers.map((user) => [user.displayName, user]));

const createUserActions = [];
const skipped = [];
for (const person of options.staff) {
  const name = String(person.name ?? '').trim();
  const username = String(person.username ?? '').trim();
  const rawPhone = String(person.phone ?? '').trim();
  if (!name || !username) {
    skipped.push(`${name || username || '(空)'}：缺少姓名或账号`);
    continue;
  }
  if (!USERNAME_PATTERN.test(username)) {
    skipped.push(`${name}：账号 ${username} 只能包含字母、数字和 _ . @ -`);
    continue;
  }
  if (usernames.has(username)) {
    skipped.push(`${name}：账号 ${username} 已存在`);
    continue;
  }
  if (displayNames.has(name)) {
    skipped.push(`${name}：系统里已有同姓名的账号（${displayNames.get(name).username}）`);
    continue;
  }
  let phone = rawPhone || null;
  if (phone && !PHONE_PATTERN.test(phone)) {
    process.stdout.write(
      `⚠ ${name}：手机号「${phone}」不是 11 位手机号，先不写入，账号仍会创建\n`,
    );
    phone = null;
  }
  if (phone && phones.has(phone)) {
    process.stdout.write(
      `⚠ ${name}：手机号 ${phone} 已被 ${phones.get(phone).displayName} 使用，跳过该手机号\n`,
    );
    phone = null;
  }
  createUserActions.push({ name, username, phone });
}

process.stdout.write(`\n待创建账号（${createUserActions.length} 个）：\n`);
for (const item of createUserActions) {
  process.stdout.write(
    `- ${item.name} | 账号 ${item.username} | 手机号 ${item.phone ?? '（未填写）'} | 初始密码 ${password}\n`,
  );
}
if (skipped.length > 0) {
  process.stdout.write('\n跳过：\n');
  for (const line of skipped) process.stdout.write(`- ${line}\n`);
}

if (!options.apply) {
  process.stdout.write('\n预检结束，确认无误后加 --apply 执行。\n');
  await client.end();
  process.exit(0);
}
if (createUserActions.length === 0) {
  process.stdout.write('\n没有需要创建的账号。\n');
  await client.end();
  process.exit(0);
}

await client.query('BEGIN');
try {
  const passwordHash = await hash(password);
  if (!position) {
    position = { id: randomUUID(), name: options.position };
    await client.query(
      `INSERT INTO iam_positions (id, code, name, "departmentId", "sortOrder", active)
       VALUES ($1, $2, $3, $4, 0, true)`,
      [
        position.id,
        `ORG_${Date.now().toString(36).toUpperCase()}`,
        options.position,
        department.id,
      ],
    );
    process.stdout.write(`✔ 新建岗位「${options.position}」\n`);
  }
  for (const item of createUserActions) {
    const userId = randomUUID();
    await client.query(
      `INSERT INTO users (id, username, "displayName", phone, "passwordHash", "departmentId", "roleCodes", active, "passwordChangeRequired", "passwordChangedAt", "credentialVersion")
       VALUES ($1, $2, $3, $4, $5, $6, '[]', true, true, NULL, 0)`,
      [userId, item.username, item.name, item.phone, passwordHash, department.id],
    );
    await client.query(
      `INSERT INTO iam_memberships (id, "userId", "departmentId", "positionId", "isPrimary", "isDepartmentHead", active)
       VALUES ($1, $2, $3, $4, true, false, true)`,
      [randomUUID(), userId, department.id, position.id],
    );
    await client.query(
      `INSERT INTO iam_user_roles (id, "userId", "roleId", "dataScope", "scopeDepartmentId")
       VALUES ($1, $2, $3, 'SELF', NULL)`,
      [randomUUID(), userId, applicantRole.id],
    );
    process.stdout.write(`✔ ${item.name}（${item.username}）已创建\n`);
  }
  await client.query('COMMIT');
  process.stdout.write('全部账号已创建。\n');
} catch (error) {
  await client.query('ROLLBACK');
  process.stderr.write(
    `执行失败，已回滚：${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
