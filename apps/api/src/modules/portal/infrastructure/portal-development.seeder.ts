import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PORTAL_REPOSITORY, type PortalRepository } from '../domain/portal.repository';
import { createPortalDevelopmentSeed } from './portal-development.seed';

@Injectable()
export class PortalDevelopmentSeeder implements OnApplicationBootstrap {
  constructor(
    @Inject(PORTAL_REPOSITORY)
    private readonly repository: PortalRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (
      process.env.NODE_ENV?.trim().toLowerCase() === 'production' ||
      process.env.OA_DEMO_SEED?.trim().toLowerCase() !== 'true'
    ) {
      return;
    }
    await this.repository.seed(createPortalDevelopmentSeed());
  }
}
