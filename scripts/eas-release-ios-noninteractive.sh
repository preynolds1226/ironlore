#!/usr/bin/env bash
# Non-interactive iOS release (Expo token + EAS Build + EAS Submit).
# Prerequisites:
#   1. Create an access token: https://expo.dev/accounts/[you]/settings/access-tokens
#   2. Auth (pick one):
#        export EXPO_TOKEN='...'
#        echo 'YOUR_TOKEN' > expo-token.local   (file is gitignored)
#   3. For submit: set submit.production.ios.ascAppId in eas.json (numeric Apple ID
#      from App Store Connect → your app → App Information → General Information).
#   4. For submit without prompts: App Store Connect API key — see
#      https://expo.fyi/creating-asc-api-key (store .p8 outside repo or use EAS-stored credentials)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EAS="${ROOT}/node_modules/.bin/eas"
if [[ ! -x "$EAS" ]]; then
  echo "eas-cli not found. Run: npm install"
  exit 1
fi

if [[ -z "${EXPO_TOKEN:-}" && -f "${ROOT}/expo-token.local" ]]; then
  EXPO_TOKEN="$(head -n 1 "${ROOT}/expo-token.local" | tr -d '\r\n')"
fi

# Trim ends; strip BOM / non‑breaking spaces (common when copying from the browser)
EXPO_TOKEN="$(printf '%s' "${EXPO_TOKEN:-}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
if command -v python3 >/dev/null 2>&1; then
  EXPO_TOKEN="$(printf '%s' "$EXPO_TOKEN" | python3 -c "
import sys
s = sys.stdin.read()
for ch in ('\ufeff', '\u00a0', '\u200b', '\u200c', '\u200d'):
    s = s.replace(ch, '')
s = s.strip()
sys.stdout.write(s)
")"
fi

# If someone pasted "export EXPO_TOKEN='...'" or "Bearer sk-..." by mistake, keep only the token part
case "$EXPO_TOKEN" in
  [Bb]earer\ *) EXPO_TOKEN="${EXPO_TOKEN#Bearer }"; EXPO_TOKEN="${EXPO_TOKEN#bearer }" ;;
  EXPO_TOKEN=*) EXPO_TOKEN="${EXPO_TOKEN#EXPO_TOKEN=}"; EXPO_TOKEN="${EXPO_TOKEN#\'}"; EXPO_TOKEN="${EXPO_TOKEN%\'}" ;;
esac
EXPO_TOKEN="$(printf '%s' "$EXPO_TOKEN" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

if [[ -z "$EXPO_TOKEN" ]]; then
  echo "No Expo token: set EXPO_TOKEN or create expo-token.local (one line, from expo.dev access tokens)."
  echo "https://expo.dev/settings/access-tokens"
  exit 1
fi

if [[ "${#EXPO_TOKEN}" -lt 20 ]]; then
  echo "EXPO_TOKEN is too short — use a real Expo access token."
  exit 1
fi

export EXPO_TOKEN

echo "==> Verify Expo token"
if ! "$EAS" whoami; then
  echo ""
  echo "Expo did not accept this token. Your expo-token.local must contain ONLY the access token from:"
  echo "  https://expo.dev/settings/access-tokens"
  echo "Delete everything in that file, paste one line (the token only), save, then run this script again."
  exit 1
fi

echo "==> Link EAS project (writes extra.eas.projectId to app.json)"
"$EAS" init --non-interactive --force

echo "==> Production iOS build"
"$EAS" build -p ios --profile production --non-interactive

echo "==> Submit latest build to App Store Connect"
if ! "$EAS" submit -p ios --profile production --latest --non-interactive --wait; then
  echo ""
  echo "Submit failed. For non-interactive submit you typically need:"
  echo "  • eas.json → submit.production.ios.ascAppId (numeric ID from App Store Connect)"
  echo "  • App Store Connect API key configured for EAS Submit"
  echo "Docs: https://docs.expo.dev/submit/ios/"
  echo "      https://expo.fyi/asc-app-id"
  exit 1
fi

echo "Done. Check App Store Connect → TestFlight for processing status."
