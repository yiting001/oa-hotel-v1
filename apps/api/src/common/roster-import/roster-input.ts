import { createHash } from 'node:crypto';
import { credentialPolicy } from '../auth/credential-policy';
import type {
  NormalizedRosterPerson,
  RosterConflict,
  RosterInputPerson,
  RosterSourceReference,
} from './roster-import.types';

export interface NormalizedRosterInput {
  people: NormalizedRosterPerson[];
  conflicts: RosterConflict[];
}

export function normalizeRosterInput(value: unknown): NormalizedRosterInput {
  const rows = rosterRows(value);
  const people: NormalizedRosterPerson[] = [];
  const conflicts: RosterConflict[] = [];

  rows.forEach((row, index) => {
    const fallbackSource = { sheet: 'JSON', sequence: index + 1 };
    if (!isRecord(row)) {
      conflicts.push(inputConflict('记录必须是对象', fallbackSource));
      return;
    }

    const sourceSheet = normalizedRequiredString(row.sourceSheet);
    const department = normalizedRequiredString(row.department);
    const position = normalizedRequiredString(row.position);
    const name = normalizedRequiredString(row.name);
    const sourceSequence = positiveInteger(row.sourceSequence);
    const source = {
      sheet: sourceSheet ?? fallbackSource.sheet,
      sequence: sourceSequence ?? fallbackSource.sequence,
    };
    const missing = [
      !sourceSheet && 'sourceSheet',
      !sourceSequence && 'sourceSequence',
      !department && 'department',
      !position && 'position',
      !name && 'name',
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0) {
      conflicts.push(inputConflict(`字段无效或为空：${missing.join('、')}`, source));
      return;
    }
    if (!sourceSheet || !sourceSequence || !department || !position || !name) return;
    if (name.length > credentialPolicy.usernameMaxLength) {
      conflicts.push(
        inputConflict(`name 不能超过 ${credentialPolicy.usernameMaxLength} 个字符`, source),
      );
      return;
    }

    people.push({
      sourceSheet,
      sourceSequence,
      department,
      position,
      name,
      sourceKey: `${sourceSheet}\u0000${sourceSequence}`,
      isDepartmentManager: isManagerPosition(department, position),
    });
  });

  conflicts.push(...duplicateConflicts(people, (person) => person.sourceKey, 'SOURCE_DUPLICATE'));
  conflicts.push(...duplicateConflicts(people, (person) => person.name, 'USERNAME_DUPLICATE'));
  return { people, conflicts };
}

export function rosterUserId(name: string): string {
  return `roster-user-${stableDigest('user', name)}`;
}

export function rosterDepartmentId(name: string): string {
  return `roster-department-${stableDigest('department', name)}`;
}

export function rosterDepartmentCode(name: string): string {
  return `ROSTER_DEPT_${stableDigest('department-code', name).toUpperCase()}`;
}

export function rosterPositionId(departmentName: string, positionName: string): string {
  return `roster-position-${stableDigest('position', departmentName, positionName)}`;
}

export function rosterPositionCode(departmentName: string, positionName: string): string {
  return `ROSTER_POS_${stableDigest('position-code', departmentName, positionName).toUpperCase()}`;
}

export function rosterMembershipId(userId: string): string {
  return `roster-membership-${stableDigest('membership', userId)}`;
}

export function rosterRoleGrantId(userId: string, roleCode: string): string {
  return `roster-role-${stableDigest('role', userId, roleCode)}`;
}

export function normalizedText(value: string): string {
  return value.normalize('NFC').trim();
}

function rosterRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.people)) return value.people;
  throw new Error('花名册 JSON 必须是人员数组或包含 people 数组的对象');
}

function normalizedRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizedText(value);
  return normalized.length > 0 ? normalized : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isManagerPosition(department: string, position: string): boolean {
  return position === '总经理' || position === '经理' || position === `${department}经理`;
}

function duplicateConflicts(
  people: NormalizedRosterPerson[],
  keyOf: (person: NormalizedRosterPerson) => string,
  code: 'SOURCE_DUPLICATE' | 'USERNAME_DUPLICATE',
): RosterConflict[] {
  const groups = new Map<string, NormalizedRosterPerson[]>();
  for (const person of people) {
    groups.set(keyOf(person), [...(groups.get(keyOf(person)) ?? []), person]);
  }
  return [...groups.entries()].flatMap(([key, matches]) =>
    matches.length > 1
      ? [
          {
            code,
            message:
              code === 'SOURCE_DUPLICATE'
                ? `来源行重复：${matches[0]?.sourceSheet} 第 ${matches[0]?.sourceSequence} 行`
                : `姓名作为登录账号不唯一：${key}`,
            sources: matches.map(sourceReference),
          },
        ]
      : [],
  );
}

function stableDigest(namespace: string, ...values: string[]): string {
  const hash = createHash('sha256');
  hash.update(namespace);
  for (const value of values) {
    hash.update('\u0000');
    hash.update(normalizedText(value));
  }
  return hash.digest('hex').slice(0, 24);
}

function sourceReference(person: NormalizedRosterPerson): RosterSourceReference {
  return { sheet: person.sourceSheet, sequence: person.sourceSequence };
}

function inputConflict(message: string, source: RosterSourceReference): RosterConflict {
  return { code: 'INPUT_INVALID', message, sources: [source] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type { RosterInputPerson };
