import { describe, expect, it } from 'vitest';
import {
  maximumPasswordLength,
  minimumPasswordLength,
  newPasswordError,
  passwordConfirmationError,
} from './password-change';

describe('password change validation', () => {
  it('keeps the new password policy separate from the login password', () => {
    expect(newPasswordError('000000', '1234567')).toBe(`新密码至少 ${minimumPasswordLength} 位`);
    expect(newPasswordError('000000', 'Hotel2026')).toBeNull();
  });

  it('rejects password reuse and mismatched confirmation', () => {
    expect(newPasswordError('Hotel2026', 'Hotel2026')).toBe('新密码不能与当前密码相同');
    expect(passwordConfirmationError('Hotel2026', 'Hotel2027')).toBe('两次输入的新密码不一致');
    expect(passwordConfirmationError('Hotel2026', 'Hotel2026')).toBeNull();
  });

  it('matches the server whitespace and maximum-length boundaries', () => {
    expect(newPasswordError('000000', '        ')).toBe('新密码不能全部为空格');
    expect(newPasswordError('000000', 'A'.repeat(maximumPasswordLength + 1))).toBe(
      `新密码不能超过 ${maximumPasswordLength} 位`,
    );
  });
});
