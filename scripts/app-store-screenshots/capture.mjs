import { open } from './lib.mjs'
import { mkdirSync } from 'node:fs'

const device = process.argv[2] || 'iphone'
const only = process.argv[3]
const outDir = `out/${device}`
mkdirSync(outDir, { recursive: true })

// The iOS status bar, drawn over the page the way the device shows it.
async function statusBar(page) {
  await page.evaluate((device) => {
    const bar = document.createElement('div')
    const icons = `<svg width="78" height="14" viewBox="0 0 78 14">${[0,1,2,3].map(i => `<rect x="${i*5}" y="${10-i*3}" width="3.2" height="${4+i*3}" rx="1" fill="#fff"/>`).join('')}<path d="M31.5 3.2c2.6 0 5 1 6.8 2.7l1.2-1.3A11.4 11.4 0 0 0 31.5 1.4 11.4 11.4 0 0 0 23.6 4.6l1.2 1.3c1.8-1.7 4.1-2.7 6.7-2.7zm0 3.6c1.6 0 3 .6 4.1 1.6l1.2-1.3a7.6 7.6 0 0 0-10.6 0l1.2 1.3c1.1-1 2.5-1.6 4.1-1.6zm0 3.6c.6 0 1.1.2 1.5.6l-1.5 1.6-1.5-1.6c.4-.4.9-.6 1.5-.6z" fill="#fff"/><rect x="46.5" y="1.5" width="25" height="11" rx="3.4" fill="none" stroke="rgba(255,255,255,0.45)"/><rect x="48.5" y="3.5" width="21" height="7" rx="1.8" fill="#fff"/><path d="M73.4 5.2v3.6c.8-.3 1.3-1 1.3-1.8s-.5-1.5-1.3-1.8z" fill="rgba(255,255,255,0.45)"/></svg>`
    const font = 'font-family:-apple-system,"SF Pro Text",Inter,system-ui,sans-serif;font-weight:600;color:#fff;'
    bar.innerHTML = device === 'iphone'
      ? `<div style="position:fixed;top:0;left:0;right:0;height:58px;display:flex;align-items:center;justify-content:space-between;padding:6px 34px 0 56px;z-index:2147483647;pointer-events:none;${font}font-size:17px;letter-spacing:-0.2px"><span style="color:#fff !important">9:41</span>${icons}</div>
         <div style="position:fixed;top:12px;left:50%;width:126px;height:37px;margin-left:-63px;border-radius:19px;background:#000;z-index:2147483647"></div>`
      : `<div style="position:fixed;top:0;left:0;right:0;height:24px;display:flex;align-items:center;justify-content:space-between;padding:4px 22px 0 24px;z-index:2147483647;pointer-events:none;${font}font-weight:500;font-size:12px;letter-spacing:0.1px"><span style="color:#fff !important">9:41 AM&nbsp;&nbsp;Mon Jun 22</span><span style="transform:scale(0.85);transform-origin:right center">${icons}</span></div>`
    document.body.appendChild(bar)
  }, device)
}

async function longPress(page, locator) {
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1200)
  await page.mouse.up()
}

const openTopic = async (page) => {
  await page.getByLabel('Directions topic').click()
  await page.waitForSelector('text=izquierda', { timeout: 30000 })
  await page.waitForTimeout(1500)
}

const SCENES = {
  'topics-grid': async () => {},
  'account-stats': async (page) => { await page.getByLabel('Navigate to ACCOUNT section').click() },
  'account-progress': async (page) => {
    await page.getByLabel('Navigate to ACCOUNT section').click(); await page.waitForTimeout(900)
    await page.getByLabel(/Spanish progress/).click()
  },
  'audio-pronunciation': openTopic,
  'settings-speed': async (page) => {
    await openTopic(page)
    await page.locator('button:has(svg.lucide-settings)').first().click()
  },
  'example-sentence': async (page) => {
    await openTopic(page)
    await longPress(page, page.getByLabel('Spanish: izquierda'))
    await page.waitForSelector('text=semáforo', { timeout: 15000 })
  },
  'my-words-playlists': async (page) => { await page.getByLabel('Navigate to MY WORDS section').click() },
  'quick-recall': async (page) => {
    await page.getByLabel('Navigate to ACCOUNT section').click(); await page.waitForTimeout(900)
    await page.getByLabel(/words to review/).click()
  },
}

for (const [name, run] of Object.entries(SCENES)) {
  if (only && !only.split(',').includes(name)) continue
  const { browser, page } = await open(device)
  try {
    await run(page)
    await page.waitForTimeout(1800)
    await statusBar(page)
    await page.screenshot({ path: `${outDir}/${name}.png` })
    console.log('✓', device, name)
  } catch (e) {
    console.log('✗', device, name, e.message.split('\n')[0])
    await page.screenshot({ path: `${outDir}/${name}-FAILED.png` })
  }
  await browser.close()
}
