import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/context'
import { PlumbLine } from '@/components/PlumbLine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, toApiError } from '@/lib/api/errors'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      ? 'Email hoặc mật khẩu không đúng'
      : error && (error.status === 0 || error.status === 502 || error.status === 504)
        ? 'Không kết nối được máy chủ. Kiểm tra backend hoặc mock_server.py đang chạy.'
        : error && Object.keys(error.fieldErrors).length === 0
        ? error.message
        : null

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <PlumbLine state="GOOD" size={44} />
          <div>
            <h1 className="text-xl font-semibold">Giám sát tư thế</h1>
            <p className="text-sm text-muted-foreground">Đăng nhập để xem thói quen ngồi của bạn</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-background p-6" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldError('email')}
            />
            {fieldError('email') && <p className="text-sm text-destructive">{fieldError('email')}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldError('password')}
            />
            {fieldError('password') && <p className="text-sm text-destructive">{fieldError('password')}</p>}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </div>
  )
}
