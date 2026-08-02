import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PortalRepository, PortalSeedData } from '../domain/portal.repository';
import { PortalDevelopmentSeeder } from './portal-development.seeder';

describe('PortalDevelopmentSeeder', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoSeed = process.env.OA_DEMO_SEED;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalDemoSeed === undefined) {
      delete process.env.OA_DEMO_SEED;
    } else {
      process.env.OA_DEMO_SEED = originalDemoSeed;
    }
  });

  it('does not create demonstration content in production', async () => {
    process.env.NODE_ENV = 'production';
    const seed = vi.fn<(data: PortalSeedData) => Promise<void>>().mockResolvedValue(undefined);
    const seeder = new PortalDevelopmentSeeder({ seed } as unknown as PortalRepository);

    await seeder.onApplicationBootstrap();

    expect(seed).not.toHaveBeenCalled();
  });

  it('does not create demonstration content without the explicit seed switch', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.OA_DEMO_SEED;
    const seed = vi.fn<(data: PortalSeedData) => Promise<void>>().mockResolvedValue(undefined);
    const seeder = new PortalDevelopmentSeeder({ seed } as unknown as PortalRepository);

    await seeder.onApplicationBootstrap();

    expect(seed).not.toHaveBeenCalled();
  });

  it('provides every portal category, lifecycle state and supporting widget', async () => {
    process.env.NODE_ENV = 'development';
    process.env.OA_DEMO_SEED = 'true';
    const seed = vi.fn<(data: PortalSeedData) => Promise<void>>().mockResolvedValue(undefined);
    const seeder = new PortalDevelopmentSeeder({ seed } as unknown as PortalRepository);

    await seeder.onApplicationBootstrap();

    const data = seed.mock.calls[0]?.[0];
    expect(data).toBeDefined();
    expect(new Set(data?.contents.map((content) => content.category))).toEqual(
      new Set([
        'COMPANY_NEWS',
        'NOTICE',
        'MEETING_MINUTES',
        'MEMO',
        'POLICY',
        'PARTY_WORK',
        'EVENT',
      ]),
    );
    expect(new Set(data?.contents.map((content) => content.status))).toEqual(
      new Set(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'WITHDRAWN']),
    );
    expect(data?.events).toHaveLength(4);
    expect(data?.links).toHaveLength(6);
    expect(data?.widgets).toHaveLength(10);
  });
});
