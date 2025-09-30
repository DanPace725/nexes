#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error('Please provide a workspace name, e.g. "yarn test ormd-parser".');
  process.exit(1);
}

const [target, ...forwarded] = args;
const workspace = target.startsWith('@') ? target : `@nexes/${target}`;

const run = (command, commandArgs) =>
  spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: process.env
  });

const result = run('yarn', ['workspace', workspace, 'test', ...forwarded]);

if (result.status === 0) {
  process.exit(0);
}

if (workspace === '@nexes/ormd-parser') {
  console.warn(
    'Falling back to direct Jest execution for @nexes/ormd-parser (Yarn workspace command was unavailable).'
  );
  const configPath = path.join('packages', 'ormd-parser', 'jest.config.js');
  const fallback = run('npx', ['jest', '--config', configPath, ...forwarded]);
  process.exit(fallback.status ?? 1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
