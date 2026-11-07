import type { Department, OrgMember } from '@/lib/api/org'
import { sumAlerts } from '@/lib/api/stats'
import type { UserAccount } from '@/lib/api/users'

// Tính toán thuần cho "Sức khỏe tổ chức": số liệu nhân viên (/stats/org/members) ghép với tài khoản
// (/users, có departmentId). Backend không lưu phòng ban tại thời điểm đo (team-sync 4.6), nên mọi nhóm
// theo phòng ban dùng phòng ban HIỆN TẠI của từng người.

/** Giá trị Select / khóa nhóm cho nhân viên chưa có phòng ban. */
export const NO_DEPARTMENT = 'NONE'
export const NO_DEPARTMENT_LABEL = 'Chưa có phòng ban'
const UNKNOWN_USER = 'UNKNOWN_USER'

/** Phần trăm thời gian ngồi sai trong thời gian có mặt; null khi chưa có mặt phút nào (không phải 0%). */
export function badSharePercent(badMinutes: number, presenceMinutes: number): number | null {
  return presenceMinutes > 0 ? (badMinutes / presenceMinutes) * 100 : null
}

export interface DepartmentStats {
  key: string
  name: string
  /** phòng ban đã ngừng dùng nhưng nhân viên vẫn còn gán */
  inactive: boolean
  /** số nhân viên có số liệu trong khoảng */
  employees: number
  /** trung bình điểm có trọng số theo thời gian có mặt; null khi không ai có điểm */
  meanScore: number | null
  badMinutes: number
  presenceMinutes: number
  alerts: number
}

type Group = DepartmentStats & { weighted: number; weight: number }

function emptyGroup(key: string, name: string, inactive = false): Group {
  return {
    key,
    name,
    inactive,
    employees: 0,
    meanScore: null,
    badMinutes: 0,
    presenceMinutes: 0,
    alerts: 0,
    weighted: 0,
    weight: 0,
  }
}

/**
 * Gom số liệu nhân viên theo phòng ban hiện tại. Mọi phòng ban đang dùng đều có một dòng (chưa có số liệu thì
 * `employees = 0`); phòng ban ngừng dùng chỉ hiện khi còn nhân viên có số liệu; nhóm "Chưa có phòng ban" chỉ hiện
 * khi có người. Điểm phòng ban = trung bình điểm các nhân viên có trọng số theo thời gian có mặt.
 * Thứ tự: điểm thấp nhất trước, chưa có số liệu sau, nhóm không phòng ban cuối cùng.
 */
export function groupByDepartment(
  members: OrgMember[],
  directory: Record<string, UserAccount> | undefined,
  departments: Department[],
): DepartmentStats[] {
  const groups = new Map<string, Group>()
  for (const d of departments) if (d.active) groups.set(d.id, emptyGroup(d.id, d.name))

  for (const m of members) {
    const user = directory?.[m.userId]
    const key = !user ? UNKNOWN_USER : (user.departmentId ?? NO_DEPARTMENT)

    let group = groups.get(key)
    if (!group) {
      const known = departments.find((d) => d.id === key)
      if (key === UNKNOWN_USER) group = emptyGroup(key, 'Không tra được nhân viên')
      else if (key === NO_DEPARTMENT) group = emptyGroup(key, NO_DEPARTMENT_LABEL)
      else if (known) group = emptyGroup(key, known.name, true)
      else group = emptyGroup(key, 'Phòng ban không rõ')
      groups.set(key, group)
    }
    group.employees += 1
    group.badMinutes += m.badMinutes
    group.presenceMinutes += m.presenceMinutes
    group.alerts += sumAlerts(m.alerts)
    if (m.meanScore !== null) {
      group.weighted += m.meanScore * m.presenceMinutes
      group.weight += m.presenceMinutes
    }
  }

  const noDepartment = (g: DepartmentStats) => g.key === NO_DEPARTMENT || g.key === UNKNOWN_USER
  return [...groups.values()]
    .map((g): DepartmentStats => {
      const { weighted, weight, ...rest } = g
      return { ...rest, meanScore: weight > 0 ? weighted / weight : null }
    })
    .sort(
      (a, b) =>
        Number(noDepartment(a)) - Number(noDepartment(b)) ||
        Number(a.meanScore === null) - Number(b.meanScore === null) ||
        (a.meanScore ?? 0) - (b.meanScore ?? 0) ||
        a.name.localeCompare(b.name, 'vi'),
    )
}
