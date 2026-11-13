import assert from 'node:assert/strict'
import { validDiagnostics } from '../src/realtime/diagnostics.ts'
import { validObservation, observedDevice } from '../src/realtime/observation.ts'

const now = Date.parse('2026-11-14T00:00:00Z')
const data = { version: 1, deliveryState: 'RETRYING', queued: 2, pending: 5, retrying: 3, dead: 1, acceptedSinceStart: 10,
  lastAttemptAt: new Date(now).toISOString(), lastAcceptedAt: null, oldestPendingAt: new Date(now - 100000).toISOString(),
  lastAttemptMs: 100, configFetchApplyMs: null, lastFailureCode: 'HTTP_SERVER' }
assert(validDiagnostics(data, now))
for (const patch of [{ pending: -1 }, { queued: .5 }, { dead: true }, { acceptedSinceStart: Number.MAX_SAFE_INTEGER + 1 },
  { retrying: 6 }, { lastAttemptMs: 300001 }, { configFetchApplyMs: -1 }, { lastFailureCode: 'Bearer secret' },
  { deliveryState: '__proto__' }, { url: 'https://secret.invalid' }, { lastAttemptAt: 'bad' }, { lastAcceptedAt: new Date(now + 11000).toISOString() }]) {
  assert(!validDiagnostics({ ...data, ...patch }, now), JSON.stringify(patch))
}
const missing = { ...data }; delete missing.oldestPendingAt
assert(!validDiagnostics(missing, now)); assert(!validDiagnostics(data, NaN))
const observation = { version: 1, userId: 'owner', deviceId: 'desktop', sessionId: 'session', sequence: 1, state: 'GOOD', reason: 'NONE',
  observedAt: new Date(now).toISOString(), receivedAt: new Date(now).toISOString(), expiresAt: new Date(now + 15000).toISOString(), diagnostics: data }
assert(validObservation(observation))
assert(observedDevice(observation, now, true).diagnosticsFresh)
assert(!observedDevice(observation, now + 15000, true).diagnosticsFresh)
assert(!observedDevice(observation, now, false).diagnosticsFresh)
assert(!observedDevice({ ...observation, state: 'OFFLINE', reason: 'SESSION_STOPPED' }, now, true).diagnosticsFresh)
const legacy = { ...observation }; delete legacy.diagnostics
assert(validObservation(legacy)); assert.equal(observedDevice(legacy, now, true).diagnostics, undefined)
console.log('PASS: bounded safe diagnostics, unknown vs zero, legacy compatibility and expiry/disconnect/stop freshness')
