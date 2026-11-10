import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Monitor, ChartNoAxesCombined } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/context'
import { PlumbLine } from '@/components/PlumbLine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, toApiError } from '@/lib/api/errors'

export function LoginPage() {
  const { status, login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (error) (formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? errorRef.current)?.focus()
  }, [error])

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (f: string) => error?.fieldErrors[f]
  const formError =
    error?.code === 'AUTH_INVALID_CREDENTIALS'
      ? // Backend dùng chung mã này cho sai mật khẩu, tài khoản bị khóa và tổ chức tạm ngưng nên không nói chắc được.
        'Email hoặc mật khẩu không đúng. Nếu bạn chắc đã nhập đúng, tài khoản có thể đã bị khóa hoặc tổ chức đang tạm ngưng.'
      : error && (error.status === 0 || error.status === 502 || error.status === 504)
        ? 'Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.'
        : error && Object.keys(error.fieldErrors).length === 0
        ? error.message
        : null

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10 sm:px-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border bg-background md:grid-cols-2">
        <section className="flex flex-col justify-between gap-10 border-b bg-accent/40 p-6 sm:p-10 md:border-r md:border-b-0">
        <div className="flex items-center gap-3">
          <PlumbLine state="GOOD" size={44} />
          <div>
            <p className="text-lg font-semibold">Giám sát tư thế</p>
            <p className="text-xs text-muted-foreground">Đồng hành cùng ngày làm việc</p>
          </div>
        </div>
        <div className="hidden space-y-6 md:block">
          <h2 className="text-2xl font-semibold leading-relaxed">Hiểu thói quen ngồi.<br />Chăm sóc tư thế mỗi ngày.</h2>
          <div className="flex gap-3 text-sm"><Monitor className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><p><strong className="font-medium">Theo dõi trên desktop</strong><span className="mt-1 block text-muted-foreground">Chọn camera, hiệu chỉnh và nhận nhắc nhở khi ngồi sai.</span></p></div>
          <div className="flex gap-3 text-sm"><ChartNoAxesCombined className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><p><strong className="font-medium">Xem lại trên web</strong><span className="mt-1 block text-muted-foreground">Theo dõi điểm tư thế, thói quen và lịch sử cảnh báo.</span></p></div>
        </div>
        <p className="hidden text-xs text-muted-foreground md:block">Dùng cùng tài khoản trên web và ứng dụng desktop.</p>
        </section>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-5 p-6 sm:p-10" aria-busy={submitting}>
          <div className="space-y-2 pb-2">
            <h1 className="text-2xl font-semibold">Đăng nhập</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">Xem lại thói quen ngồi và những thay đổi của bạn theo thời gian.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="h-11"
              placeholder="ban@congty.vn"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldError('email')}
              aria-describedby={fieldError('email') ? 'email-error' : undefined}
            />
            {fieldError('email') && <p id="email-error" role="alert" className="text-sm text-destructive">{fieldError('email')}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="h-11 pr-12"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldError('password')}
              aria-describedby={fieldError('password') ? 'password-error' : undefined}
            />
            <Button type="button" variant="ghost" className="absolute top-0 right-0 size-11" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</Button>
            </div>
            {fieldError('password') && <p id="password-error" role="alert" className="text-sm text-destructive">{fieldError('password')}</p>}
          </div>

          {notice && !formError && (
            <p role="alert" className="text-sm text-destructive">
              {notice}
            </p>
          )}

          {formError && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="min-h-11 w-full">
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">Chưa có tài khoản? Liên hệ người quản lý tổ chức để được cấp quyền truy cập.</p>
        </form>
      </div>
    </main>
  )
}
