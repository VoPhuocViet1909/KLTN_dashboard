// Kiểm hàm thuần của trang Nguy cơ sức khỏe (src/lib/healthRisk.ts): node --experimental-strip-types dev/check-health-risk.mjs
import assert from 'node:assert/strict'
import { DISCLAIMER, barPercent, citation, formatIndicator, markerPercent, noteLabel, sortRisks, sourceHref } from '../src/lib/healthRisk.ts'

const risk = (kbId, level) => ({ kbId, level })
assert.deepEqual(sortRisks([risk('B', 'LOW'), risk('A', 'INSUFFICIENT_DATA'), risk('C', 'HIGH'), risk('D', 'MEDIUM'), risk('A2', 'HIGH')]).map((r) => r.kbId),
  ['A2', 'C', 'D', 'B', 'A'], 'nặng trước, chưa đủ dữ liệu cuối, cùng mức theo kbId')

assert.equal(formatIndicator('tooCloseRatio', 0.126), '13%')
assert.equal(formatIndicator('longestSittingMin', 92.04), '92')
assert.equal(formatIndicator('neckTrunkAlertsPerHour', 2.56), '2.6')
assert.equal(formatIndicator('badRatio', null), 'Chưa đo', 'chưa đo không thành 0')
assert.equal(formatIndicator('badRatio', 0), '0%')

const ind = (value, mediumGte, highGte) => ({ key: 'tooCloseRatio', label: 'x', value, mediumGte, highGte })
assert.equal(barPercent(ind(0.125, 0.1, 0.25)), 50)
assert.equal(barPercent(ind(0.9, 0.1, 0.25)), 100, 'chặn ở 100')
assert.equal(barPercent(ind(null, 0.1, 0.25)), 0)
assert.equal(barPercent(ind(0.1, 0.1, null)), 50, 'không có ngưỡng cao: thanh tới gấp đôi ngưỡng vừa')
assert.equal(markerPercent(ind(0, 0.1, 0.25), 0.1), 40)
assert.equal(markerPercent(ind(0, 0.1, 0.25), null), null)

assert.equal(sourceHref({ doi: '10.1/x', url: null }), 'https://doi.org/10.1/x')
assert.equal(sourceHref({ doi: null, url: 'https://www.osha.gov/a' }), 'https://www.osha.gov/a')
assert.equal(sourceHref({ doi: null, url: 'javascript:alert(1)' }), null, 'không mở liên kết lạ')
assert.equal(sourceHref({ doi: null, url: 'http://insecure.example' }), null)
assert.equal(citation({ authors: 'Lis AM', year: 2007, title: 'T', journal: 'J' }), 'Lis AM. (2007). T. J')

assert.equal(noteLabel(null), null)
assert.match(noteLabel('no_api_key'), /Chưa bật AI/)
assert.match(noteLabel('quota'), /hạn mức/)
assert.match(noteLabel('invalid_output: x'), /không qua bước kiểm tra/)
assert.match(DISCLAIMER, /không phải chẩn đoán y khoa/)
console.log('PASS: health-risk helpers (sắp xếp, định dạng, thanh chỉ số, liên kết nguồn, nhãn lý do, câu miễn trừ)')
