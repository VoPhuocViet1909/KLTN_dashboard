import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validObservation, newerObservation, observedDevice, OBSERVATION_LABEL, plumbState, configAcknowledgementText } from '../src/realtime/observation.ts'

const fixture = JSON.parse(readFileSync(new URL('./device-observation-v1.json', import.meta.url)))
const now = Date.parse('2026-11-12T00:00:00Z')
const base = { version: 1, userId: 'a', deviceId: 'desktop', sessionId: 'session', sequence: 2,
  state: 'GOOD', reason: 'NONE', observedAt: new Date(now).toISOString(), receivedAt: new Date(now).toISOString(), expiresAt: new Date(now + 15000).toISOString() }
for (const item of fixture.states) {
  const value = { ...base, state: item.state, reason: item.reason }
  assert.equal(OBSERVATION_LABEL[item.state], item.label)
  assert(validObservation(value))
  assert.equal(observedDevice(value, now, true).state, item.state)
  assert.equal(observedDevice(value, now + 15000, true).state, 'OFFLINE')
  assert.equal(observedDevice(value, now, false).state, 'OFFLINE')
}
for (const item of [null, {}, { ...base, state: '__proto__' }, { ...base, sequence: NaN }, { ...base, expiresAt: 'bad' }, { ...base, expiresAt: new Date(now + 16000).toISOString() }]) assert(!validObservation(item))
assert(!newerObservation({ ...base, sequence: 1 }, base))
assert(!newerObservation({ ...base, sequence: 2 }, base))
assert(newerObservation({ ...base, sequence: 3 }, base))
assert(!newerObservation({ ...base, sessionId: 'other', observedAt: new Date(now - 1).toISOString() }, base))
assert.equal(plumbState('UNKNOWN'), null)
assert.equal(plumbState('CAMERA_LOST'), null)
assert.equal(plumbState('GOOD'), 'GOOD')
console.log('PASS: shared seven states, expiry/disconnect, invalid packets, ordering and neutral unknown visualization')
const config = { version: 5, revision: 'a'.repeat(64), state: 'APPLIED', appliedAt: new Date(now).toISOString() }
const configured = { ...base, config }
assert(validObservation(configured))
assert(!validObservation({ ...base, config: { ...config, version: -1 } }))
assert(!validObservation({ ...base, config: { ...config, state: 'SAVED' } }))
assert.match(configAcknowledgementText(observedDevice(configured, now, true), config), /Đã nạp cấu hình hiện tại/)
assert.match(configAcknowledgementText(observedDevice(configured, now, true), { ...config, revision: 'b'.repeat(64) }), /chờ đồng bộ/)
assert.match(configAcknowledgementText(observedDevice(configured, now + 15000, true), config), /Chưa có xác nhận/)
assert.match(configAcknowledgementText(observedDevice(configured, now, false), config), /Chưa có xác nhận/)
assert.match(configAcknowledgementText(observedDevice({ ...base, config: { ...config, state: 'REJECTED', appliedAt: null } }, now, true), config), /từ chối/)
console.log('PASS: applied/rejected versions, membership revisions and stale acknowledgement handling')
