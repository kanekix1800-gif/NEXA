// Gera os ícones PNG do aplicativo (public/icons) a partir do símbolo NEXA.
// Uso: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'

const mark = (scale, tx, ty) => `
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <g stroke="#fdfbf6" stroke-width="5.5">
      <line x1="14" y1="44.5" x2="14" y2="19.5"/>
      <line x1="18.47" y1="17.72" x2="48.6" y2="49.5"/>
      <line x1="50" y1="49" x2="50" y2="19.5"/>
    </g>
    <g stroke="#fdfbf6" stroke-width="4.5" fill="none">
      <circle cx="14" cy="13" r="6.5"/>
      <circle cx="14" cy="51" r="6.5"/>
      <circle cx="50" cy="13" r="6.5"/>
    </g>
    <circle cx="50" cy="51" r="8.75" fill="#f2a333"/>
  </g>`

// Ícone padrão: quadrado arredondado. Maskable/Apple: fundo cheio com símbolo na zona segura.
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="15" fill="#064d3b"/>${mark(0.75, 8, 8)}</svg>`
const full = (s) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" fill="#064d3b"/>${mark(s, (64 - 64 * s) / 2, (64 - 64 * s) / 2)}</svg>`

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, svg: rounded, transparent: true },
  { file: 'public/icons/icon-512.png', size: 512, svg: rounded, transparent: true },
  { file: 'public/icons/icon-maskable-512.png', size: 512, svg: full(0.56), transparent: false },
  { file: 'public/icons/apple-touch-icon.png', size: 180, svg: full(0.64), transparent: false },
]

const browser = await chromium.launch()
for (const t of targets) {
  const page = await browser.newPage({
    viewport: { width: t.size, height: t.size },
    deviceScaleFactor: 1,
  })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${t.svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`,
  )
  await page.screenshot({ path: t.file, omitBackground: t.transparent })
  await page.close()
  console.log('ok', t.file)
}
await browser.close()
