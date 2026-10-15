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
