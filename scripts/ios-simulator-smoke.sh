#!/usr/bin/env bash
# One Debug simulator build, then install + launch on multiple simulators (smoke: process stays up).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/ios"
DERIVED="$ROOT/build/sim-smoke-dd"
APP="$DERIVED/Build/Products/Debug-iphonesimulator/IronLore.app"
BUNDLE_ID="com.ironlore.app"
LAUNCH_WAIT_SEC="${LAUNCH_WAIT_SEC:-12}"

# UDIDs from `xcrun simctl list devices available` (update when Xcode adds devices)
DEVICES=(
  "D9EBD56D-B203-42E5-8D82-256BA55E765B" # iPhone 17 Pro Max
  "399F2521-08C8-4C2A-AE40-4D43BBA81707" # iPad Air 11-inch (M4) — closest to Review iPad Air 11" class
  "23F6025D-1B93-476B-9AD8-BB0805179B0C" # iPhone 17
  "EF430FCD-C376-47AC-8DAD-4C3A010C7C3D" # iPad Pro 11-inch (M5)
  "39CF8166-2974-4808-8753-23B1BE48FBF0" # iPad mini (A17 Pro)
)

if [[ ! -d "$IOS" ]]; then
  echo "Missing ios/ folder. Run: npx expo prebuild -p ios"
  exit 1
fi

if [[ "${SKIP_BUILD:-}" == "1" ]] && [[ -d "$APP" ]]; then
  echo "==> SKIP_BUILD=1: using existing $APP"
else
  echo "==> Building Debug simulator app (once)…"
  rm -rf "$DERIVED"
  mkdir -p "$(dirname "$DERIVED")"
  (
    cd "$IOS"
    set +e
    xcodebuild \
      -workspace IronLore.xcworkspace \
      -scheme IronLore \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "generic/platform=iOS Simulator" \
      -derivedDataPath "$DERIVED" \
      ONLY_ACTIVE_ARCH=NO \
      build
  )
  xc=$?
  if [[ $xc -ne 0 ]] || [[ ! -d "$APP" ]]; then
    echo "xcodebuild failed or .app missing (exit $xc). Expected: $APP"
    exit 1
  fi
fi

echo "==> Built: $APP"
echo ""

failures=0
for udid in "${DEVICES[@]}"; do
  name="$(xcrun simctl list devices available | grep -F "$udid" | sed 's/^[[:space:]]*//' | sed 's/ ([A-F0-9-]*) .*//' || true)"
  echo "----------"
  echo "Device: ${name:-unknown} ($udid)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl install "$udid" "$APP"
  # Terminate any previous instance
  xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
  # `simctl launch` prints "bundleId: pid" on success. iOS 26+ simulators often have no `ps` for
  # `simctl spawn`, so we rely on launch + crash signals in logs instead of process lists.
  set +e
  launch_out="$(xcrun simctl launch "$udid" "$BUNDLE_ID" 2>&1)"
  launch_xc=$?
  set -e
  if [[ "$launch_xc" -eq 0 ]] && echo "$launch_out" | grep -qE '^[^:]+:[[:space:]]+[0-9]+$'; then
    echo "OK: cold launch OK ($launch_out)"
  else
    echo "FAIL: launch failed (exit $launch_xc) or unexpected output: ${launch_out:-empty}"
    failures=$((failures + 1))
  fi
  sleep "$LAUNCH_WAIT_SEC"
  if xcrun simctl spawn "$udid" log show --last 30s --style compact 2>/dev/null | grep -q "SIGABRT"; then
    echo "FAIL: SIGABRT in recent logs for $udid"
    failures=$((failures + 1))
  fi
done

echo ""
if [[ "$failures" -gt 0 ]]; then
  echo "Smoke finished with $failures device(s) showing SIGABRT in log window."
  exit 1
fi
echo "Smoke finished: no SIGABRT in scanned log window. Manually exercise UI in Simulator if needed."
exit 0
