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

async function shot(name) {
  const path = join(OUTDIR, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved: ${path}`)
}

async function selectOp(family, opName) {
  const sel = `[data-op-name="${opName}"][data-op-category="${family}"]`
  if (await page.locator(sel).count() === 0) {
    await page.locator(`[data-toggle-category="${family}"]`).click()
    await page.waitForSelector(sel, { timeout: 3000 })
  }
  await page.locator(sel).click()
  await page.waitForTimeout(300)
}

async function readState() {
  return page.evaluate(() => ({
    ref:    document.querySelector('#reference h1.reference-name')?.textContent ?? '(none)',
    chat:   document.querySelector('.chat-header')?.textContent?.trim() ?? '(none)',
    active: document.querySelector('.sidebar-operator--active')?.textContent?.trim() ?? '(none)',
    url:    location.pathname,
  }))
}

// Load app
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#loading', { state: 'hidden', timeout: 15000 })
await page.waitForTimeout(600)

console.log('Initial:', await readState())
await shot('01-initial-switchmap')

// Click map
await selectOp('Transformation', 'map')
console.log('After clicking map:', await readState())
await shot('02-click-map')

// Click mergeMap
await selectOp('Transformation', 'mergeMap')
console.log('After clicking mergeMap:', await readState())
await shot('03-click-mergeMap')

// Click map again (the distinctUntilChanged repro case)
await selectOp('Transformation', 'map')
console.log('After clicking map again:', await readState())
await shot('04-click-map-again')

await browser.close()
