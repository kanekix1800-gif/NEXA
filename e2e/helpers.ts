import { expect, type Page } from '@playwright/test'

export type DemoRole = 'resident' | 'merchant' | 'institution' | 'admin'

/** Abre uma rota interna (roteamento por hash). */
export async function open(page: Page, route: string): Promise<void> {
  await page.goto(`/#${route}`)
}

/** Entra com um perfil demonstrativo pelo acesso rápido da tela de login. */
export async function signInDemo(page: Page, role: DemoRole): Promise<void> {
  await open(page, '/entrar')
  await page.getByTestId(`demo-${role}`).click()
  await expect(page).toHaveURL(/#\/inicio$/)
  await expect(page.getByRole('heading', { level: 1, name: /Olá, / })).toBeVisible()
}

/** Sai da conta pelo menu do perfil. */
export async function signOut(page: Page): Promise<void> {
  await open(page, '/perfil')
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/#\/entrar/)
}
