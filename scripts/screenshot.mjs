// scripts/screenshot.mjs — visual proof of fixes
import { chromium } from 'playwright'
import { mkdir }    from 'fs/promises'
import { join }     from 'path'

const BASE   = 'http://localhost:5173'
const OUTDIR = 'screenshots'
await mkdir(OUTDIR, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page    = await browser.newPage()
await page.setViewportSize({ width: 1400, height: 900 })
page.on('pageerror', err => console.error('[pageerror]', err.message))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#loading', { state: 'hidden', timeout: 15000 })
await page.waitForTimeout(600)

// ── 1. Search focus fix: type multiple chars without re-clicking ──────
await page.locator('#sidebar-search').click()
await page.keyboard.type('map')   // type 3 chars in succession
await page.waitForTimeout(400)
const searchValue = await page.locator('#sidebar-search').inputValue()
const searchFocused = await page.locator('#sidebar-search').evaluate(el => document.activeElement === el)
console.log('Search value after typing "map":', searchValue, '| still focused:', searchFocused)
await page.screenshot({ path: join(OUTDIR, 'fix1-search-focus.png') })

// ── 2. Chat scroll fix: send a message, get a long reply, check scroll ─
await page.locator('#sidebar-search').fill('')           // clear search
await page.waitForTimeout(200)
// select switchMap
const switchMapEl = page.locator('[data-op-name="switchMap"][data-op-category="Transformation"]')
if (await switchMapEl.count() === 0) {
  await page.locator('[data-toggle-category="Transformation"]').click()
  await page.waitForSelector('[data-op-name="switchMap"]', { timeout: 3000 })
}
await switchMapEl.click()
await page.waitForTimeout(400)

// inject a long fake assistant reply to test scroll
await page.evaluate(() => {
  const msgs = document.getElementById('chat-messages')
  if (!msgs) return
  for (let i = 1; i <= 20; i++) {
    const div = document.createElement('div')
    div.className = 'chat-message chat-message--assistant'
    div.textContent = `Line ${i}: switchMap cancels the previous inner Observable when a new value arrives from the source.`
    msgs.appendChild(div)
  }
})
await page.waitForTimeout(200)

const scrollInfo = await page.evaluate(() => {
  const el = document.getElementById('chat-messages')
  return {
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollable:   el.scrollHeight > el.clientHeight,
    overflowY:    getComputedStyle(el).overflowY,
  }
})
console.log('Chat scroll info:', scrollInfo)

// scroll to bottom to show scroll works
await page.evaluate(() => {
  const el = document.getElementById('chat-messages')
  if (el) el.scrollTop = el.scrollHeight
})
await page.waitForTimeout(200)
await page.screenshot({ path: join(OUTDIR, 'fix2-chat-scroll.png') })

await browser.close()
console.log('Done.')
