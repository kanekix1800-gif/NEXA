import { expect, test } from '@playwright/test'

import { open, signInDemo } from './helpers'

/** Verificações de layout em tela grande (projeto "desktop"). */
test.describe('Interface responsiva (desktop)', () => {
  test('mostra a barra lateral e esconde a navegação inferior', async ({ page }) => {
    await signInDemo(page, 'resident')
    const sidebar = page.getByRole('complementary')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Mapa inteligente' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toBeVisible()

    // A navegação pela barra lateral funciona.
    await sidebar.getByRole('link', { name: 'Comércio Local' }).click()
    await expect(page).toHaveURL(/#\/comercio$/)
    await expect(page.getByRole('heading', { name: 'Comércio Local' })).toBeVisible()
  })

  test('o comerciante vê a seção NEXA Business e o painel em colunas', async ({ page }) => {
    await signInDemo(page, 'merchant')
    await open(page, '/business')
    await expect(page.getByRole('complementary').getByText('NEXA Business')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Evolução das vendas' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Distribuição de despesas' })).toBeVisible()
  })

  test('não há rolagem horizontal nas telas principais', async ({ page }) => {
    await signInDemo(page, 'resident')
    for (const route of [
      '/inicio',
      '/comunidade',
      '/demandas',
      '/comercio',
      '/eventos',
      '/instituicoes',
      '/perfil',
    ]) {
      await open(page, route)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, `rolagem horizontal em ${route}`).toBeLessThanOrEqual(1)
    }
  })
})
