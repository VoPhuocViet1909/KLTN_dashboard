import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import type { ConfigValues } from '@/lib/api/config'
import { toApiError } from '@/lib/api/errors'
import { buildBody, changedKeys, clearedBody, draftFromServer, stableKey, validateDraft, type Draft } from '@/lib/configForm'
import { CONFIG_FIELDS, FIELD_BY_KEY, GROUPS, type ConfigField } from '@/lib/configFields'

export interface ConfigEditorProps {
  title: string
  subtitle: string
  /** kết quả GET: cấu hình đang lưu (cá nhân: đã gộp; tổ chức: đúng khóa tổ chức) */
  query: { data: ConfigValues | undefined; error: Error | null; isPending: boolean }
  /** mutation PUT thay toàn bộ */
  save: { mutate: (body: ConfigValues, options: { onSuccess: () => void; onError: (e: unknown) => void }) => void; isPending: boolean }
  /** khóa riêng máy không hiện nhưng phải gửi lại (cá nhân: hiệu chỉnh camera; tổ chức: không có) */
  preserveKeys: readonly string[]
  savedMessage: string
  clearedMessage: string
  clearDescription: string
  /** thêm vào thông báo chung khi backend trả 400 VALIDATION_FAILED (vd. xung đột sau khi gộp) */
  validationHint?: string
}

/**
 * Form cấu hình dùng chung cho Cấu hình cá nhân và Cấu hình tổ chức.
 * Mỗi ô: "Mặc định" (không gửi) hoặc "Tùy chỉnh" (gửi); khóa có trong GET coi là Tùy chỉnh.
 */
export function ConfigEditor({
  title,
  subtitle,
  query,
  save,
  preserveKeys,
  savedMessage,
  clearedMessage,
  clearDescription,
  validationHint,
}: ConfigEditorProps) {
  const server = query.data

  const baseline = useMemo(() => draftFromServer(server), [server])
  const serverKey = useMemo(() => stableKey(server), [server])

  // draft = null: form theo đúng server. Có draft: người dùng đang sửa; `draftBase` là bản server lúc bắt đầu sửa.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftBase, setDraftBase] = useState('')
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const current = draft ?? baseline
  const changes = draft ? changedKeys(draft, baseline) : []
  const dirty = changes.length > 0
  const conflict = draft !== null && draftBase !== serverKey
  const clientErrors = useMemo(() => validateDraft(current), [current])
  const errors = { ...serverErrors, ...clientErrors }
  const hasErrors = Object.keys(clientErrors).length > 0
  const hasCustom = Object.keys(current).length > 0 || Object.keys(baseline).length > 0

  // Rời trang khi còn thay đổi chưa lưu: hỏi xác nhận (đổi trang trong app + đóng/tải lại tab).
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function edit(key: string, value: string | boolean) {
    if (draft === null) setDraftBase(serverKey)
    setDraft({ ...current, [key]: value })
    setServerErrors(({ [key]: _gone, ...rest }) => rest)
    setFormError(null)
  }

  function resetField(key: string) {
    if (draft === null) setDraftBase(serverKey)
    const { [key]: _gone, ...rest } = current
    setDraft(rest)
    setServerErrors(({ [key]: _g, ...r }) => r)
    setFormError(null)
  }

  function discard() {
    setDraft(null)
    setServerErrors({})
    setFormError(null)
  }

  function send(body: ConfigValues, done: string) {
    setFormError(null)
    save.mutate(body, {
      onSuccess: () => {
        discard()
        setConfirmClear(false)
        toast.success(done)
      },
      onError: (e) => {
        setConfirmClear(false)
        const err = toApiError(e)
        const mapped: Record<string, string> = {}
        let general: string | null = null
        if (err.code === 'VALIDATION_FAILED' && Object.keys(err.fieldErrors).length > 0) {
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            const key = field.split('.').pop() ?? field
            if (key in FIELD_BY_KEY) mapped[key] = message
            else general = `${key}: ${message}`
          }
        } else {
          general = err.message
        }
        setServerErrors(mapped)
        const fallback = Object.keys(mapped).length ? 'Máy chủ không nhận một số giá trị. Xem các ô báo lỗi.' : null
        const isValidation = err.code === 'VALIDATION_FAILED'
        setFormError(
          isValidation && validationHint
            ? `${validationHint}${general ? ` (${general})` : ''}`
            : (general ?? fallback),
        )
      },
    })
  }

  const onSave = () => {
    if (!hasErrors) send(buildBody(current, server, preserveKeys), savedMessage)
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-lg space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" size="sm" disabled={!hasCustom || save.isPending} onClick={() => setConfirmClear(true)}>
          Xóa mọi tùy chỉnh
        </Button>
      </div>

      {conflict && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 text-sm">
          <span>Cấu hình vừa được đổi ở nơi khác. Các thay đổi chưa lưu của bạn chưa bị ghi đè.</span>
          <Button variant="outline" size="sm" onClick={discard}>
            Dùng giá trị mới
          </Button>
        </div>
      )}

      {query.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : query.error ? (
        <div className="rounded-xl border bg-background p-6">
          <p role="alert" className="text-sm text-destructive">
            Không tải được cấu hình: {query.error.message}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const fields = CONFIG_FIELDS.filter((f) => f.group === group.id)
            const isAdvanced = group.id === 'advanced'
            const advancedHasIssue = fields.some((f) => errors[f.key])
            const open = !isAdvanced || advancedOpen || advancedHasIssue
            return (
              <section key={group.id} className="rounded-xl border bg-background p-6">
                {isAdvanced ? (
                  <div className="space-y-1">
                    <h2 className="font-medium">
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-expanded={open}
                        aria-controls="settings-advanced"
                        onClick={() => setAdvancedOpen((v) => !v)}
                      >
                        {group.title}
                        <ChevronDown
                          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>
                    </h2>
                    {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h2 className="font-medium">{group.title}</h2>
                    {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                  </div>
                )}
                {open && (
                  <div id={isAdvanced ? 'settings-advanced' : undefined} className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {fields.map((f) => (
                      <Field
                        key={f.key}
                        field={f}
                        value={current[f.key]}
                        error={errors[f.key]}
                        onChange={(v) => edit(f.key, v)}
                        onReset={() => resetField(f.key)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3 pl-5">
          <div className="min-w-0 text-sm" aria-live="polite">
            <span className="tabular font-medium">Có {changes.length} thay đổi chưa lưu</span>
            {hasErrors && <span className="ml-2 text-destructive">Sửa các ô báo lỗi trước khi lưu.</span>}
            {formError && (
              <p role="alert" className="text-destructive">
                Không lưu được: {formError}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={discard} disabled={save.isPending}>
              Hủy
            </Button>
            <Button onClick={onSave} disabled={hasErrors || save.isPending}>
              {save.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Xóa mọi tùy chỉnh?</DialogTitle>
            <DialogDescription>
              {clearDescription}
            </DialogDescription>
          </DialogHeader>
          {formError && !dirty && <p role="alert" className="text-sm text-destructive">Không xóa được: {formError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)} disabled={save.isPending}>
              Giữ lại
            </Button>
            <Button variant="destructive" onClick={() => send(clearedBody(server, preserveKeys), clearedMessage)} disabled={save.isPending}>
              {save.isPending ? 'Đang xóa…' : 'Xóa mọi tùy chỉnh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(o) => !o && blocker.state === 'blocked' && blocker.reset()}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Rời trang khi chưa lưu?</DialogTitle>
            <DialogDescription>Có {changes.length} thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
              Ở lại
            </Button>
            <Button variant="destructive" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
              Rời trang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Một ô cấu hình: "Mặc định" (mờ, không gửi) hoặc "Tùy chỉnh" (gửi) ----------

function Field({
  field: f,
  value,
  error,
  onChange,
  onReset,
}: {
  field: ConfigField
  /** undefined = Mặc định */
  value: string | boolean | undefined
  error: string | undefined
  onChange: (value: string | boolean) => void
  onReset: () => void
}) {
  const id = `cfg-${f.key}`
  const custom = value !== undefined
  const describedBy = `${id}-hint${error ? ` ${id}-error` : ''}`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{f.label}</Label>
        {custom ? (
          <Button type="button" variant="ghost" size="xs" className="-my-1 text-muted-foreground" onClick={onReset}>
            Về mặc định
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Mặc định</span>
        )}
      </div>

      {f.kind === 'boolean' ? (
        <div className="flex items-center gap-3">
          <Switch
            id={id}
            checked={custom ? Boolean(value) : Boolean(f.default)}
            onCheckedChange={onChange}
            aria-describedby={describedBy}
          />
          <span className={`text-sm ${custom ? '' : 'text-muted-foreground'}`}>
            {(custom ? Boolean(value) : Boolean(f.default)) ? 'Bật' : 'Tắt'}
          </span>
        </div>
      ) : (
        <div className="relative">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step={f.step ?? (f.kind === 'integer' ? 1 : 'any')}
            min={f.min}
            max={f.max}
            className={`tabular ${f.unit ? 'pr-14' : ''} ${custom ? '' : 'text-muted-foreground'}`}
            value={custom ? String(value) : f.default === null ? '' : String(f.default)}
            placeholder={f.defaultText}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={describedBy}
          />
          {f.unit && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              {f.unit}
            </span>
          )}
        </div>
      )}

      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {f.hint}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
