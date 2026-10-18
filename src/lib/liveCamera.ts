import { request, requestMedia } from './api/client'

export type Camera = 'side' | 'front'
type Grant = { token: string; expiresIn: number; path: string; action: string }

/** Mỗi lượt xem sở hữu peer, timer và WHEP resource; cleanup dùng cả khi rời trang/đăng xuất. */
export function watchCamera(video: HTMLVideoElement, userId: string, deviceId: string, camera: Camera,
  status: (message: string) => void) {
  const base = new URL(import.meta.env.VITE_MEDIA_BASE_URL || `${location.protocol}//${location.hostname}:8889`)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash
    || base.pathname !== '/' || (location.protocol === 'https:' && base.protocol !== 'https:')) {
    throw new Error('Địa chỉ máy chủ camera chưa được cấu hình đúng. Liên hệ quản trị viên.')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(deviceId)) throw new Error('Mã thiết bị không hợp lệ.')
  let stopped = false
  let dispose: () => void = () => {}
  let timer: ReturnType<typeof setTimeout>
  let retries = 0

  function disconnect() {
    clearTimeout(timer)
    dispose()
    video.srcObject = null
  }

  function retry(allowed = true) {
    disconnect()
    if (allowed && retries++ < 5) {
      status('Đang chờ camera chia sẻ. Tự thử lại…')
      timer = setTimeout(connect, 3000)
    } else {
      status('Không xem được camera. Kiểm tra ứng dụng desktop đang chia sẻ và kết nối mạng; dừng rồi bấm Xem để thử lại.')
    }
  }

  async function connect() {
    disconnect()
    if (stopped) return
    const abort = new AbortController()
    let peer: RTCPeerConnection | undefined
    let resource: URL | undefined
    let token: string | undefined
    let cancelled = false
    let deadline: ReturnType<typeof setTimeout>
    const remove = (url: URL, grant: string) => {
      void requestMedia(url, { method: 'DELETE', headers: { Authorization: `Bearer ${grant}` },
        signal: AbortSignal.timeout(5000) }).catch(() => {})
    }
    dispose = () => {
      cancelled = true
      clearTimeout(deadline)
      abort.abort()
      peer?.close()
      if (resource && token) remove(resource, token)
      resource = undefined
    }
    status('Đang kết nối camera…')
    try {
      const grant = await request<Grant>({ method: 'POST', url: '/auth/media-token',
        data: { deviceId, camera, action: 'read' }, signal: abort.signal })
      if (cancelled) return
      if (grant.path !== `camera/${userId}/${deviceId}/${camera}` || grant.action !== 'read'
        || !grant.token || !Number.isFinite(grant.expiresIn) || grant.expiresIn <= 15) throw new Error()
      token = grant.token
      const renewAt = Date.now() + (grant.expiresIn - 15) * 1000
      peer = new RTCPeerConnection()
      peer.addTransceiver('video', { direction: 'recvonly' })
      peer.ontrack = e => {
        if (cancelled) return
        video.srcObject = new MediaStream([e.track])
        e.track.onended = () => { if (!cancelled) retry() }
      }
      peer.onconnectionstatechange = () => {
        if (cancelled) return
        if (peer?.connectionState === 'connected') {
          clearTimeout(deadline)
          retries = 0
          status('Đang phát trực tiếp.')
        } else if (peer && ['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
          retry()
        }
      }
      await peer.setLocalDescription(await peer.createOffer())
      await new Promise<void>((resolve, reject) => {
        if (peer!.iceGatheringState === 'complete') return resolve()
        const timeout = setTimeout(() => reject(new Error()), 10000)
        const finish = () => { clearTimeout(timeout); resolve() }
        abort.signal.addEventListener('abort', finish, { once: true })
        peer!.onicegatheringstatechange = () => { if (peer!.iceGatheringState === 'complete') finish() }
      })
      if (cancelled) return
      const whep = new URL(`/${grant.path}/whep`, base)
      const answer = await requestMedia(whep, { method: 'POST',
        headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${grant.token}` },
        body: peer.localDescription!.sdp, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]) })
      if (!answer.ok) throw Object.assign(new Error(), { status: answer.status })
      const target = answer.headers.get('Location')
      const session = target ? new URL(target, whep) : undefined
      if (!session || session.origin !== whep.origin || !session.pathname.startsWith(whep.pathname + '/')
        || session.username || session.password) throw new Error()
      if (cancelled) { remove(session, grant.token); return }
      resource = session
      await peer.setRemoteDescription({ type: 'answer', sdp: await answer.text() })
      if (cancelled) return
      deadline = setTimeout(() => { if (peer?.connectionState !== 'connected') retry() }, 15000)
      timer = setTimeout(connect, Math.max(0, renewAt - Date.now()))
    } catch (error) {
      if (cancelled) return
      const code = (error as { status?: number }).status
      retry(code !== 401 && code !== 403)
    }
  }
  void connect()
  const stop = () => { stopped = true; disconnect(); window.removeEventListener('pagehide', stop) }
  window.addEventListener('pagehide', stop)
  return stop
}
