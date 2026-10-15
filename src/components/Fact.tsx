/** Một chỉ số nhỏ trong danh sách `dl`: nhãn, giá trị, ghi chú (tùy chọn). */
export function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 text-xl font-semibold">{value}</dd>
      {hint && (
        <dd className="truncate text-xs text-muted-foreground" title={hint}>
          {hint}
        </dd>
      )}
    </div>
  )
}
