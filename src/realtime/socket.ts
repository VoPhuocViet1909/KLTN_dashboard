import { io, type Socket } from 'socket.io-client'
import { refreshAccessToken } from '@/lib/api/client'
import { tokenStore } from '@/lib/api/tokenStore'

// Socket.IO tới notification-service qua Gateway (/socket.io/), theo team-sync mục 4.7:
// - token gửi trong auth lúc kết nối; sai/hết hạn -> connect_error "unauthorized"
// - server ngắt đúng lúc token hết hạn -> client refresh rồi tự kết nối lại
// - server tự cho vào room user:{sub} (ORG_ADMIN thêm org:{orgId}); client không gửi lệnh join

export type DeviceState = 'GOOD' | 'BAD' | 'AWAY' | 'OFFLINE'

export interface StatusEvent {
  userId: string
  deviceId: string
  state: DeviceState
  alertType: string | null
  ts: string
}

type Listener = (connected: boolean) => void

let socket: Socket | null = null
let retryDelay = 1_000
let retryTimer: ReturnType<typeof setTimeout> | null = null
const connectionListeners = new Set<Listener>()

function notify(connected: boolean) {
  connectionListeners.forEach((fn) => fn(connected))
}

function scheduleReconnect() {
  if (retryTimer || !socket) return
  retryTimer = setTimeout(async () => {
    retryTimer = null
    try {
      await refreshAccessToken()
    } catch {
      return // phiên đã hết hẳn: AuthProvider sẽ đưa về trang đăng nhập
    }
    socket?.connect()
  }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, 30_000)
}

export function getSocket(): Socket {
  if (socket) return socket
  socket = io({
    path: '/socket.io',
    autoConnect: false,
    // hàm: mỗi lần (re)connect lấy token mới nhất
    auth: (cb) => cb({ token: tokenStore.getAccessToken() }),
  })
  socket.on('connect', () => {
    retryDelay = 1_000
    notify(true)
  })
  socket.on('disconnect', (reason) => {
    notify(false)
    // Server chủ động ngắt (token hết hạn): thư viện không tự kết nối lại
    if (reason === 'io server disconnect') scheduleReconnect()
  })
  socket.on('connect_error', (err) => {
    notify(false)
    // Bị từ chối xác thực: thư viện cũng không tự thử lại
    if (err.message === 'unauthorized') scheduleReconnect()
  })
  socket.connect()
  return socket
}

export function isRealtimeConnected() {
  return !!socket?.connected
}

export function onConnectionChange(fn: Listener) {
  connectionListeners.add(fn)
  return () => {
    connectionListeners.delete(fn)
  }
}

export function disconnectRealtime() {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
  retryDelay = 1_000
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
  notify(false)
}
