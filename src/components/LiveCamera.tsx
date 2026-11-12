import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { watchCamera, type Camera } from '@/lib/liveCamera'

export function LiveCamera({ userId, devices }: { userId: string; devices: string[] }) {
  const [selected, setSelected] = useState('')
  const [manual, setManual] = useState(false)
  const [manualDevice, setManualDevice] = useState('')
  const [camera, setCamera] = useState<Camera>('side')
  const [playing, setPlaying] = useState(false)
  const manualMode = manual || !devices.length
  const deviceId = playing ? selected : manualMode ? manualDevice.trim() : devices.includes(selected) ? selected : devices[0] ?? ''
  const validDevice = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(deviceId)
  const choices = playing && !devices.includes(selected) ? [selected, ...devices] : devices
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
        <p className="text-sm text-muted-foreground">Trên ứng dụng desktop, chọn góc camera và bấm Bật chia sẻ. Đăng nhập web cùng tài khoản, chọn thiết bị và bấm Xem camera. Không ghi hình.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={manualMode ? 'camera-device-manual' : 'camera-device'}>Thiết bị</Label>
          {manualMode ? <Input id="camera-device-manual" className="min-h-11" maxLength={128} disabled={playing}
            value={playing ? selected : manualDevice} placeholder="Mã thiết bị trên ứng dụng desktop"
            aria-invalid={Boolean(deviceId && !validDevice)} aria-describedby="camera-device-help"
            onChange={e => { setManual(true); setManualDevice(e.target.value) }} /> : <Select value={deviceId} onValueChange={setSelected} disabled={playing}>
            <SelectTrigger id="camera-device" className="min-h-11 w-full"><SelectValue placeholder="Chưa có thiết bị" /></SelectTrigger>
            <SelectContent>{choices.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent>
          </Select>}
          {devices.length > 0 && <Button type="button" variant="link" className="min-h-11 px-0" disabled={playing} onClick={() => setManual(!manual)}>{manualMode ? 'Chọn từ danh sách thiết bị' : 'Nhập mã thiết bị'}</Button>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="camera-role">Góc camera</Label>
          <Select value={camera} onValueChange={v => setCamera(v as Camera)} disabled={playing}>
            <SelectTrigger id="camera-role" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="side">Camera hông</SelectItem><SelectItem value="front">Camera trước</SelectItem></SelectContent>
          </Select>
        </div>
        <Button className="min-h-11" disabled={!playing && !validDevice} onClick={() => {
          if (!playing) setSelected(deviceId)
          setPlaying(!playing)
          if (playing) setMessage('Đã dừng camera.')
        }}>{playing ? 'Dừng camera' : 'Xem camera'}</Button>
      </div>
      <p id="camera-device-help" className="text-sm text-muted-foreground">{deviceId && !validDevice ? 'Mã thiết bị chỉ gồm chữ, số, dấu gạch ngang và gạch dưới; bắt đầu bằng chữ hoặc số.' : 'Mã thiết bị nằm trong mục Chia sẻ camera lên web của ứng dụng desktop. Có thể nhập mã khi danh sách chưa cập nhật.'}</p>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
      <video ref={video} autoPlay muted playsInline controls aria-label="Camera trực tiếp của bạn"
        className={playing ? 'aspect-video w-full rounded-md bg-foreground object-contain' : 'hidden'} />
    </section>
  )
}
