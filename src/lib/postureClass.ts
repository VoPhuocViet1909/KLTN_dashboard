// Lớp tư thế của model v4 (posture_config.json["classes"]); nhãn trùng với Desktop (posture_class.py CLASS_VI).
// Mobile chép file này sang GIT_mobile/src/lib – sửa ở đây rồi chép lại.

export const POSTURE_CLASSES = ['GOOD', 'FORWARD_HEAD', 'LEAN_FORWARD', 'SLOUCH', 'LEAN_BACKWARD', 'NECK_EXTENSION'] as const
export type PostureClass = (typeof POSTURE_CLASSES)[number]

export const CLASS_LABEL: Record<PostureClass, string> = {
  GOOD: 'Ngồi tốt',
  FORWARD_HEAD: 'Đầu đưa ra trước',
  LEAN_FORWARD: 'Cúi người về trước',
  SLOUCH: 'Gù lưng',
  LEAN_BACKWARD: 'Ngả ra sau',
  NECK_EXTENSION: 'Ngửa cổ',
}

/** Thứ tự xếp chồng từ dưới lên: tư thế tốt (xám trung tính) rồi các lớp xấu xen kẽ đậm/nhạt để phân biệt được. */
export const STACK_ORDER: PostureClass[] = ['GOOD', 'FORWARD_HEAD', 'SLOUCH', 'LEAN_FORWARD', 'LEAN_BACKWARD', 'NECK_EXTENSION']

/** Màu theo design system: GOOD dùng xám trung tính (không dùng xanh/đỏ trạng thái để tô chuỗi dữ liệu), lớp xấu dùng chart-1…5. */
export const CLASS_COLOR: Record<PostureClass, string> = {
  GOOD: 'var(--input)',
  FORWARD_HEAD: 'var(--chart-5)',
  SLOUCH: 'var(--chart-1)',
  LEAN_FORWARD: 'var(--chart-2)',
  LEAN_BACKWARD: 'var(--chart-4)',
  NECK_EXTENSION: 'var(--chart-3)',
}

export type ClassSeconds = Record<PostureClass, number>

export interface ClassPoint {
  start: string
  seconds: ClassSeconds
  presenceSec: number
}

export interface ClassDistribution {
  bucket: 'day' | 'week'
  classes: PostureClass[]
  totals: ClassSeconds
  /** tổng giây có lớp; nhỏ hơn presenceSec khi một phần dữ liệu đến từ client / model cũ không gửi lớp */
  classSec: number
  presenceSec: number
  points: ClassPoint[]
}

export const isPostureClass = (value: string): value is PostureClass => (POSTURE_CLASSES as readonly string[]).includes(value)

/** Phần trăm làm tròn của từng lớp trên tổng giây có lớp; rỗng khi chưa có dữ liệu lớp. Lớp xấu nhiều nhất trước, GOOD cuối. */
export function classShares(totals: ClassSeconds): { posture: PostureClass; seconds: number; share: number }[] {
  const sum = POSTURE_CLASSES.reduce((a, c) => a + (totals[c] ?? 0), 0)
  if (sum <= 0) return []
  const rows = POSTURE_CLASSES.map((posture) => ({ posture, seconds: totals[posture] ?? 0, share: (totals[posture] ?? 0) / sum }))
  return rows.sort((a, b) => (a.posture === 'GOOD' ? 1 : 0) - (b.posture === 'GOOD' ? 1 : 0) || b.seconds - a.seconds)
}

/** Lớp xấu đóng góp nhiều nhất (bỏ GOOD); null khi không có thời gian xấu. */
export function topBadClass(totals: ClassSeconds): PostureClass | null {
  const bad = classShares(totals).filter((r) => r.posture !== 'GOOD' && r.seconds > 0)
  return bad[0]?.posture ?? null
}

/** Số liệu cho biểu đồ cột chồng, đơn vị phút; thiếu ngày thì điền 0 để ngày trống hiện thành khoảng trống. */
export function chartRows(points: ClassPoint[], starts: string[] | null): { start: string; minutes: ClassSeconds; presenceMinutes: number }[] {
  const byStart = new Map(points.map((p) => [new Date(p.start).toISOString(), p]))
  const keys = starts ?? points.map((p) => new Date(p.start).toISOString())
  return keys.map((start) => {
    const p = byStart.get(start)
    const minutes = Object.fromEntries(POSTURE_CLASSES.map((c) => [c, (p?.seconds[c] ?? 0) / 60])) as ClassSeconds
    return { start, minutes, presenceMinutes: (p?.presenceSec ?? 0) / 60 }
  })
}

/** Phần dữ liệu có lớp tư thế trên thời gian có mặt (0..1); 0 khi chưa có mặt. */
export const classCoverage = (d: Pick<ClassDistribution, 'classSec' | 'presenceSec'>) =>
  d.presenceSec > 0 ? Math.min(1, d.classSec / d.presenceSec) : 0
