import { argon2id, hash } from 'argon2';
import type { DataSource } from 'typeorm';
import { credentialPolicy } from '../auth/credential-policy';
import { normalizeRosterInput } from './roster-input';
import { buildRosterImportPlan } from './roster-import.plan';
import { persistRosterImportPlan } from './roster-import.persistence';
import { RosterImportConflictError, type RosterImportReport } from './roster-import.types';

export class RosterImportService {
  constructor(private readonly dataSource: DataSource) {}

  async preview(input: unknown): Promise<RosterImportReport> {
    const normalized = normalizeRosterInput(input);
    const plan = await buildRosterImportPlan(this.dataSource.manager, normalized);
    return report('DRY_RUN', false, plan);
  }

  async apply(input: unknown, defaultPassword: string): Promise<RosterImportReport> {
    if (!defaultPassword.trim()) throw new Error('执行导入必须提供非空默认密码');
    if (defaultPassword.length > credentialPolicy.loginPasswordMaxLength) {
      throw new Error(`默认密码不能超过 ${credentialPolicy.loginPasswordMaxLength} 个字符`);
    }
    const normalized = normalizeRosterInput(input);
    const preview = await buildRosterImportPlan(this.dataSource.manager, normalized);
    if (preview.conflicts.length > 0) {
      throw new RosterImportConflictError(report('APPLY', false, preview));
    }

    const passwordHashes = await hashNewUserPasswords(preview, defaultPassword);
    return this.dataSource.transaction(async (manager) => {
      const transactionPlan = await buildRosterImportPlan(manager, normalized);
      const missingHashUser = transactionPlan.users.find(
        (user) => user.action === 'CREATE' && !passwordHashes.has(user.id),
      );
      if (missingHashUser) {
        transactionPlan.conflicts.push({
          code: 'CONCURRENT_CHANGE',
          message: '预检后用户数据发生变化，请重新执行导入',
          sources: [
            {
              sheet: missingHashUser.person.sourceSheet,
              sequence: missingHashUser.person.sourceSequence,
            },
          ],
        });
      }
      if (transactionPlan.conflicts.length > 0) {
        throw new RosterImportConflictError(report('APPLY', false, transactionPlan));
      }
      await persistRosterImportPlan(manager, transactionPlan, passwordHashes);
      return report('APPLY', true, transactionPlan);
    });
  }
}

async function hashNewUserPasswords(
  plan: Awaited<ReturnType<typeof buildRosterImportPlan>>,
  defaultPassword: string,
): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  for (const user of plan.users) {
    if (user.action !== 'CREATE') continue;
    hashes.set(user.id, await hash(defaultPassword, { type: argon2id }));
  }
  return hashes;
}

function report(
  mode: RosterImportReport['mode'],
  applied: boolean,
  plan: Awaited<ReturnType<typeof buildRosterImportPlan>>,
): RosterImportReport {
  return { mode, applied, summary: plan.summary, conflicts: plan.conflicts };
}
