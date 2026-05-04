#!/usr/bin/env bash
# Stress: repeated terminate → launch on iOS simulators; fail on SIGABRT / EXC_BAD_ACCESS in log window.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED="${DERIVED:-$ROOT/build/sim-smoke-dd}"
APP="$DERIVED/Build/Products/Debug-iphonesimulator/IronLore.app"
BUNDLE_ID="com.ironlore.app"
CYCLES="${CYCLES:-15}"
LAUNCH_WAIT_SEC="${LAUNCH_WAIT_SEC:-4}"
LOG_WINDOW_SEC="${LOG_WINDOW_SEC:-20}"

# Default: iPad (review class) + two phones; override with STRESS_UDIDS="uuid1 uuid2"
DEFAULT_UDIDS=(
  "399F2521-08C8-4C2A-AE40-4D43BBA81707" # iPad Air 11-inch (M4)
  "D9EBD56D-B203-42E5-8D82-256BA55E765B" # iPhone 17 Pro Max
  "23F6025D-1B93-476B-9AD8-BB0805179B0C" # iPhone 17
)

if [[ -n "${STRESS_UDIDS:-}" ]]; then
  read -r -a UDIDS <<<"${STRESS_UDIDS}"
else
  UDIDS=("${DEFAULT_UDIDS[@]}")
fi

if [[ ! -d "$APP" ]]; then
  echo "Missing simulator app: $APP"
  echo "Run: bash scripts/ios-simulator-smoke.sh   (or set DERIVED to your Debug iphonesimulator output)"
  exit 1
fi

bad_log() {
  local udid="$1"
  # Narrow: avoid EXC_CRASH / Jetsam noise; we terminate the app each cycle on purpose.
  xcrun simctl spawn "$udid" log show --last "${LOG_WINDOW_SEC}s" --style compact 2>/dev/null | grep -E "SIGABRT|EXC_BAD_ACCESS" || true
}

for udid in "${UDIDS[@]}"; do
  name="$(xcrun simctl list devices available 2>/dev/null | grep -F "$udid" | sed 's/^[[:space:]]*//' | sed 's/ ([A-F0-9-]*) .*//' || true)"
  echo "============================================================"
  echo "Stress device: ${name:-unknown} ($udid)"
  echo "Cycles: $CYCLES  (wait ${LAUNCH_WAIT_SEC}s after each launch)"
  echo "============================================================"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl install "$udid" "$APP"

  for ((i = 1; i <= CYCLES; i++)); do
    xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
    sleep 0.5
    if ! xcrun simctl launch "$udid" "$BUNDLE_ID" >/dev/null; then
      echo "FAIL: launch returned non-zero on cycle $i"
      exit 1
    fi
    sleep "$LAUNCH_WAIT_SEC"
    bl=$(bad_log "$udid")
    if [[ -n "$bl" ]]; then
      echo "FAIL: bad signals in log after cycle $i / $CYCLES:"
      echo "$bl" | tail -20
      exit 1
    fi
    if ((i % 5 == 0)); then
      echo "  ... cycle $i / $CYCLES OK"
    fi
  done
  echo "PASS: $CYCLES launch cycles on ${name:-$udid}"
  echo ""
done

echo "All stress targets passed ($CYCLES cycles each, ${#UDIDS[@]} device(s))."
exit 0
