export const accountSecurityRouteName = 'account-security';
export const accountSecurityPath = '/account/security';

export function forcedPasswordChangeRedirect(
  passwordChangeRequired: boolean,
  targetRouteName: unknown,
): { name: typeof accountSecurityRouteName } | null {
  return passwordChangeRequired && targetRouteName !== accountSecurityRouteName
    ? { name: accountSecurityRouteName }
    : null;
}

export function destinationAfterLogin(
  passwordChangeRequired: boolean,
  requestedRedirect: unknown,
): string {
  if (passwordChangeRequired) return accountSecurityPath;
  return typeof requestedRedirect === 'string' ? requestedRedirect : '/workbench';
}
