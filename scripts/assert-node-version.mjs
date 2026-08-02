import process from 'node:process';

const minimum = Object.freeze({ major: 20, minor: 18 });
const match = /^(\d+)\.(\d+)\.(\d+)/.exec(process.versions.node);

if (!match) throw new Error(`Unable to parse Node.js version: ${process.versions.node}`);

const major = Number(match[1]);
const minor = Number(match[2]);
if (major < minimum.major || (major === minimum.major && minor < minimum.minor)) {
  throw new Error(
    `Node.js >=${minimum.major}.${minimum.minor} is required; received ${process.version}. Use Node 22 LTS for production builds.`,
  );
}
