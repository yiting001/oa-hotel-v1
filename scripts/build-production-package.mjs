import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import process from 'node:process';
import {
  apiReleaseDir,
  assertApiRelease,
  assertProductionPackage,
  assertWebDist,
  repoRoot,
  resolvePackageDir,
  sha256,
  webDistDir,
  writeManifest,
} from './production-package.mjs';

const outputDirectory = resolvePackageDir(process.argv[2]);
const deploymentAssets = join(repoRoot, 'deploy/baota');
const deploymentDocument = join(repoRoot, 'docs/deployment/centos-baota.md');
const archivePath = `${outputDirectory}.tar.gz`;
const archiveChecksumPath = `${archivePath}.sha256`;

await assertApiRelease();
await assertWebDist();
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(dirname(outputDirectory), { recursive: true });
await cp(apiReleaseDir, join(outputDirectory, 'api'), {
  recursive: true,
  filter: (source) => !relative(apiReleaseDir, source).split(sep).includes('node_modules'),
});
await cp(webDistDir, join(outputDirectory, 'web'), { recursive: true });
await cp(deploymentAssets, join(outputDirectory, 'config'), { recursive: true });
await cp(deploymentDocument, join(outputDirectory, 'DEPLOYMENT.md'));
const manifest = await writeManifest(outputDirectory);
await assertProductionPackage(outputDirectory);
await rm(archivePath, { force: true });
await rm(archiveChecksumPath, { force: true });
execFileSync('tar', ['-czf', archivePath, '-C', outputDirectory, '.'], { stdio: 'inherit' });
const archiveChecksum = sha256(await readFile(archivePath));
await writeFile(archiveChecksumPath, `${archiveChecksum}  ${basename(archivePath)}\n`);

process.stdout.write(
  `Production package ready: ${relative(repoRoot, outputDirectory)} (${manifest.files.length} files)\n` +
    `Upload archive: ${relative(repoRoot, archivePath)}\n` +
    `Archive checksum: ${relative(repoRoot, archiveChecksumPath)}\n`,
);
