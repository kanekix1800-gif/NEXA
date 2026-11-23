import { expect, test, type Page } from '@playwright/test'

import { open, signInDemo } from './helpers'

/**
 * Troca a voz do navegador por um gravador: os testes conferem O QUE seria falado,
 * sem depender das vozes instaladas na máquina.
 */
async function recordSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: string[] = []
    Object.assign(window, { __spoken: spoken })
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      voice = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    const engine = {
      speaking: false,
      pending: false,
      speak(utterance: FakeUtterance) {
        spoken.push(utterance.text)
        setTimeout(() => utterance.onend?.(), 0)
      },
      cancel() {},
      getVoices: () => [],
      addEventListener() {},
      removeEventListener() {},
    }
    Object.defineProperty(window, 'speechSynthesis', { value: engine, configurable: true })
    Object.assign(window, { SpeechSynthesisUtterance: FakeUtterance })
  })
}

const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' | '))

test.describe('Acessibilidade do aparelho', () => {
  test('texto maior e alto contraste valem antes do login e continuam após recarregar', async ({
    page,
  }) => {
    await open(page, '/')
    await page.getByRole('link', { name: 'Acessibilidade' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Acessibilidade' })).toBeVisible()
    await expect(page.getByText('Nenhuma opção ativa.')).toBeVisible()

    const html = page.locator('html')
    await page.getByRole('radio', { name: 'Muito grande' }).click()
    await expect(html).toHaveAttribute('data-text-scale', 'xlarge')
    await page.getByRole('switch', { name: 'Alto contraste' }).click()
    await expect(html).toHaveAttribute('data-contrast', 'high')
    await expect(page.getByText('2 opções ativas.')).toBeVisible()

    // O texto realmente cresce.
    const size = await html.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
    expect(size).toBeGreaterThan(19)

    await page.reload()
    await expect(html).toHaveAttribute('data-text-scale', 'xlarge')
    await expect(html).toHaveAttribute('data-contrast', 'high')
    await expect(page.getByRole('switch', { name: 'Alto contraste' })).toBeChecked()

    // Vale também nas outras telas, e nenhuma delas ganha rolagem horizontal.
    await open(page, '/entrar')
    await expect(html).toHaveAttribute('data-text-scale', 'xlarge')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.getByRole('link', { name: 'Acessibilidade' }).click()
    await page.getByRole('button', { name: 'Restaurar o padrão' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Restaurar' }).click()
    await expect(html).not.toHaveAttribute('data-text-scale', /.+/)
    await expect(html).not.toHaveAttribute('data-contrast', /.+/)
  })

  test('um perfil pronto liga as opções de uma vez e pode ser desligado', async ({ page }) => {
    await recordSpeech(page)
    await open(page, '/acessibilidade')
    const profile = page.getByRole('button', { name: /Tenho baixa visão/ })
    await expect(profile).toHaveAttribute('aria-pressed', 'false')
    await profile.click()
    await expect(profile).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'xlarge')
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'strong')
    await expect(page.getByRole('button', { name: 'Ouvir tela', exact: true })).toBeVisible()

    await profile.click()
    await expect(profile).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('html')).not.toHaveAttribute('data-text-scale', /.+/)
    await expect(page.getByRole('button', { name: 'Ouvir tela', exact: true })).toHaveCount(0)
  })

  test('voz: anuncia as telas, lê o item tocado e os avisos', async ({ page }) => {
    await recordSpeech(page)
    await open(page, '/acessibilidade')

    await page.getByRole('switch', { name: 'Falar o nome de cada tela' }).click()
    await page.getByRole('switch', { name: 'Ler o que eu tocar' }).click()
    await page.getByRole('switch', { name: 'Ler avisos e confirmações' }).click()
    await expect.poll(() => spoken(page)).toContain('Ligado. Vou dizer o nome de cada tela.')

    // Tocar em um item fala o nome dele e o que ele é.
    await page.getByRole('button', { name: 'Testar a voz' }).click()
    await expect.poll(() => spoken(page)).toContain('Testar a voz, botão')
    await expect.poll(() => spoken(page)).toContain('Esta é a voz do NEXA')

    // "Voltar" na primeira tela aberta leva à abertura do app (e não para fora dele).
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL(/#\/$/)
    // Ao trocar de tela, o nome dela é anunciado.
    await open(page, '/entrar')
    await expect.poll(() => spoken(page)).toContain('Tela: Entrar')

    // Um aviso da tela também é lido.
    await page.getByTestId('demo-resident').click()
    await expect(page).toHaveURL(/#\/inicio$/)
    await open(page, '/comunidade/nova')
    await page.getByLabel('O que você quer compartilhar?').fill('Publicação de teste da leitura.')
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page).toHaveURL(/#\/comunidade\/pst_/)
    await expect.poll(() => spoken(page)).toMatch(/Publica(ção|do)/)
  })
})

test.describe('Mobilidade acessível', () => {
  test('mostra os ônibus acessíveis e filtra por recurso e por bairro', async ({ page }) => {
    await signInDemo(page, 'resident')
    await page.getByRole('link', { name: /Mobilidade acessível/ }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mobilidade acessível' }),
    ).toBeVisible()

    const line401 = page.getByRole('heading', { name: /Linha 401/ })
    await expect(page.getByRole('heading', { name: /Linha 101/ })).toBeVisible()
    await expect(line401).toBeVisible()
    await expect(page.getByText('8 linhas · 7 com ônibus acessíveis')).toBeVisible()

    // A linha sem elevador some quando o filtro "Acessíveis" está ligado.
    await page.getByRole('radio', { name: 'Acessíveis' }).click()
    await expect(line401).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Linha 402/ })).toBeVisible()

    await page.getByRole('radio', { name: 'Aviso sonoro' }).click()
    await expect(page.getByRole('heading', { name: /Linha 201/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Linha 102/ })).toHaveCount(0)

    // Busca pelo bairro, na lista com pesquisa.
    await page.getByRole('radio', { name: 'Todas' }).click()
    await page.getByRole('button', { name: /^Bairro/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Buscar bairro').fill('alto da')
    await dialog.getByRole('button', { name: 'Alto da Serra' }).click()
    await expect(line401).toBeVisible()
    await expect(page.getByRole('heading', { name: /Linha 101/ })).toHaveCount(0)
  })

  test('destaca escadas com o caminho alternativo e leva ao ponto no mapa', async ({ page }) => {
    await signInDemo(page, 'resident')
    await open(page, '/mobilidade?aba=caminho')
    await page.getByRole('radio', { name: 'Barreiras' }).click()

    const stairs = page.getByRole('listitem').filter({ hasText: 'Escadaria do Mirante' })
    await expect(stairs).toContainText('Barreira · Escadaria')
    await expect(stairs).toContainText('Atenção redobrada para quem é cego ou tem baixa visão')
    await expect(stairs).toContainText('Caminho alternativo:')
    await expect(page.getByText('Rampa da UBS Central')).toHaveCount(0)

    await stairs.getByRole('link', { name: 'Ver no mapa' }).click()
    await expect(page).toHaveURL(/#\/mapa\?foco=accessibility/)
    await expect(page.getByRole('heading', { name: 'Escadaria do Mirante' })).toBeVisible()
    await expect(page.locator('.leaflet-marker-icon[title="Escadaria do Mirante"]')).toHaveCount(1)
  })

  test('a simulação de percurso avisa da barreira por voz e na tela', async ({ page }) => {
    await recordSpeech(page)
    await signInDemo(page, 'resident')
    await open(page, '/mobilidade?aba=alertas')
    await page.getByRole('button', { name: 'Iniciar a simulação' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert).toContainText(/a \d+ m/)
    await expect.poll(() => spoken(page), { timeout: 15_000 }).toMatch(/Atenção: .+ a \d+ metros\./)

    await page.getByRole('button', { name: 'Parar a simulação' }).click()
    await expect(page.getByRole('button', { name: 'Iniciar a simulação' })).toBeVisible()
  })
})

test.describe('Locais acessíveis e bairros', () => {
  test('o comércio pode ser filtrado por acesso sem degraus e por bairro', async ({ page }) => {
    await signInDemo(page, 'resident')
    await open(page, '/comercio')
    await expect(page.getByRole('link', { name: /Ateliê Flor de Chita/ })).toBeVisible()

    await page.getByRole('button', { name: 'Sem degraus' }).click()
    await expect(page.getByRole('link', { name: /Ateliê Flor de Chita/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Padaria do Bairro/ })).toBeVisible()

    await page.getByRole('button', { name: /^Bairro/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Buscar bairro').fill('centro')
    await dialog.getByRole('button', { name: 'Centro' }).click()
    await expect(page.getByRole('link', { name: /Padaria do Bairro/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Farmácia Popular/ })).toBeVisible()

    await page.getByRole('link', { name: /Farmácia Popular/ }).click()
    const section = page.getByRole('region', { name: 'Acessibilidade' })
    await expect(section).toContainText('Rampa de acesso')
    await expect(section).toContainText('Informações em braille')
  })

  test('a busca de bairros encontra pelo nome sem acento e pela região', async ({ page }) => {
    await signInDemo(page, 'resident')
    await open(page, '/perfil/editar')
    await page.getByLabel('Bairro').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('32 bairros encontrados')).toBeVisible()

    await dialog.getByLabel('Buscar bairro').fill('zona leste')
    await expect(dialog.getByText('7 bairros encontrados')).toBeVisible()
    await dialog.getByLabel('Buscar bairro').fill('sao fr')
    await expect(dialog.getByText('1 bairro encontrado')).toBeVisible()
    await dialog.getByRole('button', { name: 'São Francisco' }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await open(page, '/perfil')
    await expect(page.getByText('Morador · São Francisco')).toBeVisible()
  })
})
