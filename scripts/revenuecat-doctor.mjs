#!/usr/bin/env node
/**
 * Local .env check + copy-paste checklist for RevenueCat, App Store Connect, and EAS.
 */
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const BUNDLE_ID = 'com.ironlore.app';
const ENTITLEMENT = 'pro';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

const block = `
# RevenueCat — public SDK keys from https://app.revenuecat.com → API keys (use Apple / Google app keys, not secret keys)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
`;

let raw = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
if (!raw.includes('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY')) {
  appendFileSync(envPath, block, 'utf8');
  console.log('Added RevenueCat env vars to .env (fill EXPO_PUBLIC_REVENUECAT_IOS_API_KEY).\n');
} else {
  const hasIos = /EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=\S+/.test(raw);
  console.log(
    hasIos
      ? 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY appears set in .env.\n'
      : 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is empty in .env — paste your iOS public SDK key.\n',
  );
}

console.log(`── IronLore IAP setup (${BUNDLE_ID}) ──

1) App Store Connect (https://appstoreconnect.apple.com)
   • Your app must have the Paid Applications agreement accepted.
   • Features → In-App Purchases → create a Subscription Group (e.g. "IronLore Pro").
   • Add auto-renewable products (e.g. monthly + annual). Note each Product ID.

2) RevenueCat (https://app.revenuecat.com)
   • New project (or use existing) → Add app → iOS bundle id: ${BUNDLE_ID}
   • Connect App Store: App Store Connect API key (recommended) or shared secret.
   • Entitlements: create "${ENTITLEMENT}" (must match src/purchases/constants.ts).
   • Products: import/link the same Product IDs from App Store Connect.
   • Offerings: set a Current offering; add Packages (monthly → \$rc_monthly, annual → \$rc_annual, or custom).
   • API keys: copy the public SDK key for Apple → use below.

3) This repo (local dev)
   • Put the iOS public SDK key in .env as EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
   • Restart Metro with cache clear: npx expo start --clear
   • Subscriptions do not work in Expo Go. Run a dev client:
       npx expo run:ios

4) EAS Build — same EXPO_PUBLIC_* vars per environment (eas.json maps profiles → environments)
   One command (uses .env + expo-token.local):  npm run iap:sync-eas

   Or manually:
     npx eas-cli env:create production --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value 'appl_...' --visibility sensitive --non-interactive --force
     (repeat for preview and development)

   Or set the same names in Expo dashboard: Project → Environment variables.

5) Verify
   • Settings in the app → subscription card should show "Checking…" then Subscribed / Not subscribed when the SDK key is present.
   • iOS Sandbox: Settings → App Store → Sandbox Account (add a sandbox Apple ID from ASC → Users and Access → Sandbox).

Android (optional): same entitlement "${ENTITLEMENT}" in RevenueCat, Play Console subscription SKUs, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY in .env + EAS.
`);
