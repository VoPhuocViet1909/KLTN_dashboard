import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PagedTable } from '@/components/PagedTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { toApiError } from '@/lib/api/errors'
import { useOrganizations, type Organization } from '@/lib/api/org'
import type { Role } from '@/lib/api/types'
import {
  useChangeRole,
  useCreateUser,
  useRefreshUsers,
  useSetUserStatus,
  useUsers,
  type UserAccount,
} from '@/lib/api/users'
import { ORG_ASSIGNABLE_ROLES, ROLE_LABEL, roleLabel } from '@/lib/labels'

/**
 * Bảng người dùng + thêm / đổi vai trò / khóa, dùng chung cho hai trang:
 *  - `org`: ORG_ADMIN, chỉ thấy người cùng tổ chức, không gán được SYS_ADMIN, không động được SYS_ADMIN.
 *  - `system`: SYS_ADMIN, thấy mọi người, có cột Tổ chức, gán được mọi vai trò, chọn tổ chức khi thêm.
 * Mọi thao tác trên chính mình đều bị vô hiệu (backend cũng trả 403).
 */
export type UsersScope = 'org' | 'system'

const NO_ORG = 'NONE'
const SYSTEM_ROLES: Role[] = ['USER', 'ORG_ADMIN', 'SYS_ADMIN']

export function UsersManager({ scope, selfId, title }: { scope: UsersScope; selfId: string; title: string }) {
  const isSystem = scope === 'system'
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [lockTarget, setLockTarget] = useState<{ user: UserAccount; enable: boolean } | null>(null)

  const users = useUsers(page)
  const orgs = useOrganizations(isSystem)
  const changeRole = useChangeRole()
  const setStatus = useSetUserStatus()
  const refresh = useRefreshUsers()
  const busy = changeRole.isPending || setStatus.isPending
  const roles = isSystem ? SYSTEM_ROLES : ORG_ASSIGNABLE_ROLES

  const orgName = (id: string | null) => {
    if (!id) return 'Không thuộc tổ chức'
    // Có orgId nhưng không có trong danh mục (vd. dữ liệu cũ): hiện mã rút gọn để vẫn phân biệt được.
    return orgs.data?.find((o) => o.id === id)?.name ?? `Không có trong danh mục (${id.slice(0, 8)})`
  }

  /** 403 / 404: danh sách đã cũ (vai trò hoặc tổ chức của người đó đã đổi) nên tải lại. */
  function onActionError(e: unknown) {
    const err = toApiError(e)
    if (err.code === 'AUTH_FORBIDDEN') {
      toast.error('Bạn không có quyền thực hiện thao tác này.')
      void refresh()
    } else if (err.code === 'USER_NOT_FOUND') {
      toast.error('Không tìm thấy tài khoản này. Danh sách đã được tải lại.')
      void refresh()
    } else {
      toast.error(`Không thực hiện được: ${err.message}`)
    }
  }

  function onChangeRole(u: UserAccount, role: Role) {
    if (role === u.role) return
    changeRole.mutate(
      { id: u.id, role },
      {
        onSuccess: () => toast.success('Đã đổi vai trò. Có hiệu lực khi người đó đăng nhập lại.'),
        onError: onActionError,
      },
    )
  }

  function confirmLock() {
    if (!lockTarget) return
    const { user: u, enable } = lockTarget
    setStatus.mutate(
      { id: u.id, enabled: enable },
      {
        onSuccess: () =>
          toast.success(enable ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản. Người này bị đăng xuất khỏi mọi phiên.'),
        onError: onActionError,
        onSettled: () => setLockTarget(null),
      },
    )
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button onClick={() => setAddOpen(true)}>{isSystem ? 'Thêm người dùng' : 'Thêm nhân viên'}</Button>
      </div>

      <PagedTable
        query={users}
        page={page}
        onPage={setPage}
        emptyText={isSystem ? 'Chưa có người dùng nào.' : 'Chưa có nhân viên nào.'}
        errorLabel={isSystem ? 'Không tải được danh sách người dùng' : 'Không tải được danh sách nhân viên'}
        header={
          <TableRow>
            {/* Phạm vi system có thêm cột Tổ chức: gộp Tên + Email vào một ô để vừa 1024px */}
            {isSystem ? (
              <>
                <TableHead>Người dùng</TableHead>
                <TableHead>Tổ chức</TableHead>
              </>
            ) : (
              <>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
              </>
            )}
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thao tác</TableHead>
          </TableRow>
        }
        row={(u: UserAccount) => {
          const isSelf = u.id === selfId
          const untouchable = !isSystem && u.role === 'SYS_ADMIN'
          const locked = isSelf
            ? 'Không thể thao tác trên chính tài khoản của bạn.'
            : untouchable
              ? 'Quản lý tổ chức không được thao tác trên tài khoản quản trị hệ thống.'
              : undefined
          const who = u.name || u.email
          return (
            <TableRow key={u.id}>
              {isSystem ? (
                <>
                  <TableCell className="whitespace-normal [overflow-wrap:anywhere]">
                    <div>{u.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className={`whitespace-normal ${u.orgId ? '' : 'text-muted-foreground'}`}>
                    {orgName(u.orgId)}
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>{u.name || '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                </>
              )}
              <TableCell>
                {locked ? (
                  <span title={locked}>{roleLabel(u.role)}</span>
                ) : (
                  <Select value={u.role} onValueChange={(r) => onChangeRole(u, r as Role)} disabled={busy}>
                    <SelectTrigger size="sm" className="w-40" aria-label={`Đổi vai trò của ${who}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{u.enabled ? 'Đang hoạt động' : 'Đã khóa'}</Badge>
              </TableCell>
              <TableCell>
                {/* disabled button không nhận hover nên đặt title ở phần tử bọc */}
                <span title={locked}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!!locked || busy}
                    onClick={() => setLockTarget({ user: u, enable: !u.enabled })}
                  >
                    {u.enabled ? 'Khóa' : 'Mở khóa'}
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          )
        }}
      />

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        scope={scope}
        roles={roles}
        organizations={(orgs.data ?? []).filter((o) => o.active)}
        orgsError={orgs.error?.message}
      />

      <Dialog open={lockTarget !== null} onOpenChange={(o) => !o && !setStatus.isPending && setLockTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{lockTarget?.enable ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}</DialogTitle>
            <DialogDescription>
              {lockTarget?.enable
                ? `${lockTarget.user.name || lockTarget.user.email} sẽ đăng nhập lại được.`
                : `${lockTarget?.user.name || lockTarget?.user.email} sẽ bị đăng xuất khỏi mọi phiên và không đăng nhập được cho tới khi mở khóa.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockTarget(null)} disabled={setStatus.isPending}>
              Giữ nguyên
            </Button>
            <Button
              variant={lockTarget?.enable ? 'default' : 'destructive'}
              onClick={confirmLock}
              disabled={setStatus.isPending}
            >
              {setStatus.isPending ? 'Đang xử lý…' : lockTarget?.enable ? 'Mở khóa' : 'Khóa tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Thêm người dùng ----------

type FieldName = 'email' | 'name' | 'password' | 'role' | 'orgId'

/** Mật khẩu: 8–200 ký tự và tối đa 72 byte UTF-8 (giới hạn của bcrypt phía backend). */
function checkPassword(pw: string) {
  if (pw.length < 8 || pw.length > 200) return 'Mật khẩu từ 8 đến 200 ký tự.'
  if (new TextEncoder().encode(pw).length > 72) {
    return 'Mật khẩu tối đa 72 byte; ký tự có dấu chiếm nhiều byte hơn chữ thường, hãy rút ngắn.'
  }
  return null
}

function AddUserDialog({
  open,
  onOpenChange,
  scope,
  roles,
  organizations,
  orgsError,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: UsersScope
  roles: Role[]
  /** chỉ tổ chức đang hoạt động (chỉ dùng ở phạm vi system) */
  organizations: Organization[]
  orgsError?: string
}) {
  const isSystem = scope === 'system'
  const create = useCreateUser()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('USER')
  const [orgId, setOrgId] = useState(NO_ORG)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)

  function reset() {
    setEmail('')
    setName('')
    setPassword('')
    setRole('USER')
    setOrgId(NO_ORG)
    setErrors({})
    setGeneral(null)
    create.reset()
  }

  function close(next: boolean) {
    if (create.isPending) return
    if (!next) reset()
    onOpenChange(next)
  }

  // Quản lý tổ chức phải thuộc một tổ chức: báo ngay khi chọn, không đợi gửi.
  const orgRequired = isSystem && role === 'ORG_ADMIN' && orgId === NO_ORG
  const orgMessage = 'Quản lý tổ chức cần thuộc một tổ chức.'

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const local: Partial<Record<FieldName, string>> = {}
    if (!/^\S+@\S+$/.test(email.trim())) local.email = 'Nhập địa chỉ email hợp lệ.'
    const pwError = checkPassword(password)
    if (pwError) local.password = pwError
    if (orgRequired) local.orgId = orgMessage
    setErrors(local)
    setGeneral(null)
    if (Object.keys(local).length > 0) return

    create.mutate(
      {
        email: email.trim(),
        password,
        role,
        ...(name.trim() ? { name: name.trim() } : {}),
        // ORG_ADMIN: backend tự gán tổ chức của họ nên không gửi orgId
        ...(isSystem ? { orgId: orgId === NO_ORG ? null : orgId } : {}),
      },
      {
        onSuccess: () => {
          toast.success(isSystem ? 'Đã thêm người dùng.' : 'Đã thêm nhân viên.')
          reset()
          onOpenChange(false)
        },
        onError: (err) => {
          const apiErr = toApiError(err)
          if (apiErr.code === 'USER_EMAIL_TAKEN') {
            setErrors({ email: 'Email này đã có tài khoản.' })
          } else if (apiErr.code === 'VALIDATION_FAILED' && Object.keys(apiErr.fieldErrors).length > 0) {
            const mapped: Partial<Record<FieldName, string>> = {}
            let rest: string | null = null
            for (const [field, message] of Object.entries(apiErr.fieldErrors)) {
              const key = field.split('.').pop() as FieldName
              if (key === 'email' || key === 'name' || key === 'password' || key === 'role' || key === 'orgId') {
                mapped[key] = message
              } else rest = `${key}: ${message}`
            }
            setErrors(mapped)
            setGeneral(rest)
          } else {
            setGeneral(apiErr.message)
          }
        },
      },
    )
  }

  const fieldClass = 'space-y-1.5'
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showCloseButton={false}>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{isSystem ? 'Thêm người dùng' : 'Thêm nhân viên'}</DialogTitle>
            <DialogDescription>
              {isSystem ? 'Tạo tài khoản mới, có thể gán vào một tổ chức.' : 'Tài khoản mới thuộc tổ chức của bạn.'}
            </DialogDescription>
          </DialogHeader>

          <div className={fieldClass}>
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'new-email-error' : undefined}
            />
            {errors.email && (
              <p id="new-email-error" role="alert" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className={fieldClass}>
            <Label htmlFor="new-name">Họ tên (không bắt buộc)</Label>
            <Input
              id="new-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className={fieldClass}>
            <Label htmlFor="new-password">Mật khẩu</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby="new-password-hint"
            />
            <p id="new-password-hint" className="text-xs text-muted-foreground">
              8–200 ký tự, tối đa 72 byte.
            </p>
            {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className={fieldClass}>
            <Label htmlFor="new-role">Vai trò</Label>
            <Select value={role} onValueChange={(r) => setRole(r as Role)}>
              <SelectTrigger id="new-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p role="alert" className="text-sm text-destructive">{errors.role}</p>}
          </div>

          {isSystem && (
            <div className={fieldClass}>
              <Label htmlFor="new-org">Tổ chức</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger id="new-org" className="w-full" aria-invalid={orgRequired || !!errors.orgId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ORG}>Không thuộc tổ chức</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgsError && (
                <p role="alert" className="text-sm text-destructive">
                  Không tải được danh sách tổ chức: {orgsError}
                </p>
              )}
              {(orgRequired || errors.orgId) && (
                <p role="alert" className="text-sm text-destructive">
                  {orgRequired ? orgMessage : errors.orgId}
                </p>
              )}
            </div>
          )}

          {general && (
            <p role="alert" className="text-sm text-destructive">
              Không thêm được: {general}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={create.isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={create.isPending || orgRequired}>
              {create.isPending ? 'Đang thêm…' : isSystem ? 'Thêm người dùng' : 'Thêm nhân viên'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
