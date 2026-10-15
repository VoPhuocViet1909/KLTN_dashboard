import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { NoOrgNotice } from '@/components/NoOrgNotice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toApiError } from '@/lib/api/errors'
import {
  useCreateDepartment,
  useDepartments,
  useOrganization,
  useSetDepartmentStatus,
  type Department,
} from '@/lib/api/org'

const NAME_MAX = 160

export function OrgDepartmentsPage() {
  const { user } = useAuth()
  if (!user?.orgId) return <NoOrgNotice title="Phòng ban" />
  return <OrgDepartments orgId={user.orgId} />
}

function OrgDepartments({ orgId }: { orgId: string }) {
  const org = useOrganization(orgId)
  const departments = useDepartments(orgId)
  const create = useCreateDepartment(orgId)
  const setStatus = useSetDepartmentStatus(orgId)

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [stopTarget, setStopTarget] = useState<Department | null>(null)

  // Đang dùng trước, sau đó theo tên (có dấu tiếng Việt).
  const rows = useMemo(
    () =>
      [...(departments.data ?? [])].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'vi'),
      ),
    [departments.data],
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (value.length === 0) return setNameError('Nhập tên phòng ban.')
    if (value.length > NAME_MAX) return setNameError(`Tên phòng ban tối đa ${NAME_MAX} ký tự.`)
    setNameError(null)
    create.mutate(value, {
      onSuccess: () => {
        setName('')
        toast.success('Đã thêm phòng ban.')
      },
      onError: (e) => {
        const err = toApiError(e)
        if (err.code === 'NAME_TAKEN') setNameError('Đã có phòng ban tên này.')
        else if (err.code === 'ORGANIZATION_INACTIVE') {
          setNameError('Tổ chức đang ngừng hoạt động, không thêm được phòng ban.')
        } else if (err.code === 'VALIDATION_FAILED' && err.fieldErrors.name) {
          setNameError(`Tên phòng ban không hợp lệ (${err.fieldErrors.name}).`)
        } else setNameError(err.message)
      },
    })
  }

  function changeStatus(d: Department, active: boolean) {
    setStatus.mutate(
      { id: d.id, active },
      {
        onSuccess: () => toast.success(active ? 'Đã dùng lại phòng ban.' : 'Đã ngừng dùng phòng ban.'),
        onError: (e) => {
          const err = toApiError(e)
          toast.error(`Không đổi được trạng thái: ${err.message}`)
          void departments.refetch()
        },
        onSettled: () => setStopTarget(null),
      },
    )
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Phòng ban</h1>
        <p className="text-sm text-muted-foreground">
          {org.isPending ? 'Đang tải…' : (org.data?.name ?? 'Không tải được tên tổ chức')}
          {org.data && !org.data.active && ' · đang ngừng hoạt động'}
        </p>
        <p className="text-xs text-muted-foreground">Hiện chưa gán được nhân viên vào phòng ban.</p>
      </div>

      <section className="rounded-xl border bg-background">
        <form onSubmit={onSubmit} noValidate className="space-y-1.5 border-b p-4">
          <Label htmlFor="new-department">Tên phòng ban mới</Label>
          <div className="flex flex-wrap items-start gap-2">
            <Input
              id="new-department"
              className="max-w-sm"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError(null)
              }}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'new-department-error' : undefined}
              autoComplete="off"
            />
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Đang thêm…' : 'Thêm phòng ban'}
            </Button>
          </div>
          {nameError && (
            <p id="new-department-error" role="alert" className="text-sm text-destructive">
              {nameError}
            </p>
          )}
        </form>

        {departments.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : departments.error ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            Không tải được danh sách phòng ban: {departments.error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 py-10 text-center text-sm text-muted-foreground">Chưa có phòng ban nào.</p>
        ) : (
          <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className={d.active ? '' : 'text-muted-foreground'}>{d.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.active ? 'Đang dùng' : 'Ngừng dùng'}</Badge>
                  </TableCell>
                  <TableCell>
                    {d.active ? (
                      <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStopTarget(d)}>
                        Ngừng dùng
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setStatus.isPending}
                        onClick={() => changeStatus(d, true)}
                      >
                        Dùng lại
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={stopTarget !== null} onOpenChange={(o) => !o && !setStatus.isPending && setStopTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Ngừng dùng phòng ban?</DialogTitle>
            <DialogDescription>
              {stopTarget?.name} sẽ chuyển sang "Ngừng dùng". Bạn có thể dùng lại bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopTarget(null)} disabled={setStatus.isPending}>
              Giữ nguyên
            </Button>
            <Button
              variant="destructive"
              onClick={() => stopTarget && changeStatus(stopTarget, false)}
              disabled={setStatus.isPending}
            >
              {setStatus.isPending ? 'Đang xử lý…' : 'Ngừng dùng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
