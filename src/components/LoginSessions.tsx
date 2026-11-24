import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { request } from '@/lib/api/client'
import { useAuth } from '@/auth/context'
import { formatDateTime } from '@/lib/time'
import type { Paged } from '@/lib/api/alerts'

interface LoginSession {
  id: string
  deviceId: string | null
  createdAt: string
  expiresAt: string
}

export function LoginSessions() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const [page, setPage] = useState(0)
  const key = ['login-sessions', user?.id]
  const sessions = useQuery({
    queryKey: [...key, page],
    queryFn: () => request<Paged<LoginSession>>({ url: '/auth/sessions', params: { page, size: 10 } }),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => request<void>({ method: 'DELETE', url: '/auth/sessions/' + id }),
    onSuccess: async () => {
      setPage(0)
      await cache.invalidateQueries({ queryKey: key })
    },
  })

  return <section aria-label="Phiên đăng nhập" className="max-w-3xl space-y-3 rounded-xl border bg-card p-5">
    <h2 className="font-semibold">Phiên đăng nhập</h2>
    {sessions.isPending && <p role="status">Đang tải các phiên…</p>}
    {sessions.isError && <p role="alert">Không tải được danh sách phiên.</p>}
    {sessions.data && !sessions.data.items.length && <p>Không có phiên đang hoạt động trên trang này.</p>}
    <ul className="divide-y">
      {sessions.data?.items.map(session => <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div><span className="font-medium">{session.deviceId || 'Thiết bị chưa đặt tên'}</span>
          <p className="text-sm text-muted-foreground">Đăng nhập lúc {formatDateTime(session.createdAt)}</p></div>
        <Button variant="outline" disabled={revoke.isPending} onClick={() => {
          if (window.confirm('Đăng xuất phiên đã chọn? Nếu đây là phiên hiện tại, bạn sẽ cần đăng nhập lại.')) revoke.mutate(session.id)
        }}>Đăng xuất phiên</Button>
      </li>)}
    </ul>
    {revoke.isError && <p role="alert">Thu hồi phiên thất bại. Vui lòng thử lại.</p>}
    {revoke.isSuccess && <p role="status">Đã thu hồi phiên.</p>}
    {(page > 0 || (sessions.data?.total ?? 0) > 10) && <div className="flex gap-2">
      <Button variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>Trang trước</Button>
      <Button variant="outline" disabled={(page + 1) * 10 >= (sessions.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Trang sau</Button>
    </div>}
  </section>
}
