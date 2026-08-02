export const minimumPasswordLength = 8;
export const maximumPasswordLength = 128;

export function newPasswordError(currentPassword: string, newPassword: string): string | null {
  if (!newPassword) return '请输入新密码';
  if (!/\S/.test(newPassword)) return '新密码不能全部为空格';
  if (newPassword.length < minimumPasswordLength) {
    return `新密码至少 ${minimumPasswordLength} 位`;
  }
  if (newPassword.length > maximumPasswordLength) {
    return `新密码不能超过 ${maximumPasswordLength} 位`;
  }
  if (newPassword === currentPassword) return '新密码不能与当前密码相同';
  return null;
}

export function passwordConfirmationError(
  newPassword: string,
  confirmation: string,
): string | null {
  if (!confirmation) return '请再次输入新密码';
  return confirmation === newPassword ? null : '两次输入的新密码不一致';
}
