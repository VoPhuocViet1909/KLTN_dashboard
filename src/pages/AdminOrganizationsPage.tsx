import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { NameCreateForm } from '@/components/NameCreateForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toApiError } from '@/lib/api/errors'
import {
  useCreateOrganization,
  useDepartmentCounts,
  useOrganizations,
  useSetOrganizationStatus,
  type Organization,
} from '@/lib/api/org'

/** Danh mục tổ chức (SYS_ADMIN): thêm, tạm ngưng / bật lại, số phòng ban. */
export function AdminOrganizationsPage() {
  const organizations = useOrganizations()
  const create = useCreateOrganization()
  const setStatus = useSetOrganizationStatus()
  const [stopTarget, setStopTarget] = useState<Organization | null>(null)

  // Đang hoạt động trước, sau đó theo tên (có dấu tiếng Việt).
  const rows = useMemo(
    () =>
      [...(organizations.data ?? [])].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'vi'),
      ),
    [organizations.data],
  )
  const counts = useDepartmentCounts(rows.map((o) => o.id))

  async function addOrganization(name: string): Promise<string | null> {
    try {
      await create.mutateAsync(name)
      toast.success('Đã thêm tổ chức.')
      return null
    } catch (e) {
      const err = toApiError(e)
      if (err.code === 'NAME_TAKEN') return 'Đã có tổ chức tên này.'
      if (err.code === 'VALIDATION_FAILED' && err.fieldErrors.name) {
        return `Tên tổ chức không hợp lệ (${err.fieldErrors.name}).`
      }
      return err.message
    }
  }

  function changeStatus(o: Organization, active: boolean) {
    setStatus.mutate(
      { id: o.id, active },
      {
        onSuccess: () => toast.success(active ? 'Đã bật lại tổ chức.' : 'Đã tạm ngưng tổ chức.'),
        onError: (e) => {
          toast.error(`Không đổi được trạng thái: ${toApiError(e).message}`)
          void organizations.refetch()
        },
        onSettled: () => setStopTarget(null),
      },
    )
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Tổ chức</h1>
        <p className="text-sm text-muted-foreground">Danh mục tổ chức của toàn hệ thống.</p>
      </div>

      <section className="rounded-xl border bg-background">
        <NameCreateForm
          id="new-organization"
          label="Tên tổ chức mới"
          noun="tổ chức"
          submitLabel="Thêm tổ chức"
          onSubmit={addOrganization}
        />

        {organizations.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : organizations.error ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            Không tải được danh sách tổ chức: {organizations.error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 py-10 text-center text-sm text-muted-foreground">Chưa có tổ chức nào.</p>
        ) : (
          <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Số phòng ban</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o, i) => {
                const count = counts[i]
                return (
                  <TableRow key={o.id}>
                    <TableCell className={o.active ? '' : 'text-muted-foreground'}>{o.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{o.active ? 'Đang hoạt động' : 'Tạm ngưng'}</Badge>
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {count?.isPending ? '…' : count?.error ? '—' : count?.data}
                    </TableCell>
                    <TableCell>
                      {o.active ? (
                        <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStopTarget(o)}>
                          Tạm ngưng
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={setStatus.isPending}
                          onClick={() => changeStatus(o, true)}
                        >
                          Bật lại
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={stopTarget !== null} onOpenChange={(o) => !o && !setStatus.isPending && setStopTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Tạm ngưng tổ chức?</DialogTitle>
            <DialogDescription>
              Thành viên của {stopTarget?.name} sẽ không đăng nhập, làm mới phiên, gọi API hay nhận dữ liệu realtime được; ai
              đang đăng nhập sẽ bị đưa về trang đăng nhập ở thao tác tiếp theo. Quản trị hệ thống không bị ảnh hưởng, camera
              đang mở chưa bị ngắt. Bật lại thì dùng lại được, dữ liệu vẫn nguyên.
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
              {setStatus.isPending ? 'Đang xử lý…' : 'Tạm ngưng tổ chức'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
