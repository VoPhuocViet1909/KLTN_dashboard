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
      if (/\/auth\/(login|refresh)$/.test(path)) body = { accessToken: 'ui-fixture', refreshToken: 'ui-fixture', expiresIn: 3600, user: { id: 'ui-test', name: 'Nguyễn Minh Anh', email: 'ui@example.org', orgId: 'test-org', role } }
      else if (path.endsWith('/summary')) body = { meanScore: 84, badMinutes: 22, presenceMinutes: 180, alerts: { NECK_TRUNK: 3 } }
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
    assert.fail(`Not ready: ${expression}`)
  }
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const shot = async name => writeFileSync(join(output, name + '.png'), Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await call('Runtime.enable')
  await call('Page.enable')
  await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*' }, { urlPattern: '*/socket.io/*' }] })
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  for (role of ['USER', 'ORG_ADMIN', 'SYS_ADMIN']) {
    await call('Page.navigate', { url: web + '/login' })
    await delay(300)
    await js('localStorage.clear()')
    await call('Page.navigate', { url: web + '/login' })
    await waitFor('!!document.getElementById("email")')
    for (const width of [375, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
      assert(await js('document.documentElement.scrollWidth <= innerWidth'), 'Login overflow')
      if (role === 'USER') await shot('web-login-' + width)
    }
    await click('button[type="submit"]')
    assert(await js('document.getElementById("email").matches(":invalid")'), 'Required field validation')
    await click('button[aria-label="Hiện mật khẩu"]')
    assert(await js('document.getElementById("password").type === "text"'), 'Password toggle')
    await js(`for (const [id, value] of [['email','ui@example.org'], ['password','fixture-only']]) { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el,value); el.dispatchEvent(new Event('input',{bubbles:true})) }`)
    await delay(100)
    await click('button[type="submit"]')
    await waitFor('!!document.getElementById("main-content")')
    for (const width of [375, 768, 1024, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
      await delay(150)
      assert(await js('document.documentElement.scrollWidth <= innerWidth'), `Overview overflow ${role}/${width}`)
      if (width < 1024) {
        await click('button[aria-label="Mở điều hướng"]')
        await waitFor('!!document.querySelector("[role=dialog]")')
        assert(await js('document.querySelector("[role=dialog]").contains(document.activeElement)'), 'Dialog focus')
        const links = await js('Array.from(document.querySelectorAll("[role=dialog] nav a"), a => a.getAttribute("href"))')
        assert.equal(links.includes('/org/users'), role === 'ORG_ADMIN')
        assert.equal(links.includes('/admin/users'), role === 'SYS_ADMIN')
        if (role === 'USER' && width === 375) await shot('web-menu-375')
        await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
        await waitFor('!document.querySelector("[role=dialog]")')
        assert(await js('document.activeElement.getAttribute("aria-label") === "Mở điều hướng"'), 'Focus return')
        await click('button[aria-label="Mở điều hướng"]')
        await waitFor('!!document.querySelector("[role=dialog]")')
        await click('[role=dialog] nav a[href="/"]')
        await waitFor('!document.querySelector("[role=dialog]")')
      }
      if (role === 'USER') await shot('web-overview-' + width)
    }
  }
  assert.deepEqual(failures, [], 'Browser runtime errors')
  console.log('PASS: mock login, password toggle, 3 roles, 4 viewport sizes, menu/Escape/focus, reduced motion, no page overflow')
} finally {
  socket?.close()
  edge.kill()
  await delay(1000)
  if (dirname(resolve(profile)) === resolve(tmpdir()) && basename(profile).startsWith('kltn-ui-')) {
    try { rmSync(profile, { recursive: true, force: true }) } catch { /* Browser may still be releasing its temporary profile. */ }
  }
}
