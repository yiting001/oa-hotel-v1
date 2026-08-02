import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';

/** Verifies every login through Argon2, including attempts for unknown usernames. */
@Injectable()
export class LoginPasswordVerifier implements OnApplicationBootstrap {
  private readonly dummyHash = hash(randomBytes(32).toString('base64url'));

  async onApplicationBootstrap(): Promise<void> {
    await this.dummyHash;
  }

  async matches(passwordHash: string | null | undefined, password: string): Promise<boolean> {
    const matches = await verify(passwordHash ?? (await this.dummyHash), password);
    return passwordHash != null && matches;
  }
}
