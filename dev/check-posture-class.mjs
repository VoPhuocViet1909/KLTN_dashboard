// Kiểm hàm thuần của biểu đồ lớp tư thế (src/lib/postureClass.ts): node --experimental-strip-types dev/check-posture-class.mjs
import assert from 'node:assert/strict'
import {
  CLASS_LABEL, POSTURE_CLASSES, STACK_ORDER, chartRows, classCoverage, classShares, isPostureClass, topBadClass,
} from '../src/lib/postureClass.ts'

const zero = () => Object.fromEntries(POSTURE_CLASSES.map((c) => [c, 0]))
const secs = (o) => ({ ...zero(), ...o })

assert.deepEqual([...POSTURE_CLASSES].sort(), [...STACK_ORDER].sort(), 'mọi lớp đều có trong thứ tự xếp chồng')
assert.equal(POSTURE_CLASSES.length, 6)
assert.ok(POSTURE_CLASSES.every((c) => CLASS_LABEL[c]), 'mỗi lớp có nhãn tiếng Việt')
assert.equal(CLASS_LABEL.FORWARD_HEAD, 'Đầu đưa ra trước')
assert.equal(isPostureClass('SLOUCH'), true)
assert.equal(isPostureClass('WEIRD'), false)

// phân bố: lớp xấu nhiều nhất trước, GOOD cuối, tổng 100%
const totals = secs({ GOOD: 600, SLOUCH: 300, FORWARD_HEAD: 100 })
const shares = classShares(totals)
assert.equal(shares[0].posture, 'SLOUCH')
assert.equal(shares[shares.length - 1].posture, 'GOOD')
assert.ok(Math.abs(shares.reduce((a, r) => a + r.share, 0) - 1) < 1e-9)
assert.equal(topBadClass(totals), 'SLOUCH')
assert.equal(topBadClass(secs({ GOOD: 100 })), null, 'chỉ có tư thế tốt: không có lớp xấu nổi bật')
assert.deepEqual(classShares(zero()), [], 'chưa có dữ liệu lớp: rỗng')

// biểu đồ: điền ngày trống bằng 0, đổi giây sang phút, khớp theo mốc UTC
const day = (d) => new Date(Date.UTC(2026, 10, d, 17)).toISOString()
const rows = chartRows(
  [{ start: day(14), seconds: secs({ GOOD: 120, SLOUCH: 60 }), presenceSec: 300 }],
  [day(13), day(14), day(15)],
)
assert.equal(rows.length, 3)
assert.equal(rows[0].minutes.GOOD, 0)
assert.equal(rows[1].minutes.GOOD, 2)
assert.equal(rows[1].minutes.SLOUCH, 1)
assert.equal(rows[1].presenceMinutes, 5)
assert.equal(chartRows([{ start: day(14), seconds: secs({}), presenceSec: 0 }], null).length, 1, 'không điền: theo điểm có dữ liệu (tuần)')

// phủ dữ liệu lớp
assert.equal(classCoverage({ classSec: 30, presenceSec: 60 }), 0.5)
assert.equal(classCoverage({ classSec: 70, presenceSec: 60 }), 1, 'chặn ở 100%')
assert.equal(classCoverage({ classSec: 0, presenceSec: 0 }), 0)
console.log('PASS: posture-class helpers (nhãn, thứ tự, phân bố, điền ngày trống, độ phủ)')
