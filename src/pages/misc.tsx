import { Link } from 'react-router'

/** Chỗ giữ cho các trang chưa làm. Thay bằng trang thật theo kế hoạch trong README. */
export function Placeholder({ title, apis }: { title: string; apis: string[] }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-gray-500">Chưa làm. API sẽ dùng:</p>
      <ul className="list-disc pl-5 text-sm text-gray-600">
        {apis.map((a) => (
          <li key={a}>
            <code>{a}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ForbiddenPage() {
  return (
    <Message title="Không có quyền" text="Tài khoản của bạn không được vào trang này." />
  )
}

export function NotFoundPage() {
  return <Message title="Không tìm thấy trang" text="Đường dẫn không tồn tại." />
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-gray-500">{text}</p>
        <Link to="/" className="text-sm underline">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
