/** Debug boot timeline — session 8e89fa. Do not log secrets. */
const ENDPOINT = 'http://127.0.0.1:7776/ingest/6325f7bb-e970-418b-98aa-151711405d99';
const SESSION_ID = '8e89fa';

const trail: { t: number; location: string; message: string; hypothesisId: string }[] = [];
const listeners = new Set<() => void>();

export function subscribeBootTrail(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBootTrail() {
  return [...trail];
}

function notifyBootTrail() {
  listeners.forEach((l) => l());
}

export function bootLog(
  location: string,
  message: string,
  hypothesisId: string,
  data?: Record<string, unknown>,
) {
  const entry = { t: Date.now(), location, message, hypothesisId };
  trail.push(entry);
  if (trail.length > 24) trail.shift();
  notifyBootTrail();
  // eslint-disable-next-line no-console
  console.log('[IronLore:boot]', hypothesisId, message, data ?? '');
  // #region agent log
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      location,
      message,
      hypothesisId,
      data,
      timestamp: Date.now(),
      runId: 'boot-debug',
    }),
  }).catch(() => {});
  // #endregion
}
