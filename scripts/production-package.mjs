import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const apiReleaseDir = join(repoRoot, 'apps/api/release');
export const webDistDir = join(repoRoot, 'apps/web/dist');
export const defaultPackageDir = join(repoRoot, 'dist/oa-hotel-production');
export const manifestFileName = 'release-manifest.json';
export const nativeDependencyNames = Object.freeze(['argon2', 'better-sqlite3']);
const nativeDependencies = new Set(nativeDependencyNames);
const runtimeDependencyNames = Object.freeze(['argon2', 'better-sqlite3', 'swagger-ui-dist']);

export function resolvePackageDir(argument) {
  const output = resolve(repoRoot, argument ?? defaultPackageDir);
  const distRoot = join(repoRoot, 'dist');
  const relativePath = relative(distRoot, output);
  if (!relativePath || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error('Production package output must be a child of the repository dist directory.');
  }
  return output;
}

export async function assertApiRelease(directory = apiReleaseDir) {
  await assertFile(join(directory, 'server.js'), 'API release entrypoint');
  await assertFile(join(directory, 'roster-import.js'), 'Roster import entrypoint');
  await assertFile(join(directory, '.env.example'), 'API production environment example');
  return assertRuntimeMetadata(directory);
}

export async function assertWebDist(directory = webDistDir) {
  await assertFile(join(directory, 'index.html'), 'Web index');
  const files = await listFiles(directory);
  if (!files.some((file) => file.startsWith('assets/') && file.endsWith('.js'))) {
    throw new Error('Web dist does not contain a JavaScript asset.');
  }
  if (!files.some((file) => file.startsWith('assets/') && file.endsWith('.css'))) {
    throw new Error('Web dist does not contain a CSS asset.');
  }
}

export async function assertProductionPackage(directory) {
  await assertNoForbiddenArtifacts(directory);
  await Promise.all([
    assertFile(join(directory, 'config/ecosystem.config.cjs'), 'PM2 configuration'),
    assertFile(join(directory, 'config/nginx.conf.example'), 'Nginx configuration'),
    assertFile(join(directory, 'DEPLOYMENT.md'), 'Deployment guide'),
  ]);
  const dependencies = await assertApiRelease(join(directory, 'api'));
  await assertWebDist(join(directory, 'web'));
  await verifyManifest(directory, dependencies);
  return dependencies;
}

export async function assertRuntimeMetadata(directory) {
  const packageJsonPath = join(directory, 'package.json');
  const packageLockPath = join(directory, 'package-lock.json');
  const packageJson = await readJson(packageJsonPath, 'Runtime package metadata');
  const packageLock = await readJson(packageLockPath, 'Runtime dependency lock');

  if (
    packageJson.main !== 'server.js' ||
    packageJson.scripts?.start !== 'node server.js' ||
    packageJson.scripts?.['import:roster'] !== 'node roster-import.js'
  ) {
    throw new Error('Runtime package must expose server.js and roster-import.js entrypoints.');
  }
  if (typeof packageJson.engines?.node !== 'string') {
    throw new Error('Runtime package must declare its Node.js engine requirement.');
  }
  assertDependencyNames(packageJson.dependencies, 'Runtime package');
  if (Object.keys(packageJson.devDependencies ?? {}).length > 0) {
    throw new Error('Runtime package must not contain development dependencies.');
  }

  const lockedRoot = packageLock.packages?.[''];
  assertDependencyNames(lockedRoot?.dependencies, 'Runtime lock root');
  for (const [name, version] of Object.entries(packageJson.dependencies)) {
    if (lockedRoot.dependencies[name] !== version) {
      throw new Error(`Runtime lock root must pin ${name}@${version}.`);
    }
    const locked = packageLock.packages?.[`node_modules/${name}`]?.version;
    if (locked !== version) {
      throw new Error(`Runtime lock must pin ${name}@${version}; received ${String(locked)}.`);
    }
  }
  return packageJson.dependencies;
}

export async function assertNativeRuntime(nodeModulesDirectory, dependencies) {
  assertDependencyNames(dependencies, 'Native runtime expectation');
  for (const [name, version] of Object.entries(dependencies)) {
    const packageDirectory = join(nodeModulesDirectory, name);
    const packageJson = await readJson(join(packageDirectory, 'package.json'), `${name} metadata`);
    if (packageJson.version !== version) {
      throw new Error(
        `${name} runtime version must be ${version}; received ${packageJson.version}.`,
      );
    }
    if (nativeDependencies.has(name)) {
      const nativeFiles = (await listFiles(packageDirectory)).filter((file) =>
        file.endsWith('.node'),
      );
      if (nativeFiles.length === 0) {
        throw new Error(`${name} does not contain a native .node binary.`);
      }
    }
  }
}

export async function writeManifest(directory) {
  const packageJson = await readJson(
    join(directory, 'api/package.json'),
    'Runtime package metadata',
  );
  const files = await artifactFiles(directory);
  const entries = [];
  for (const file of files) {
    const buffer = await readFile(join(directory, file));
    entries.push({ file, bytes: buffer.byteLength, sha256: sha256(buffer) });
  }
  const manifest = {
    schemaVersion: 1,
    name: packageJson.name,
    version: packageJson.version,
    entrypoints: {
      api: 'api/server.js',
      rosterImport: 'api/roster-import.js',
      web: 'web/index.html',
      health: '/api/v1/health',
    },
    runtimeDependencies: packageJson.dependencies,
    source: readSourceMetadata(),
    builtAt: new Date().toISOString(),
    files: entries,
  };
  await writeFile(join(directory, manifestFileName), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function verifyManifest(directory, dependencies) {
  const manifest = await readJson(join(directory, manifestFileName), 'Release manifest');
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported release manifest schema.');
  assertDependencyNames(manifest.runtimeDependencies, 'Release manifest');
  if (JSON.stringify(manifest.runtimeDependencies) !== JSON.stringify(dependencies)) {
    throw new Error('Release manifest runtime dependencies do not match api/package.json.');
  }

  const actualFiles = await artifactFiles(directory);
  const expectedFiles = (manifest.files ?? []).map((entry) => entry.file);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error('Release manifest file list does not match the production package.');
  }
  for (const entry of manifest.files) {
    const buffer = await readFile(join(directory, entry.file));
    if (buffer.byteLength !== entry.bytes || sha256(buffer) !== entry.sha256) {
      throw new Error(`Release artifact checksum mismatch: ${entry.file}.`);
    }
  }
  return manifest;
}

export async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function artifactFiles(directory) {
  await assertNoForbiddenArtifacts(directory);
  return (await listFiles(directory)).filter(
    (file) => file !== manifestFileName && !file.startsWith('node_modules/'),
  );
}

async function assertNoForbiddenArtifacts(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const artifactPath = relative(root, absolutePath).split(sep).join('/');
    if (entry.name === '.DS_Store' || entry.name === 'node_modules') {
      throw new Error(`Forbidden production artifact: ${artifactPath}.`);
    }
    if (entry.isDirectory()) await assertNoForbiddenArtifacts(absolutePath, root);
  }
}

async function listFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === '.DS_Store' || entry.name === 'node_modules') continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolutePath, root)));
    else if (entry.isFile()) files.push(relative(root, absolutePath).split(sep).join('/'));
  }
  return files.sort();
}

async function assertFile(path, label) {
  let fileStat;
  try {
    fileStat = await stat(path);
  } catch {
    throw new Error(`${label} is missing: ${path}.`);
  }
  if (!fileStat.isFile() || fileStat.size === 0) throw new Error(`${label} is empty: ${path}.`);
}

async function readJson(path, label) {
  await assertFile(path, label);
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function assertDependencyNames(dependencies, label) {
  const actualNames = Object.keys(dependencies ?? {}).sort();
  const requiredNames = [...runtimeDependencyNames].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(requiredNames)) {
    throw new Error(`${label} must contain only ${requiredNames.join(', ')} runtime dependencies.`);
  }
}

function readSourceMetadata() {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return { commit, dirty: status.length > 0 };
  } catch {
    return { commit: null, dirty: null };
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
