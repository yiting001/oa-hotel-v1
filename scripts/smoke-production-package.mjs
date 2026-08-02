import { execFile, spawn } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import {
  assertNativeRuntime,
  assertProductionPackage,
  nativeDependencyNames,
  pathExists,
  repoRoot,
  resolvePackageDir,
} from './production-package.mjs';
import './assert-node-version.mjs';

const execFileAsync = promisify(execFile);

const { packageArgument, reuseNative } = parseArguments(process.argv.slice(2));
const packageDirectory = resolvePackageDir(packageArgument);
const runtimeDependencies = await assertProductionPackage(packageDirectory);

const temporaryRoot = await mkdtemp(join(tmpdir(), 'oa-hotel-production-smoke-'));
const runtimeDirectory = join(temporaryRoot, 'package');
let child;
let stdout = '';
let stderr = '';

try {
  await cp(packageDirectory, runtimeDirectory, {
    recursive: true,
    filter: (source) => !relative(packageDirectory, source).split(sep).includes('node_modules'),
  });
  const runtimeApiDirectory = join(runtimeDirectory, 'api');
  await installRuntime(runtimeApiDirectory, reuseNative);
  const runtimeNodeModules = join(runtimeApiDirectory, 'node_modules');
  if (reuseNative) await copyRepositoryNativeBinaries(runtimeNodeModules);
  await assertNativeRuntime(runtimeNodeModules, runtimeDependencies);
  await execFileAsync(process.execPath, ['roster-import.js', '--help'], {
    cwd: runtimeApiDirectory,
    env: process.env,
  });

  const port = await availablePort();
  const databasePath = join(temporaryRoot, 'data', 'smoke.sqlite');
  child = spawn(process.execPath, ['server.js'], {
    cwd: runtimeApiDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      JWT_SECRET: 'production-package-smoke-secret-production-package-smoke-secret',
      OA_DATABASE_PATH: databasePath,
      OA_DEMO_SEED: 'false',
      OA_DEMO_PASSWORD: '',
      OA_BOOTSTRAP_ADMIN_USERNAME: '',
      OA_TIME_ZONE: 'Asia/Shanghai',
      OA_SWAGGER_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    stdout = appendOutput(stdout, chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr = appendOutput(stderr, chunk);
  });

  const healthUrl = `http://127.0.0.1:${port}/api/v1/health`;
  const health = await waitForHealth(child, healthUrl, 30_000);
  if (health.status !== 'ok' || typeof health.timestamp !== 'string') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(health)}.`);
  }
  if (!(await pathExists(databasePath))) throw new Error('Smoke database was not created.');
  process.stdout.write(`Production package smoke passed: ${healthUrl}\n`);
} catch (error) {
  const details = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  throw new Error(
    `${error instanceof Error ? error.message : error}${details ? `\nProcess output:\n${details}` : ''}`,
  );
} finally {
  if (child) await stopChild(child);
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to allocate a smoke port.');
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function waitForHealth(processHandle, url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'API did not respond.';
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null || processHandle.signalCode !== null) {
      throw new Error(
        `API exited before health check (${processHandle.exitCode ?? processHandle.signalCode}).`,
      );
    }
    try {
      return await getJson(url);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(200);
  }
  throw new Error(`Health check timed out: ${lastError}`);
}

async function stopChild(processHandle) {
  if (processHandle.exitCode !== null || processHandle.signalCode !== null) return;
  const exited = new Promise((resolve) => processHandle.once('exit', resolve));
  processHandle.kill('SIGTERM');
  await Promise.race([exited, delay(5_000, undefined, { ref: false })]);
  if (processHandle.exitCode === null && processHandle.signalCode === null) {
    processHandle.kill('SIGKILL');
    await exited;
  }
}

function appendOutput(current, chunk) {
  return `${current}${String(chunk)}`.slice(-20_000);
}

async function installRuntime(directory, ignoreNativeScripts) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const argumentsList = ['ci', '--omit=dev', '--no-audit', '--no-fund'];
  if (ignoreNativeScripts) argumentsList.push('--ignore-scripts');
  const installation = spawn(command, argumentsList, {
    cwd: directory,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  installation.stdout.on('data', (chunk) => {
    output = appendOutput(output, chunk);
  });
  installation.stderr.on('data', (chunk) => {
    output = appendOutput(output, chunk);
  });

  const result = await Promise.race([
    new Promise((resolve, reject) => {
      installation.once('error', reject);
      installation.once('exit', (code, signal) => resolve({ code, signal }));
    }),
    delay(180_000, null, { ref: false }),
  ]);
  if (!result) {
    installation.kill('SIGKILL');
    throw new Error('npm ci timed out after 180 seconds.');
  }
  if (result.code !== 0) {
    throw new Error(
      `npm ci failed (${result.code ?? result.signal}).${output.trim() ? `\n${output.trim()}` : ''}`,
    );
  }
}

async function copyRepositoryNativeBinaries(targetNodeModules) {
  for (const dependency of nativeDependencyNames) {
    const source = join(repoRoot, 'node_modules', dependency);
    const target = join(targetNodeModules, dependency);
    await copyNativeBinaries(source, target, source);
  }
}

async function copyNativeBinaries(directory, targetRoot, sourceRoot) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) {
      await copyNativeBinaries(source, targetRoot, sourceRoot);
    } else if (entry.isFile() && entry.name.endsWith('.node')) {
      const target = join(targetRoot, relative(sourceRoot, source));
      await mkdir(dirname(target), { recursive: true });
      await copyFile(source, target);
    }
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = get(url, { timeout: 1_000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body = `${body}${chunk}`.slice(-20_000);
      });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Health endpoint returned HTTP ${response.statusCode ?? 'unknown'}.`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Health endpoint returned invalid JSON: ${String(error)}`));
        }
      });
    });
    request.once('timeout', () => request.destroy(new Error('Health request timed out.')));
    request.once('error', reject);
  });
}

function parseArguments(argumentsList) {
  const supportedFlags = new Set(['--reuse-native']);
  const flags = argumentsList.filter((argument) => argument.startsWith('--'));
  const unknownFlag = flags.find((flag) => !supportedFlags.has(flag));
  if (unknownFlag) throw new Error(`Unknown smoke option: ${unknownFlag}.`);
  const positional = argumentsList.filter((argument) => !argument.startsWith('--'));
  if (positional.length > 1) throw new Error('Smoke accepts at most one package directory.');
  return { packageArgument: positional[0], reuseNative: flags.includes('--reuse-native') };
}
