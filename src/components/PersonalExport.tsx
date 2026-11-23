import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { request } from '@/lib/api/client'
import type { ConfigDetails } from '@/lib/api/config'
import type { Paged } from '@/lib/api/alerts'
import { tokenStore } from '@/lib/api/tokenStore'
import { lastDays, vnDate } from '@/lib/time'

export function PersonalExport({ owner }: { owner: string }) {
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [owner])
  const job = useMutation({
    mutationFn: async () => {
      active.current?.abort()
      const controller = new AbortController()
      active.current = controller
      const period = lastDays(7)
      function checkOwner() {
        controller.signal.throwIfAborted()
        if (tokenStore.getUser()?.id !== owner) throw new Error('Phiên đăng nhập đã thay đổi.')
      }
      async function read<T>(url: string, params?: Record<string, string | number>) {
        checkOwner()
        const data = await request<T>({ url, params, signal: controller.signal })
        checkOwner()
        return data
      }
      async function history(url: string) {
        const items: unknown[] = []
        let total: number | undefined
        for (let page = 0; ; page++) {
          const result = await read<Paged<unknown>>(url, { ...period, page, size: 100 })
          total ??= result.total
          if (result.page !== page || total !== result.total) throw new Error('Lịch sử vừa thay đổi. Hãy thử lại.')
          items.push(...result.items)
          if (items.length === total) return items
          if (!result.items.length || items.length > total) throw new Error('Thiếu dữ liệu của một trang lịch sử.')
        }
      }
      const profile = await read<{ id: string }>('/auth/me')
      if (profile.id !== owner) throw new Error('Phiên đăng nhập đã thay đổi.')
      const settings = await read<ConfigDetails>('/config/me/details')
      const alerts = await history('/alerts/me')
      const sessions = await history('/alerts/me/sessions')
      const daily = await read('/stats/me/timeseries', { ...period, bucket: 'day' })
      checkOwner()
      const contents = { version: 1, period, profile, settings: settings.personal, alerts, sessions, daily }
      const link = document.createElement('a')
      const url = URL.createObjectURL(new Blob([JSON.stringify(contents)], { type: 'application/json' }))
      try {
        link.href = url
        link.download = 'du-lieu-ca-nhan-' + vnDate(new Date()) + '.json'
        document.body.appendChild(link)
        link.click()
      } finally {
        link.remove()
        URL.revokeObjectURL(url)
      }
    },
  })
  return (
    <section aria-label="Xuất dữ liệu cá nhân" className="max-w-3xl space-y-3 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Xuất dữ liệu cá nhân</h2>
      <p className="text-sm text-muted-foreground">Tải hồ sơ, cấu hình cá nhân, cảnh báo, phiên theo dõi và thống kê 7 ngày gần nhất dưới dạng JSON.</p>
      <Button onClick={() => job.mutate()} disabled={job.isPending}>{job.isPending ? 'Đang chuẩn bị tệp…' : 'Tải dữ liệu của tôi'}</Button>
      {job.isError && <p role="alert">{job.error.message}</p>}
      {job.isSuccess && <p role="status">Đã gửi tệp đến trình duyệt để tải xuống.</p>}
    </section>
  )
}
