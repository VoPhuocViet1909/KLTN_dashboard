// Node 22+ and Edge/Chrome. Start Vite, then: node scripts/check-ui.mjs [output-directory]
// API responses are intercepted fixtures: this checks UI, not backend authorization.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const web = process.env.WEB_URL || 'http://127.0.0.1:5173'
const browser = process.env.BROWSER_BINARY || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const output = resolve(process.argv[2] || '.ui-check')
mkdirSync(output, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'kltn-ui-'))
const edge = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket
try {
  let port
  for (let n = 0; n < 100; n++) {
    try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break } catch { await delay(100) }
  }
  assert(port, 'Browser did not start')
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((ok, fail) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', fail, { once: true }) })
  const pending = new Map()
  let id = 0
  const call = (method, params = {}) => new Promise((ok, fail) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); fail(new Error(`Timeout: ${method}`)) }, 15000)
    pending.set(key, { ok, fail, timer })
    socket.send(JSON.stringify({ id: key, method, params }))
  })
  let role = 'USER'
  let cameraMode = 'normal'
  const mediaRequests = []
  let grants = 0
  let personalConfig = { alert_sec: 15, camera_focal_px: 900, shoulder_tilt_on: null }
  let orgConfig = { distance_on_cm: 60, distance_off_cm: 70, notify_sound: false, shoulder_tilt_on: 8 }
  const configWrites = []
  let rejectLogin = true
  const failures = []
  socket.addEventListener('message', event => {
    const msg = JSON.parse(event.data)
    if (pending.has(msg.id)) {
      const item = pending.get(msg.id)
      pending.delete(msg.id); clearTimeout(item.timer)
      if (msg.error) item.fail(new Error(JSON.stringify(msg.error)))
      else item.ok(msg.result)
    }
    if (msg.method === 'Runtime.exceptionThrown') failures.push(msg.params.exceptionDetails.text)
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params
      const path = new URL(request.url).pathname
      let body = []
      if (path.includes('/whep')) {
        if (request.method !== 'OPTIONS') mediaRequests.push({ method: request.method, url: request.url, auth: request.headers.Authorization ?? request.headers.authorization })
        const resource = cameraMode === 'unsafe' ? 'https://untrusted.invalid/stolen' : path + '/session'
        call('Fetch.fulfillRequest', { requestId, responseCode: request.method === 'POST' ? 201 : 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/sdp' }, { name: 'Location', value: resource },
            { name: 'Access-Control-Allow-Origin', value: web }, { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
            { name: 'Access-Control-Allow-Methods', value: 'POST, DELETE, OPTIONS' },
            { name: 'Access-Control-Expose-Headers', value: 'Location' }], body: Buffer.from('fixture-sdp').toString('base64') }).catch(e => failures.push(e.message))
        return
      }
      if (path.endsWith('/auth/login') && rejectLogin) {
        call('Fetch.fulfillRequest', { requestId, responseCode: 401, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' })).toString('base64') }).catch(e => failures.push(e.message))
        return
      }
      if (/\/auth\/(login|refresh)$/.test(path)) body = { accessToken: 'ui-fixture', refreshToken: 'ui-fixture', expiresIn: 3600, user: { id: 'ui-test', name: 'Nguyễn Minh Anh', email: 'ui@example.org', orgId: 'test-org', role } }
      else if (path.endsWith('/auth/media-token')) {
        grants++
        if (cameraMode === 'denied') {
          call('Fetch.fulfillRequest', { requestId, responseCode: 403,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify({ code: 'AUTH_FORBIDDEN', message: 'Forbidden' })).toString('base64') }).catch(e => failures.push(e.message))
          return
        }
        const input = JSON.parse(request.postData)
        assert.equal(input.action, 'read')
        body = { token: 'media-fixture', expiresIn: 16, action: 'read', path: `camera/ui-test/${input.deviceId}/${input.camera}` }
      }
      else if (path.endsWith('/config/me/details')) body = { personal: personalConfig, organization: orgConfig, effective: { ...orgConfig, ...personalConfig } }
      else if (path.endsWith('/config/me')) {
        if (request.method === 'PUT') { personalConfig = JSON.parse(request.postData); configWrites.push(personalConfig) }
        body = { ...orgConfig, ...personalConfig }
      }
      else if (path.endsWith('/summary')) body = { meanScore: 84, badMinutes: 22, presenceMinutes: 180, alerts: { NECK_TRUNK: 3 } }
      else if (path.includes('/alerts/') || path.endsWith('/users')) body = { items: [], page: 0, size: 20, total: 0 }
      call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') }).catch(e => failures.push(e.message))
    }
  })
  const js = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const waitFor = async expression => {
    for (let n = 0; n < 80; n++) { if (await js(expression)) return; await delay(100) }
    assert.fail(`Not ready: ${expression}\n${await js('location.href + "\\n" + document.body.innerText.slice(0,1000)')}`)
  }
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const shot = async name => writeFileSync(join(output, name + '.png'), Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await call('Runtime.enable')
  await call('Page.enable')
  await call('Page.bringToFront')
  await call('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear()' })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.cameraPeers = [];
    window.RTCPeerConnection = class {
      constructor() { this.iceGatheringState = 'complete'; this.connectionState = 'new'; window.cameraPeers.push(this); }
      addTransceiver() {}
      async createOffer() { return {type:'offer', sdp:'fixture-offer'}; }
      async setLocalDescription(d) { this.localDescription = d; }
      async setRemoteDescription() { this.connectionState = 'connected'; this.onconnectionstatechange?.(); }
      close() { this.closed = true; }
    };` })
  await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*' }, { urlPattern: '*/socket.io/*' }, { urlPattern: '*/whep*' }] })
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  for (role of ['USER', 'ORG_ADMIN', 'SYS_ADMIN']) {
    await call('Page.navigate', { url: web + '/login' })
    await waitFor('!!document.getElementById("email")')
    for (const width of [375, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 900, screenWidth: width, screenHeight: 900, deviceScaleFactor: 1, mobile: false })
      assert(await js('document.documentElement.scrollWidth <= innerWidth'), 'Login overflow')
      if (role === 'USER') await shot('web-login-' + width)
    }
    await click('button[type="submit"]')
    assert(await js('document.getElementById("email").matches(":invalid")'), 'Required field validation')
    await click('button[aria-label="Hiện mật khẩu"]')
    assert(await js('document.getElementById("password").type === "text"'), 'Password toggle')
    await js(`for (const [id, value] of [['email','ui@example.org'], ['password','fixture-only']]) { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el,value); el.dispatchEvent(new Event('input',{bubbles:true})) }`)
    await delay(100)
    if (rejectLogin) {
      await click('button[type="submit"]')
      await waitFor('document.activeElement?.getAttribute("role") === "alert"')
      assert(await js('document.activeElement.innerText.includes("Email hoặc mật khẩu không đúng")'), 'Login error guidance')
      rejectLogin = false
    }
    await click('button[type="submit"]')
    await waitFor('!!document.getElementById("main-content")')
    for (const width of [375, 768, 1024, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 900, screenWidth: width, screenHeight: 900, deviceScaleFactor: 1, mobile: false })
      await waitFor(`innerWidth === ${width}`)
      await delay(150)
      try { await waitFor('document.documentElement.scrollWidth <= innerWidth') }
      catch (e) { console.log(await js('({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,text:e.textContent.slice(0,80)}))})')); throw e }
      if (width < 1024) {
        await click('button[aria-label="Mở điều hướng"]')
        await waitFor('!!document.querySelector("[role=dialog]")')
        assert(await js('document.querySelector("[role=dialog]").contains(document.activeElement)'), 'Dialog focus')
        const links = await js('Array.from(document.querySelectorAll("[role=dialog] nav a"), a => a.getAttribute("href"))')
        assert.equal(links.includes('/org/users'), role === 'ORG_ADMIN')
        assert.equal(links.includes('/admin/users'), role === 'SYS_ADMIN')
        if (role === 'USER' && width === 375) await shot('web-menu-375')
        await delay(250) // Allow the dialog's document-level keyboard handler to mount.
        await call('Page.bringToFront')
        for (const type of ['keyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
        await waitFor('!document.querySelector("[role=dialog]")')
        assert(await js('document.activeElement.getAttribute("aria-label") === "Mở điều hướng"'), 'Focus return')
        await click('button[aria-label="Mở điều hướng"]')
        await waitFor('!!document.querySelector("[role=dialog]")')
        await click('[role=dialog] nav a[href="/"]')
        await waitFor('!document.querySelector("[role=dialog]")')
      }
      if (role === 'USER') await shot('web-overview-' + width)
    }
    if (role === 'ORG_ADMIN') {
      await js(`import(performance.getEntriesByType('resource').find(r => r.name.includes('/src/realtime/socket.')).name).then(({getSocket}) => {
        for (const userId of ['ui-test','someone-else']) getSocket().emitEvent(['status',
          {userId, deviceId:'same-device', state:userId === 'ui-test' ? 'GOOD' : 'BAD', ts:new Date().toISOString()}]);
      })`)
      await waitFor('document.querySelector("section").textContent.includes("Ngồi đúng") && !document.querySelector("section").textContent.includes("Đang ngồi sai")')
      await click('a[href="/org"]')
      await waitFor('document.body.textContent.includes("Ai đang ngồi sai lúc này")')
      await js(`import(performance.getEntriesByType('resource').find(r => r.name.includes('/src/realtime/socket.')).name).then(({getSocket}) => {
        for (const userId of ['ui-test','someone-else']) getSocket().emitEvent(['status',
          {userId, deviceId:'same-device', state:'BAD', ts:new Date().toISOString()}]);
      })`)
      await waitFor('document.body.textContent.includes("2 máy")')
    }
  }
  // API fixtures + fake WebRTC: ownership filtering, lifecycle/renewal and media token isolation.
  await js(`import(performance.getEntriesByType('resource').find(r => r.name.includes('/src/realtime/socket.')).name).then(({getSocket}) => {
    getSocket().emitEvent(['status', {userId:'someone-else', deviceId:'foreign', state:'BAD', ts:new Date().toISOString()}]);
    getSocket().emitEvent(['status', {userId:'ui-test', deviceId:'my-device', state:'GOOD', ts:new Date().toISOString()}]);
  })`)
  await waitFor('document.getElementById("camera-device")?.textContent.includes("my-device")')
  assert(await js('!document.getElementById("camera-device").textContent.includes("foreign")'))
  const cameraClick = () => js(`Array.from(document.querySelectorAll('button')).find(b => /^(Xem|Dừng) camera$/.test(b.textContent)).click()`)
  await cameraClick()
  await waitFor('document.body.textContent.includes("Đang phát trực tiếp.")')
  await js(`import(performance.getEntriesByType('resource').find(r => r.name.includes('/src/realtime/socket.')).name).then(({getSocket}) => {
    getSocket().emitEvent(['status', {userId:'ui-test', deviceId:'newest-device', state:'GOOD', ts:new Date().toISOString()}]);
  })`)
  assert(await js('document.getElementById("camera-device").textContent.includes("my-device")'), 'Keep the selected stream when another device updates')
  await delay(1300) // expiresIn 16s fixture -> renew before expiry at 1s.
  assert(await js('window.cameraPeers.length >= 2 && window.cameraPeers[0].closed'), 'Renewal must replace and close the old peer')
  await cameraClick()
  await delay(200)
  assert(await js('window.cameraPeers.every(p => p.closed) && document.querySelector("video").srcObject === null'), 'Stop must release media')
  assert(mediaRequests.some(r => r.method === 'DELETE'), 'Stop/renewal must delete WHEP sessions')
  assert(mediaRequests.every(r => r.auth === 'Bearer media-fixture'), 'WHEP must never receive API JWT')
  cameraMode = 'unsafe'
  await cameraClick()
  await waitFor('document.body.textContent.includes("Đang chờ camera chia sẻ")')
  await cameraClick()
  assert(mediaRequests.every(r => !r.url.includes('untrusted.invalid')), 'Do not follow cross-origin WHEP resources')
  cameraMode = 'denied'
  await cameraClick()
  await waitFor('document.body.textContent.includes("Không xem được camera")')
  const before = grants
  await delay(3200)
  assert.equal(grants, before, 'Do not retry permission failures')
  await cameraClick()
  cameraMode = 'normal'
  await cameraClick()
  await waitFor('document.body.textContent.includes("Đang phát trực tiếp.")')
  await click('a[href="/habits"]')
  await waitFor('!document.querySelector("video")')
  assert(await js('window.cameraPeers.every(p => p.closed)'), 'Leaving the page must close every peer')
  await click('a[href="/settings"]')
  await waitFor('document.getElementById("cfg-alert_sec")?.value === "15"')
  assert.equal(await js('document.getElementById("cfg-distance_on_cm").value'), '60')
  const input = (id, value) => js(`{const el=document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true}));}`)
  const button = text => js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(text)}).click()`)
  await input('cfg-alert_sec', '16')
  await waitFor('document.body.textContent.includes("Có 1 thay đổi")')
  await button('Lưu cấu hình')
  await waitFor('!document.body.textContent.includes("chưa lưu")')
  assert.deepEqual(configWrites.at(-1), { alert_sec: 16, camera_focal_px: 900, shoulder_tilt_on: null }, 'Save only personal overrides, preserving calibration/null')
  orgConfig = { ...orgConfig, distance_on_cm: 65 }
  const emitConfig = () => js(`import(performance.getEntriesByType('resource').find(r=>r.name.includes('/src/realtime/socket.')).name).then(({getSocket})=>getSocket().emitEvent(['config',${JSON.stringify({ ...orgConfig, ...personalConfig })}]))`)
  await emitConfig()
  await waitFor('document.getElementById("cfg-distance_on_cm").value === "65"')
  await input('cfg-distance_on_cm', '68') // Valid against inherited off=70, rather than app default55.
  await waitFor('Array.from(document.querySelectorAll("button")).some(b=>b.textContent==="Lưu cấu hình" && !b.disabled)')
  await button('Lưu cấu hình')
  await waitFor('!document.body.textContent.includes("chưa lưu")')
  assert.equal(configWrites.at(-1).distance_on_cm, 68)
  assert.equal(configWrites.at(-1).distance_off_cm, undefined)
  await js('document.getElementById("cfg-distance_on_cm").parentElement.parentElement.querySelector("button").click()')
  await waitFor('document.getElementById("cfg-distance_on_cm").value === "65"')
  await button('Lưu cấu hình')
  await waitFor('!document.body.textContent.includes("chưa lưu")')
  assert.equal(configWrites.at(-1).distance_on_cm, undefined, 'Reset resumes organization inheritance')
  await input('cfg-alert_sec', '17')
  orgConfig = { ...orgConfig, distance_on_cm: 64 }
  await emitConfig()
  await waitFor('document.body.textContent.includes("Cấu hình vừa được đổi ở nơi khác")')
  assert.equal(await js('document.getElementById("cfg-alert_sec").value'), '17', 'Realtime preserves draft')
  assert(await js('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Lưu cấu hình").disabled'), 'Resolve conflict before replacing config')
  await button('Dùng giá trị mới')
  await waitFor('document.getElementById("cfg-alert_sec").value === "16"')
  assert.deepEqual(failures, [], 'Browser runtime errors')
  console.log('PASS: mock UI 3 roles/4 viewports; camera ownership/renewal/cleanup/token isolation; config inheritance/save/reset/null/calibration and realtime conflicts')
} finally {
  socket?.close()
  edge.kill()
  await delay(1000)
  if (dirname(resolve(profile)) === resolve(tmpdir()) && basename(profile).startsWith('kltn-ui-')) {
    try { rmSync(profile, { recursive: true, force: true }) } catch { /* Browser may still be releasing its temporary profile. */ }
  }
}
