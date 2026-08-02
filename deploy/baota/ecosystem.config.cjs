/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, module, process */

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

const deploymentRoot = process.env.OA_DEPLOY_ROOT || '/www/wwwroot/oa-hotel';
const apiDirectory = resolve(deploymentRoot, 'current/api');
const environmentFile = resolve(deploymentRoot, 'shared/api.env');
const logDirectory = resolve(deploymentRoot, 'shared/logs');

if (!existsSync(environmentFile)) {
  throw new Error(`Missing API environment file: ${environmentFile}`);
}
const deploymentEnvironment = parseEnv(readFileSync(environmentFile, 'utf8'));

for (const name of ['JWT_SECRET', 'OA_DATABASE_PATH']) {
  if (!deploymentEnvironment[name]?.trim()) {
    throw new Error(`Missing required environment variable in ${environmentFile}: ${name}`);
  }
}
const jwtSecret = deploymentEnvironment.JWT_SECRET.trim();
if (jwtSecret.length < 32 || jwtSecret === 'replace-with-at-least-48-random-bytes') {
  throw new Error('JWT_SECRET must be a private random value containing at least 32 characters.');
}

module.exports = {
  apps: [
    {
      name: 'oa-hotel-api',
      cwd: apiDirectory,
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      kill_timeout: 10000,
      time: true,
      out_file: resolve(logDirectory, 'api-out.log'),
      error_file: resolve(logDirectory, 'api-error.log'),
      env: {
        NODE_ENV: 'production',
        HOST: deploymentEnvironment.HOST || '127.0.0.1',
        PORT: deploymentEnvironment.PORT || '3000',
        JWT_SECRET: jwtSecret,
        OA_DATABASE_PATH: deploymentEnvironment.OA_DATABASE_PATH,
        OA_TIME_ZONE: deploymentEnvironment.OA_TIME_ZONE || 'Asia/Shanghai',
        OA_DEMO_SEED: 'false',
        OA_BOOTSTRAP_ADMIN_USERNAME: deploymentEnvironment.OA_BOOTSTRAP_ADMIN_USERNAME || '',
        OA_SWAGGER_ENABLED: deploymentEnvironment.OA_SWAGGER_ENABLED || 'false',
        OA_CORS_ORIGINS: deploymentEnvironment.OA_CORS_ORIGINS || '',
      },
    },
  ],
};
