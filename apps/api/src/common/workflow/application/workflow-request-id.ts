import { createHash } from 'node:crypto';

/** Produces a deterministic RFC 4122-shaped id for replayable internal commands. */
export function stableWorkflowRequestId(value: string): string {
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 32).split('');
  digest[12] = '4';
  digest[16] = ((Number.parseInt(digest[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  const text = digest.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}
