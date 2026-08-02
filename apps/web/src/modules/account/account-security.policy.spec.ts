import { describe, expect, it } from 'vitest';
import {
  accountSecurityPath,
  accountSecurityRouteName,
  destinationAfterLogin,
  forcedPasswordChangeRedirect,
} from './account-security.policy';

describe('account security route policy', () => {
  it('sends a first-login user directly to password change', () => {
    expect(destinationAfterLogin(true, '/contract')).toBe(accountSecurityPath);
    expect(forcedPasswordChangeRedirect(true, 'contract-list')).toEqual({
      name: accountSecurityRouteName,
    });
  });

  it('allows the account security route while password change is required', () => {
    expect(forcedPasswordChangeRedirect(true, accountSecurityRouteName)).toBeNull();
  });

  it('keeps the requested route for a user with a current password', () => {
    expect(destinationAfterLogin(false, '/contract')).toBe('/contract');
    expect(destinationAfterLogin(false, undefined)).toBe('/workbench');
    expect(forcedPasswordChangeRedirect(false, 'contract-list')).toBeNull();
  });
});
