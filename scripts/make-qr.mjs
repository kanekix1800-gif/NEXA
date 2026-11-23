// Gera os QR Codes de acesso ao NEXA: o do site, um por perfil demonstrativo e um
// cartaz em A4 pronto para projetar ou imprimir.
//
// Uso: node scripts/make-qr.mjs https://usuario.github.io/NEXA/ [pasta-de-saída]
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { encode } from 'uqr'

const site = process.argv[2]
if (!site || !/^https?:\/\//.test(site)) {
  console.error(
    'Informe o endereço do site. Ex.: node scripts/make-qr.mjs https://usuario.github.io/NEXA/',
  )
  process.exit(1)
}
const base = site.endsWith('/') ? site : `${site}/`
const out = join(process.cwd(), process.argv[3] ?? 'qr-code')
await mkdir(out, { recursive: true })

const TARGETS = [
  { file: 'nexa', label: 'Abrir o NEXA', url: base },
  { file: 'nexa-morador', label: 'Morador', url: `${base}#/entrar?demo=resident` },
  { file: 'nexa-comerciante', label: 'Comerciante', url: `${base}#/entrar?demo=merchant` },
  { file: 'nexa-instituicao', label: 'Instituição', url: `${base}#/entrar?demo=institution` },
  { file: 'nexa-administrador', label: 'Administrador', url: `${base}#/entrar?demo=admin` },
]

/** QR Code em SVG, com a margem clara exigida pelos leitores. */
function qrSvg(text, { size } = {}) {
  const code = encode(text, { ecc: 'M', border: 4 })
  let path = ''
  for (let row = 0; row < code.size; row += 1) {
    for (let col = 0; col < code.size; col += 1) {
      if (code.data[row][col]) path += `M${col},${row}h1v1h-1z`
    }
  }
  const dimensions = size ? ` width="${size}" height="${size}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg"${dimensions} viewBox="0 0 ${code.size} ${code.size}" shape-rendering="crispEdges"><rect width="${code.size}" height="${code.size}" fill="#ffffff"/><path d="${path}" fill="#0b1f18"/></svg>`
}

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="84" height="84" fill="none">
  <g stroke="#fdfbf6" stroke-width="5.5"><line x1="14" y1="44.5" x2="14" y2="19.5"/><line x1="18.47" y1="17.72" x2="48.6" y2="49.5"/><line x1="50" y1="49" x2="50" y2="19.5"/></g>
  <g stroke="#fdfbf6" stroke-width="4.5"><circle cx="14" cy="13" r="6.5"/><circle cx="14" cy="51" r="6.5"/><circle cx="50" cy="13" r="6.5"/></g>
  <circle cx="50" cy="51" r="8.75" fill="#f2a333"/>
</svg>`

const [main, ...profiles] = TARGETS
const poster = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0 }
  * { box-sizing: border-box }
  body { margin: 0; width: 210mm; height: 297mm; background: #faf5ec; color: #102820;
    font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif; display: flex; flex-direction: column }
  header { background: #064d3b; color: #fff; padding: 14mm 16mm 12mm; display: flex; align-items: center; gap: 8mm }
  header h1 { margin: 0; font-size: 44pt; letter-spacing: 1pt; font-weight: 800 }
  header p { margin: 1mm 0 0; font-size: 15pt; color: #ddebdd }
  main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7mm; padding: 8mm 16mm 4mm }
  .call { font-size: 25pt; font-weight: 800; text-align: center; margin: 0 }
  .qr { background: #fff; border-radius: 9mm; padding: 5mm; box-shadow: 0 6mm 14mm -8mm rgb(16 40 32 / .45) }
  .qr svg { display: block; width: 96mm; height: 96mm }
  .url { font-size: 15pt; font-weight: 700; color: #0b6048; word-break: break-all; text-align: center; margin: 0 }
  .profiles { width: 100%; border-top: .4mm solid #d6d0c1; padding-top: 6mm }
  .profiles h2 { margin: 0 0 4mm; font-size: 13pt; text-align: center; font-weight: 700 }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm }
  .grid figure { margin: 0; text-align: center }
  .grid svg { width: 34mm; height: 34mm; background: #fff; border-radius: 3mm }
  .grid figcaption { margin-top: 2mm; font-size: 11.5pt; font-weight: 700 }
  footer { text-align: center; font-size: 10.5pt; color: #49544e; padding: 0 16mm 9mm }
</style></head><body>
  <header>${MARK}<div><h1>NEXA</h1><p>Conexões que transformam realidades.</p></div></header>
  <main>
    <p class="call">Aponte a câmera do celular<br>e abra o NEXA</p>
    <div class="qr">${qrSvg(main.url)}</div>
    <p class="url">${main.url.replace(/^https?:\/\//, '')}</p>
    <section class="profiles">
      <h2>Ou entre direto em um perfil de demonstração</h2>
      <div class="grid">${profiles
        .map(
          (target) =>
            `<figure>${qrSvg(target.url)}<figcaption>${target.label}</figcaption></figure>`,
        )
        .join('')}</div>
    </section>
  </main>
  <footer>Protótipo de demonstração · todos os dados são fictícios · funciona no navegador, sem instalar nada</footer>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 1200 },
  deviceScaleFactor: 1,
})
for (const target of TARGETS) {
  await writeFile(join(out, `${target.file}.svg`), qrSvg(target.url, { size: 1200 }))
  await page.setContent(`<body style="margin:0">${qrSvg(target.url, { size: 1200 })}</body>`)
  await page.screenshot({ path: join(out, `${target.file}.png`) })
  console.log(`${target.file}.png  →  ${target.url}`)
}
await page.setContent(poster)
await page.pdf({ path: join(out, 'nexa-cartaz.pdf'), format: 'A4', printBackground: true })
await page.setViewportSize({ width: 794, height: 1123 })
await page.screenshot({ path: join(out, 'nexa-cartaz.png') })
console.log('nexa-cartaz.pdf e nexa-cartaz.png')
await browser.close()
