#!/usr/bin/env node
/**
 * Writes App Store Connect API submit settings into eas.json using:
 * - expo-asc-issuer.local  → single line: Issuer ID (UUID from App Store Connect → Users and Access → Integrations → App Store Connect API)
 * - AuthKey_*.p8           → exactly one file in project root (from Apple key download)
 *
 * Commit policy: after running, eas.json will contain ascApiKeyIssuerId; review `git diff eas.json` before committing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const issuerPath = path.join(root, 'expo-asc-issuer.local');
const easPath = path.join(root, 'eas.json');

if (!fs.existsSync(issuerPath)) {
  console.error(`
Missing ${path.relative(root, issuerPath)}

Do this once in the browser:
  App Store Connect → Users and Access → Integrations → App Store Connect API

Copy the Issuer ID (UUID at the top), then:

  echo 'YOUR_ISSUER_UUID' > expo-asc-issuer.local

(Re-run this script.)
`);
  process.exit(1);
}

const issuer = fs.readFileSync(issuerPath, 'utf8').trim().replace(/\s+/g, '');
if (!issuer) {
  console.error('expo-asc-issuer.local is empty.');
  process.exit(1);
}

const keys = fs.readdirSync(root).filter((f) => /^AuthKey_[A-Z0-9]+\.p8$/i.test(f));
if (keys.length !== 1) {
  console.error(
    `Expected exactly one AuthKey_XXXXXXXXXX.p8 in project root; found: ${keys.length ? keys.join(', ') : 'none'}`
  );
  process.exit(1);
}

const keyFile = keys[0];
const m = keyFile.match(/^AuthKey_([A-Z0-9]+)\.p8$/i);
const keyId = m ? m[1] : null;
if (!keyId) {
  console.error('Could not parse Key ID from filename:', keyFile);
  process.exit(1);
}

let eas = {};
if (fs.existsSync(easPath)) {
  eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
}

const existingAscAppId = eas.submit?.production?.ios?.ascAppId;
const ascAppId = existingAscAppId || '6765777268';

eas.submit = eas.submit || {};
eas.submit.production = eas.submit.production || {};
eas.submit.production.ios = {
  ascAppId,
  ascApiKeyPath: `./${keyFile}`,
  ascApiKeyId: keyId,
  ascApiKeyIssuerId: issuer,
};

fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + '\n');
console.log(`Updated eas.json → submit.production.ios (ascAppId=${ascAppId}, key ${keyId}, Issuer from expo-asc-issuer.local).`);
