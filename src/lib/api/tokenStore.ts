import type { SessionUser, TokenPair } from './types'

// Access token chỉ nằm trong bộ nhớ (mất khi tải lại trang, sẽ refresh lại).
// Refresh token và thông tin user nằm trong localStorage để giữ đăng nhập qua các lần mở trang.
// Đánh đổi: localStorage đọc được nếu trang bị XSS; chấp nhận cho phạm vi khóa luận.

const REFRESH_KEY = 'kltn.refreshToken'
const USER_KEY = 'kltn.user'

let accessToken: string | null = null

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* trình duyệt chặn storage: chỉ mất khả năng nhớ đăng nhập */
  }
}

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => read(REFRESH_KEY),

  getUser(): SessionUser | null {
    const raw = read(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SessionUser
    } catch {
      return null
    }
  },

  setTokens(pair: TokenPair) {
    accessToken = pair.accessToken
    write(REFRESH_KEY, pair.refreshToken)
  },

  setUser(user: SessionUser) {
    write(USER_KEY, JSON.stringify(user))
  },

  clear() {
    accessToken = null
    write(REFRESH_KEY, null)
    write(USER_KEY, null)
  },
}
