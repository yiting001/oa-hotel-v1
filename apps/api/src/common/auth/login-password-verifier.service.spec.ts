import { hash } from 'argon2';
import { describe, expect, it } from 'vitest';
import { LoginPasswordVerifier } from './login-password-verifier.service';

describe('LoginPasswordVerifier', () => {
  it('accepts a matching stored hash and rejects a wrong password', async () => {
    const verifier = new LoginPasswordVerifier();
    await verifier.onApplicationBootstrap();
    const passwordHash = await hash('CorrectPassword1!');

    await expect(verifier.matches(passwordHash, 'CorrectPassword1!')).resolves.toBe(true);
    await expect(verifier.matches(passwordHash, 'wrong-password')).resolves.toBe(false);
  });

  it('performs the dummy verification path for an unknown username', async () => {
    const verifier = new LoginPasswordVerifier();
    await verifier.onApplicationBootstrap();

    await expect(verifier.matches(undefined, 'any-password')).resolves.toBe(false);
  });
});
