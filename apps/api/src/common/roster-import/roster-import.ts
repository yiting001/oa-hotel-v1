import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../database/database-options';
import { RosterImportService } from './roster-import.service';
import { RosterImportConflictError } from './roster-import.types';

interface RosterCliOptions {
  inputPath: string;
  apply: boolean;
}

async function run(): Promise<void> {
  if (process.argv.slice(2).includes('--help')) {
    process.stdout.write(usage());
    return;
  }
  const options = parseOptions(process.argv.slice(2));
  const defaultPassword = options.apply ? process.env.OA_ROSTER_DEFAULT_PASSWORD : undefined;
  if (options.apply && !defaultPassword?.trim()) {
    throw new Error('--apply 必须设置 OA_ROSTER_DEFAULT_PASSWORD');
  }
  const input = await readJsonFile(options.inputPath);
  const dataSource = new DataSource(
    createDatabaseOptions({
      migrationsRun: options.apply,
      readonly: !options.apply,
    }),
  );
  await dataSource.initialize();
  try {
    if (!options.apply && (await hasPendingMigrations(dataSource))) {
      throw new Error('目标数据库存在待执行迁移；请先备份并运行 migration:run，再重新预检');
    }
    const service = new RosterImportService(dataSource);
    const report = options.apply
      ? await service.apply(input, defaultPassword ?? '')
      : await service.preview(input);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.conflicts.length > 0) process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

async function hasPendingMigrations(dataSource: DataSource): Promise<boolean> {
  try {
    return await dataSource.showMigrations();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法以只读方式检查目标数据库迁移状态：${message}`);
  }
}

export function parseOptions(argumentsList: string[]): RosterCliOptions {
  let inputPath: string | undefined;
  let apply = false;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--apply') {
      if (apply) throw new Error('--apply 不能重复');
      apply = true;
      continue;
    }
    if (argument === '--input') {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--input 缺少文件路径');
      if (inputPath) throw new Error('--input 不能重复');
      inputPath = value;
      index += 1;
      continue;
    }
    if (argument?.startsWith('--input=')) {
      if (inputPath) throw new Error('--input 不能重复');
      inputPath = argument.slice('--input='.length);
      if (!inputPath) throw new Error('--input 缺少文件路径');
      continue;
    }
    throw new Error(`不支持的参数：${argument ?? ''}`);
  }
  if (!inputPath) throw new Error(`缺少 --input\n${usage()}`);
  return { inputPath: resolve(process.cwd(), inputPath), apply };
}

async function readJsonFile(path: string): Promise<unknown> {
  const contents = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
  try {
    return JSON.parse(contents) as unknown;
  } catch {
    throw new Error(`花名册 JSON 无法解析：${path}`);
  }
}

function usage(): string {
  return [
    '用法：',
    '  npm run import:roster -w @oa/api -- --input /path/to/roster.json',
    '  OA_ROSTER_DEFAULT_PASSWORD=<密码> npm run import:roster -w @oa/api -- --input /path/to/roster.json --apply',
    '',
  ].join('\n');
}

void run().catch((error: unknown) => {
  if (error instanceof RosterImportConflictError) {
    process.stderr.write(`${JSON.stringify(error.report, null, 2)}\n`);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  }
  process.exitCode = 1;
});
