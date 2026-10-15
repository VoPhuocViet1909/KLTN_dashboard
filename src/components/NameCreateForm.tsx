import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const NAME_MAX = 160

/**
 * Ô nhập tên + nút thêm, đặt ngay trên bảng (Phòng ban, Tổ chức). Kiểm 1–160 ký tự ở client rồi gọi `onSubmit`;
 * `onSubmit` trả thông báo lỗi (hiện dưới ô) hoặc null khi thành công (ô được xóa).
 */
export function NameCreateForm({
  id,
  label,
  noun,
  submitLabel,
  onSubmit,
}: {
  id: string
  label: string
  /** "phòng ban", "tổ chức": dùng trong câu báo lỗi */
  noun: string
  submitLabel: string
  onSubmit: (name: string) => Promise<string | null>
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (value.length === 0) return setError(`Nhập tên ${noun}.`)
    if (value.length > NAME_MAX) return setError(`Tên ${noun} tối đa ${NAME_MAX} ký tự.`)
    setError(null)
    setPending(true)
    try {
      const failure = await onSubmit(value)
      if (failure === null) setName('')
      else setError(failure)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-1.5 border-b p-4">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-start gap-2">
        <Input
          id={id}
          className="max-w-sm"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang thêm…' : submitLabel}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
