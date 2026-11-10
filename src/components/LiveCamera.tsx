import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { watchCamera, type Camera } from '@/lib/liveCamera'

export function LiveCamera({ userId, devices }: { userId: string; devices: string[] }) {
  const [selected, setSelected] = useState('')
  const deviceId = devices.includes(selected) ? selected : devices[0] ?? ''
  const [camera, setCamera] = useState<Camera>('side')
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState('Chưa mở camera.')
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!playing || !deviceId || !video.current) return
    let cancelled = false
    let stop: (() => void) | undefined
    queueMicrotask(() => {
      if (cancelled || !video.current) return
      try { stop = watchCamera(video.current, userId, deviceId, camera, setMessage) }
      catch (e) { setMessage(e instanceof Error ? e.message : 'Không mở được camera.') }
    })
    return () => { cancelled = true; stop?.() }
  }, [playing, deviceId, camera, userId])

  return (
    <section className="space-y-4 rounded-xl border bg-background p-6" aria-labelledby="live-camera-title">
      <div className="space-y-1">
        <h2 id="live-camera-title" className="font-medium">Camera của bạn</h2>
        <p className="text-sm text-muted-foreground">Chỉ xem được khi ứng dụng desktop cùng tài khoản đang chia sẻ camera. Không ghi hình.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="camera-device">Thiết bị</Label>
          <Select value={deviceId} onValueChange={setSelected} disabled={playing || !devices.length}>
            <SelectTrigger id="camera-device" className="min-h-11 w-full"><SelectValue placeholder="Chưa có thiết bị" /></SelectTrigger>
            <SelectContent>{devices.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="camera-role">Góc camera</Label>
          <Select value={camera} onValueChange={v => setCamera(v as Camera)} disabled={playing}>
            <SelectTrigger id="camera-role" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="side">Camera hông</SelectItem><SelectItem value="front">Camera trước</SelectItem></SelectContent>
          </Select>
        </div>
        <Button className="min-h-11" disabled={!deviceId} onClick={() => {
          if (!playing) setSelected(deviceId)
          setPlaying(!playing)
          if (playing) setMessage('Đã dừng camera.')
        }}>{playing ? 'Dừng camera' : 'Xem camera'}</Button>
      </div>
      {!devices.length && <p className="text-sm text-muted-foreground">Mở ứng dụng desktop và đăng nhập cùng tài khoản để thấy thiết bị.</p>}
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
      <video ref={video} autoPlay muted playsInline controls aria-label="Camera trực tiếp của bạn"
        className={playing ? 'aspect-video w-full rounded-md bg-foreground object-contain' : 'hidden'} />
    </section>
  )
}
