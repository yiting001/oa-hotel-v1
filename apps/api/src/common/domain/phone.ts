/** 中国大陆手机号：11 位，1 开头，第二位 3-9。 */
export const PHONE_PATTERN = /^1[3-9]\d{9}$/;

/**
 * 归一化手机号：去掉空格与连字符；格式不合法时返回 null。
 * 用于登录标识识别和写入前的统一处理。
 */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[\s-]/g, '');
  return PHONE_PATTERN.test(digits) ? digits : null;
}
