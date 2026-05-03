#!/usr/bin/env node
/**
 * Push EXPO_PUBLIC_REVENUECAT_* from .env to EAS (production, preview, development).
 * Auth: EXPO_TOKEN env or ./expo-token.local (gitignored).
 */
import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env') });

function expoToken() {
  const fromEnv = process.env.EXPO_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const p = join(root, 'expo-token.local');
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf8').trim().split(/\n/)[0]?.trim() ?? '';
}

function runEas(args) {
  const easBin = join(root, 'node_modules/.bin/eas');
  const cmd = existsSync(easBin) ? easBin : 'eas';
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, EXPO_TOKEN: token },
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const token = expoToken();
if (!token) {
  console.error(
    'Missing auth: set EXPO_TOKEN or create expo-token.local (see scripts/eas-release-ios-noninteractive.sh).',
  );
  process.exit(1);
}

const ios = (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '').trim();
const android = (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '').trim();

if (!ios && !android) {
  console.error('Nothing to sync: set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (and/or Android) in .env');
  process.exit(1);
}

const easEnvs = ['production', 'preview', 'development'];

function pushVar(easEnv, name, value) {
  console.log(`\n→ ${name} @ ${easEnv}`);
  runEas([
    'env:create',
    easEnv,
    '--name',
    name,
    '--value',
    value,
    '--visibility',
    'sensitive',
    '--non-interactive',
    '--force',
  ]);
}

for (const easEnv of easEnvs) {
  if (ios) pushVar(easEnv, 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', ios);
  if (android) pushVar(easEnv, 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY', android);
}

console.log('\nDone. EAS builds will pick these up per profile (see eas.json → environment).');
