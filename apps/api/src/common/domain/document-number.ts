import { businessDateKey } from '../time/business-date';

/**
 * 业务单据编号：类型前缀 + 发起日期(yyyyMMdd) + 单据 ID 前 8 位。
 *
 * 日期必须取**酒店业务日期**（`OA_TIME_ZONE`，默认 Asia/Shanghai）而不是 UTC 日期：
 * API 容器进程时区是 UTC，北京时间 0:00–8:00 发起的单据若用 UTC 日期会落到前一天。
 */
export function createDocumentNumber(documentType: string, id: string, now = new Date()): string {
  const date = businessDateKey(now);
  return `${documentType}-${date}-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
