/** ORG_ADMIN mà tài khoản chưa gắn tổ chức nào: các trang tổ chức hiện thông báo này và không gọi API. */
export function NoOrgNotice({ title }: { title: string }) {
  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="rounded-xl border bg-background p-6">
        <p className="py-10 text-center text-sm text-muted-foreground">
          Tài khoản của bạn chưa thuộc tổ chức nào. Liên hệ quản trị hệ thống.
        </p>
      </div>
    </div>
  )
}
