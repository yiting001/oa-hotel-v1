import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import '../../../scripts/assert-node-version.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const apiDirectory = resolve(scriptDirectory, '..');
const releaseDirectory = join(apiDirectory, 'release');
const bundleEntries = [
  { entry: join(apiDirectory, 'dist', 'main.js'), output: join(releaseDirectory, 'server.js') },
  {
    entry: join(apiDirectory, 'dist', 'common', 'roster-import', 'roster-import.js'),
    output: join(releaseDirectory, 'roster-import.js'),
  },
];
const packageFile = join(apiDirectory, 'package.json');
const environmentExample = join(apiDirectory, '.env.production.example');
const npmRegistry = process.env.OA_NPM_REGISTRY?.trim() || 'https://registry.npmjs.org/';

const runtimeDependencyNames = ['argon2', 'better-sqlite3', 'swagger-ui-dist'];
const optionalNestPackages = [
  '@nestjs/microservices',
  '@nestjs/microservices/*',
  '@nestjs/websockets/*',
  'class-transformer/storage',
];

const apiPackage = JSON.parse(await readFile(packageFile, 'utf8'));
const runtimeDependencies = Object.fromEntries(
  runtimeDependencyNames.map((name) => {
    const version = apiPackage.dependencies?.[name];
    if (!version) {
      throw new Error(`API package.json is missing runtime dependency: ${name}`);
    }
    return [name, version];
  }),
);

await rm(releaseDirectory, { recursive: true, force: true });
await mkdir(releaseDirectory, { recursive: true });

for (const bundleEntry of bundleEntries) {
  await build({
    entryPoints: [bundleEntry.entry],
    outfile: bundleEntry.output,
    bundle: true,
    platform: 'node',
    target: ['node20'],
    format: 'cjs',
    keepNames: true,
    legalComments: 'none',
    external: [...runtimeDependencyNames, ...optionalNestPackages],
  });
}

const runtimePackage = {
  name: 'oa-hotel-api-runtime',
  version: apiPackage.version,
  private: true,
  type: 'commonjs',
  main: 'server.js',
  scripts: {
    start: 'node server.js',
    'import:roster': 'node roster-import.js',
  },
  engines: {
    node: '>=20.18',
  },
  dependencies: runtimeDependencies,
};

await writeFile(
  join(releaseDirectory, 'package.json'),
  `${JSON.stringify(runtimePackage, null, 2)}\n`,
);
await copyFile(environmentExample, join(releaseDirectory, '.env.example'));

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(
  npmCommand,
  ['install', '--package-lock-only', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund'],
  {
    cwd: releaseDirectory,
    env: {
      ...process.env,
      npm_config_registry: npmRegistry,
      npm_config_replace_registry_host: 'always',
    },
    stdio: 'inherit',
  },
);

process.stdout.write(`API release created at ${releaseDirectory}\n`);
