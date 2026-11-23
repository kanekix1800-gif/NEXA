import { expect, test } from '@playwright/test'

import { open, signInDemo, signOut } from './helpers'

test.describe('Fluxo A — morador registra um problema', () => {
  test('registra a demanda, encontra na lista, no feed e no mapa, e ela persiste', async ({
    page,
  }) => {
    const title = 'Buraco perigoso na esquina da escola'
    await signInDemo(page, 'resident')

    // Abre Demandas pela tela inicial e inicia o registro.
    await page
      .getByRole('navigation', { name: 'Acessos rápidos' })
      .getByRole('link', { name: 'Demandas' })
      .click()
    await expect(page).toHaveURL(/#\/demandas$/)
    await page.getByRole('link', { name: 'Registrar demanda' }).first().click()

    // Etapa 1: categoria.
    await page.getByRole('radio', { name: 'Buraco na rua' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Etapa 2: relato + sugestões da NEXA IA.
    await page.getByLabel('Título').fill(title)
    await page
      .getByLabel('Descrição')
      .fill(
        'Há um buraco grande no asfalto, com risco de acidente para crianças que saem da escola.',
      )
    await page.getByRole('button', { name: 'Pedir sugestões à NEXA IA' }).click()
    await expect(page.getByText('Sugestões da NEXA IA')).toBeVisible()
    await expect(page.getByText(/Prioridade sugerida/)).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Etapa 3: local no mapa.
    const map = page.getByRole('region', { name: 'Mapa para selecionar o local' })
    await expect(map).toBeVisible()
    await map.click({ position: { x: 150, y: 120 } })
    await expect(page.getByText('Local marcado. Arraste o alfinete para ajustar.')).toBeVisible()
    await page.getByRole('button', { name: 'Enviar demanda' }).click()

    // Confirmação com protocolo.
    await expect(page.getByRole('heading', { name: 'Demanda registrada!' })).toBeVisible()
    await expect(page.getByText(/NX-\d{4}-\d{4}/)).toBeVisible()

    // Acompanhamento: status e histórico.
    await page.getByRole('link', { name: 'Acompanhar demanda' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('Registrada').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Histórico de atualizações' })).toBeVisible()
    await expect(page.getByText('Simulação').first()).toBeVisible()

    // Listagem.
    await open(page, '/demandas')
    await page.getByLabel('Buscar demandas').fill('esquina da escola')
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // Feed da comunidade.
    await open(page, '/comunidade')
    await expect(page.getByText(`Registrei uma demanda: ${title}`)).toBeVisible()

    // Mapa: o marcador da nova demanda existe.
    await open(page, '/mapa?camada=demands')
    await expect(page.locator(`.leaflet-marker-icon[title="${title}"]`)).toHaveCount(1)

    // Persistência: após recarregar, a sessão e a demanda continuam lá.
    await open(page, '/perfil/demandas')
    await page.reload()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })
})

test.describe('Fluxo B — participação comunitária', () => {
  test('publica, curte, comenta e filtra o feed', async ({ page }) => {
    const content = 'Alguém indica um bom chaveiro aqui na Vila Esperança?'
    await signInDemo(page, 'resident')
    await open(page, '/comunidade')

    // Cria uma publicação.
    await page.getByRole('link', { name: 'Criar publicação' }).click()
    await page.getByLabel('O que você quer compartilhar?').fill(content)
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page).toHaveURL(/#\/comunidade\/pst_/)
    await expect(page.getByText(content)).toBeVisible()

    // Curte a publicação de outra pessoa.
    await open(page, '/comunidade')
    const post = page.getByRole('article').filter({ hasText: 'posto de saúde do bairro' })
    const like = post.getByRole('button', { name: 'Curtir' })
    const before = Number((await like.innerText()).trim())
    await like.click()
    await expect(post.getByRole('button', { name: 'Descurtir' })).toHaveText(String(before + 1))

    // Comenta.
    await post.getByRole('link', { name: 'Abrir publicação' }).click()
    await page.getByLabel('Novo comentário').fill('Abre sim, das 7h ao meio-dia.')
    await page.getByRole('button', { name: 'Enviar comentário' }).click()
    await expect(page.getByText('Abre sim, das 7h ao meio-dia.')).toBeVisible()

    // Filtra o feed.
    await open(page, '/comunidade')
    await page.getByRole('radio', { name: 'Discussões' }).click()
    await expect(page.getByText(content)).toBeVisible()
    await expect(page.getByText('Vamos juntos na ação de arrecadação de alimentos!')).toHaveCount(0)
  })
})

test.describe('Fluxo C — descoberta comercial', () => {
  test('pesquisa, abre o estabelecimento, vê produtos, favorita e encontra a localização', async ({
    page,
  }) => {
    await signInDemo(page, 'resident')
    await page
      .getByRole('navigation', { name: 'Acessos rápidos' })
      .getByRole('link', { name: 'Comércio Local' })
      .click()

    // A busca por categoria encontra o estabelecimento.
    await page.getByLabel('Buscar estabelecimentos').fill('alimentação')
    const card = page.getByRole('link', { name: /Padaria do Bairro/ })
    await expect(card).toBeVisible()
    await expect(card).toContainText('500 m')
    await card.click()

    // Produtos e serviços.
    await expect(page.getByRole('heading', { name: 'Padaria do Bairro' })).toBeVisible()
    await expect(page.getByText('Pão francês', { exact: true })).toBeVisible()

    // Favoritos.
    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click()
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()

    // Localização.
    await expect(
      page.getByRole('region', { name: 'Localização de Padaria do Bairro' }),
    ).toBeVisible()
    await expect(page.getByText('Rua das Acácias, 120')).toBeVisible()

    // O favorito aparece no perfil.
    await open(page, '/perfil/favoritos')
    await expect(page.getByRole('link', { name: /Padaria do Bairro/ })).toBeVisible()
  })
})

test.describe('Fluxo D — gestão empresarial', () => {
  test('cadastra produto, registra venda e vê estoque e faturamento atualizados', async ({
    page,
  }) => {
    const product = 'Bolo de laranja E2E'
    await signInDemo(page, 'merchant')
    await open(page, '/business')
    await expect(page.getByRole('heading', { name: 'NEXA Business' })).toBeVisible()

    const revenue = page
      .locator('div')
      .filter({ hasText: /^Faturamento/ })
      .first()
    await expect(revenue).toContainText('R$')
    const parse = (text: string) =>
      Number((text.match(/R\$\s?([\d.]+,\d{2})/)?.[1] ?? '0').replace(/\./g, '').replace(',', '.'))
    const before = parse(await revenue.innerText())

    // Cadastra o produto.
    await open(page, '/business/produtos?novo=1')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome').fill(product)
    await dialog.getByLabel('Preço de venda').fill('12,50')
    await dialog.getByLabel('Quantidade em estoque').fill('6')
    await dialog.getByLabel('Estoque mínimo').fill('2')
    await dialog.getByRole('button', { name: 'Cadastrar produto' }).click()
    const row = page.getByRole('listitem').filter({ hasText: product })
    await expect(row).toContainText('Estoque: 6')

    // Registra a venda de 2 unidades.
    await open(page, '/business/vendas/nova')
    await page.getByLabel('Buscar produto').fill(product)
    const item = page.getByRole('listitem').filter({ hasText: product })
    await item.getByRole('button', { name: 'Aumentar' }).click()
    await item.getByRole('button', { name: 'Aumentar' }).click()
    await expect(page.getByText('R$ 25,00')).toBeVisible()
    await page.getByRole('button', { name: 'Registrar venda' }).click()
    await expect(page.getByRole('heading', { name: 'Venda registrada!' })).toBeVisible()

    // Estoque baixou automaticamente.
    await page.getByRole('link', { name: 'Conferir estoque' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: product })).toContainText(
      'Estoque: 4',
    )

    // Faturamento e histórico financeiro atualizados.
    await open(page, '/business')
    await expect.poll(async () => parse(await revenue.innerText())).toBeCloseTo(before + 25, 2)
    await open(page, '/business/financas')
    await expect(page.getByText('Venda — 1 item', { exact: true }).first()).toBeVisible()
  })
})

test.describe('Fluxo E — NEXA IA', () => {
  test('responde a uma sugestão com dados reais e leva ao recurso indicado', async ({ page }) => {
    await signInDemo(page, 'resident')
    await page
      .getByRole('navigation', { name: 'Acessos rápidos' })
      .getByRole('link', { name: 'NEXA IA' })
      .click()
    await expect(page.getByText('Olá, eu sou a NEXA IA!')).toBeVisible()
    await expect(page.getByText('Modo demonstração')).toBeVisible()

    await page.getByRole('button', { name: 'Sugerir comércios perto de mim' }).click()
    const reference = page.getByRole('link', { name: /Padaria do Bairro/ })
    await expect(reference).toBeVisible()
    await reference.click()
    await expect(page).toHaveURL(/#\/comercio\/biz_padaria$/)
    await expect(page.getByRole('heading', { name: 'Padaria do Bairro' })).toBeVisible()

    // O histórico da conversa é mantido.
    await open(page, '/ia')
    await expect(page.getByText('Sugira comércios perto de mim.')).toBeVisible()
  })
})

test.describe('Fluxo F — evento comunitário', () => {
  test('confirma participação, vê a contagem mudar e encontra o evento no perfil', async ({
    page,
  }) => {
    await signInDemo(page, 'resident')
    await page
      .getByRole('navigation', { name: 'Acessos rápidos' })
      .getByRole('link', { name: 'Eventos' })
      .click()
    await page.getByRole('link', { name: /Mutirão de Saúde/ }).click()

    const count = page.getByText(/pessoas? confirmadas?/)
    const confirm = page.getByRole('button', { name: 'Confirmar participação' })
    const cancel = page.getByRole('button', { name: 'Cancelar participação' })
    // Parte sempre do estado "sem presença confirmada", qualquer que seja a base demonstrativa.
    await expect(confirm.or(cancel)).toBeVisible()
    if (await cancel.isVisible()) {
      await cancel.click()
      await expect(confirm).toBeVisible()
    }
    const before = Number((await count.innerText()).match(/\d+/)?.[0] ?? '0')
    await confirm.click()
    await expect(page.getByText('Você confirmou presença')).toBeVisible()
    await expect(count).toContainText(String(before + 1))

    await open(page, '/perfil/eventos')
    await expect(page.getByRole('link', { name: /Mutirão de Saúde/ })).toBeVisible()

    // Cancelar a participação também atualiza a contagem.
    await page.getByRole('link', { name: /Mutirão de Saúde/ }).click()
    await cancel.click()
    await expect(confirm).toBeVisible()
    await expect(count).toContainText(String(before))
  })
})

test.describe('Permissões e modo demonstração', () => {
  test('áreas restritas recusam perfis sem permissão', async ({ page }) => {
    await signInDemo(page, 'resident')
    for (const route of ['/admin', '/business', '/painel-institucional']) {
      await open(page, route)
      await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible()
    }
  })

  test('sem sessão, rotas internas levam ao login', async ({ page }) => {
    await open(page, '/demandas')
    await expect(page).toHaveURL(/#\/entrar/)
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  })

  test('a instituição atualiza o status (simulado) e o morador é notificado', async ({ page }) => {
    await signInDemo(page, 'institution')
    await open(page, '/painel-institucional')
    await expect(page.getByRole('heading', { name: 'Painel institucional' })).toBeVisible()
    await page.getByRole('link', { name: /Bueiro entupido/ }).click()

    await page.getByRole('button', { name: 'Atualizar status' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Novo status').selectOption({ label: 'Em análise' })
    await dialog
      .getByLabel('Mensagem para a comunidade')
      .fill('Equipe técnica fará vistoria nesta semana.')
    await dialog.getByRole('button', { name: 'Publicar atualização' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Equipe técnica fará vistoria nesta semana.')).toBeVisible()
    await expect(page.getByText('Em análise', { exact: true }).first()).toBeVisible()

    // O morador autor da demanda recebe a notificação.
    await signOut(page)
    await page.getByTestId('demo-resident').click()
    await expect(page).toHaveURL(/#\/inicio$/)
    await open(page, '/notificacoes')
    await expect(page.getByText('Sua demanda recebeu uma nova atualização.').first()).toBeVisible()
  })

  test('o administrador modera uma publicação denunciada', async ({ page }) => {
    await signInDemo(page, 'admin')
    await open(page, '/admin')
    await expect(page.getByText('Usuários cadastrados')).toBeVisible()
    await open(page, '/admin/moderacao')
    const report = page.getByRole('listitem').filter({ hasText: 'Aberta' }).first()
    await report.getByRole('button', { name: 'Ocultar' }).click()
    await expect(page.getByText('Denúncia resolvida.')).toBeVisible()
  })

  test('restaurar os dados demonstrativos apaga o que foi criado', async ({ page }) => {
    const content = 'Publicação temporária para testar a restauração.'
    await signInDemo(page, 'resident')
    await open(page, '/comunidade/nova')
    await page.getByLabel('O que você quer compartilhar?').fill(content)
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page).toHaveURL(/#\/comunidade\/pst_/)
    await expect(page.getByText(content)).toBeVisible()

    await open(page, '/configuracoes')
    await page.getByRole('button', { name: 'Restaurar dados demonstrativos' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Restaurar' }).click()
    await expect(page).toHaveURL(/#\/entrar/)

    await page.getByTestId('demo-resident').click()
    await open(page, '/perfil/publicacoes')
    await expect(page.getByText(content)).toHaveCount(0)
  })

  test('cadastro com e-mail e senha cria conta e permite entrar de novo', async ({ page }) => {
    await open(page, '/cadastro')
    await page.getByRole('radio', { name: /Morador/ }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByLabel('Nome completo').fill('Teste da Silva')
    await page.getByLabel('E-mail').fill('teste.e2e@nexa.demo')
    await page.getByLabel(/^Senha/).fill('senha1234')
    await page.getByLabel('Bairro').click()
    const bairros = page.getByRole('dialog')
    await bairros.getByLabel('Buscar bairro').fill('centr')
    await bairros.getByRole('button', { name: 'Centro' }).click()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('heading', { name: 'Olá, Teste!' })).toBeVisible()

    await signOut(page)
    await page.getByLabel('E-mail').fill('teste.e2e@nexa.demo')
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada1')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
    await page.getByLabel('Senha', { exact: true }).fill('senha1234')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Olá, Teste!' })).toBeVisible()
  })
})

test.describe('Acesso por QR Code', () => {
  test('a abertura mostra o QR Code do aplicativo e o de cada perfil demonstrativo', async ({
    page,
  }) => {
    await open(page, '/')
    await page.getByRole('button', { name: 'Abrir em outro aparelho' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('img', { name: 'QR Code para abrir o NEXA' })).toBeVisible()
    await expect(dialog.getByText(/#\/$/)).toBeVisible()

    await dialog.getByRole('radio', { name: 'Comerciante' }).click()
    await expect(dialog.getByText(/#\/entrar\?demo=merchant$/)).toBeVisible()
  })

  test('o link de um perfil entra sem senha e troca o perfil de quem já está em outro', async ({
    page,
  }) => {
    await open(page, '/entrar?demo=resident')
    await expect(page).toHaveURL(/#\/inicio$/)
    await expect(page.getByRole('heading', { level: 1, name: /Olá, Antonio/ })).toBeVisible()

    // Mesmo aparelho, outro QR Code: passa a usar o perfil de comerciante.
    await open(page, '/entrar?demo=merchant')
    await expect(page).toHaveURL(/#\/inicio$/)
    await expect(page.getByRole('heading', { level: 1, name: /Olá, Carla/ })).toBeVisible()
  })
})
