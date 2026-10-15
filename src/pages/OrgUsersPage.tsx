import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { PagedTable } from '@/components/PagedTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { ApiError, toApiError } from '@/lib/api/errors'
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

export function OrgUsersPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Nhân viên" />
  return <OrgUsers selfId={user.id} />
}

function OrgUsers({ selfId }: { selfId: string }) {
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [lockTarget, setLockTarget] = useState<{ user: UserAccount; enable: boolean } | null>(null)

  const users = useUsers(page)
  const changeRole = useChangeRole()
  const setStatus = useSetUserStatus()
  const refresh = useRefreshUsers()
  const busy = changeRole.isPending || setStatus.isPending

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
        <h1 className="text-2xl font-semibold">Nhân viên</h1>
        <Button onClick={() => setAddOpen(true)}>Thêm nhân viên</Button>
      </div>

      <PagedTable
        query={users}
        page={page}
        onPage={setPage}
        emptyText="Chưa có nhân viên nào."
        errorLabel="Không tải được danh sách nhân viên"
        header={
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thao tác</TableHead>
          </TableRow>
        }
        row={(u: UserAccount) => {
          const isSelf = u.id === selfId
          const isSysAdmin = u.role === 'SYS_ADMIN'
          const locked = isSelf
            ? 'Không thể thao tác trên chính tài khoản của bạn.'
            : isSysAdmin
              ? 'Quản lý tổ chức không được thao tác trên tài khoản quản trị hệ thống.'
              : undefined
          const who = u.name || u.email
          return (
            <TableRow key={u.id}>
              <TableCell>{u.name || '—'}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                {locked ? (
                  <span title={locked}>{roleLabel(u.role)}</span>
                ) : (
                  <Select value={u.role} onValueChange={(r) => onChangeRole(u, r as Role)} disabled={busy}>
                    <SelectTrigger size="sm" className="w-40" aria-label={`Đổi vai trò của ${who}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_ASSIGNABLE_ROLES.map((r) => (
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

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />

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

// ---------- Thêm nhân viên ----------

type FieldName = 'email' | 'name' | 'password' | 'role'

/** Mật khẩu: 8–200 ký tự và tối đa 72 byte UTF-8 (giới hạn của bcrypt phía backend). */
function checkPassword(pw: string) {
  if (pw.length < 8 || pw.length > 200) return 'Mật khẩu từ 8 đến 200 ký tự.'
  if (new TextEncoder().encode(pw).length > 72) {
    return 'Mật khẩu tối đa 72 byte; ký tự có dấu chiếm nhiều byte hơn chữ thường, hãy rút ngắn.'
  }
  return null
}

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateUser()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('USER')
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [general, setGeneral] = useState<string | null>(null)

  function reset() {
    setEmail('')
    setName('')
    setPassword('')
    setRole('USER')
    setErrors({})
    setGeneral(null)
    create.reset()
  }

  function close(next: boolean) {
    if (create.isPending) return
    if (!next) reset()
    onOpenChange(next)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const local: Partial<Record<FieldName, string>> = {}
    if (!/^\S+@\S+$/.test(email.trim())) local.email = 'Nhập địa chỉ email hợp lệ.'
    const pwError = checkPassword(password)
    if (pwError) local.password = pwError
    setErrors(local)
    setGeneral(null)
    if (Object.keys(local).length > 0) return

    create.mutate(
      { email: email.trim(), password, role, ...(name.trim() ? { name: name.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success('Đã thêm nhân viên.')
          reset()
          onOpenChange(false)
        },
        onError: (err) => {
          const apiErr = toApiError(err)
          if (apiErr instanceof ApiError && apiErr.code === 'USER_EMAIL_TAKEN') {
            setErrors({ email: 'Email này đã có tài khoản.' })
          } else if (apiErr.code === 'VALIDATION_FAILED' && Object.keys(apiErr.fieldErrors).length > 0) {
            const mapped: Partial<Record<FieldName, string>> = {}
            let rest: string | null = null
            for (const [field, message] of Object.entries(apiErr.fieldErrors)) {
              const key = field.split('.').pop() as FieldName
              if (key === 'email' || key === 'name' || key === 'password' || key === 'role') mapped[key] = message
              else rest = `${key}: ${message}`
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
            <DialogTitle>Thêm nhân viên</DialogTitle>
            <DialogDescription>Tài khoản mới thuộc tổ chức của bạn.</DialogDescription>
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
                {ORG_ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p role="alert" className="text-sm text-destructive">{errors.role}</p>}
          </div>

          {general && (
            <p role="alert" className="text-sm text-destructive">
              Không thêm được: {general}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={create.isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Đang thêm…' : 'Thêm nhân viên'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
