// Backend nhận from/to dạng ISO-8601 có múi giờ. Gửi dạng UTC (…Z) để không phải lo mã hóa dấu "+".
// "Ngày" và heatmap phía backend tính theo giờ Việt Nam.

export const VN_TZ = 'Asia/Ho_Chi_Minh'

export function lastDays(days: number, now = new Date()) {
  const to = new Date(now)
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

const dateTimeFmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VN_TZ,
  dateStyle: 'short',
  timeStyle: 'short',
})

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? dateTimeFmt.format(new Date(iso)) : '—'

const DAY = 24 * 60 * 60 * 1000
const VN_OFFSET = 7 * 60 * 60 * 1000 // Việt Nam không có giờ mùa hè

/** Mốc 00:00 giờ Việt Nam (dạng UTC ISO) của mọi ngày từ `days` ngày trước tới hôm nay. */
export function vnDayStarts(days: number, now = new Date()) {
  const today = Math.floor((now.getTime() + VN_OFFSET) / DAY) * DAY - VN_OFFSET
  return Array.from({ length: days + 1 }, (_, i) => new Date(today - (days - i) * DAY).toISOString())
}
