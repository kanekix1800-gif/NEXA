import { beforeEach, describe, expect, it } from 'vitest'

import { groupNeighborhoods, searchNeighborhoods } from '@/components/domain/NeighborhoodPicker'
import type { Neighborhood } from '@/types'

import { accessibleName, describeElement, readableText } from './describe'
import {
  applyPreset,
  applyToDocument,
  clearPreset,
  countActivePreferences,
  DEFAULT_PREFERENCES,
  getPreferences,
  isPresetActive,
  PRESETS,
  resetPreferences,
  sanitizePreferences,
  subscribeToPreferences,
  updatePreferences,
} from './preferences'
import { sortPortugueseVoices, splitForSpeech } from './speech'

function preset(key: string) {
  const found = PRESETS.find((item) => item.key === key)
  if (!found) throw new Error(`perfil ${key} não existe`)
  return found
}

describe('preferências de acessibilidade', () => {
  beforeEach(() => {
    resetPreferences()
  })

  it('começa com tudo no padrão', () => {
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES)
    expect(countActivePreferences(getPreferences())).toBe(0)
  })

  it('grava no aparelho e avisa quem está ouvindo', () => {
    let calls = 0
    const unsubscribe = subscribeToPreferences(() => {
      calls += 1
    })
    updatePreferences({ textScale: 'xlarge', contrast: 'high' })
    unsubscribe()
    updatePreferences({ sounds: true })

    expect(calls).toBe(1)
    expect(getPreferences()).toMatchObject({ textScale: 'xlarge', contrast: 'high', sounds: true })
    expect(JSON.parse(localStorage.getItem('nexa:acessibilidade') ?? '{}')).toMatchObject({
      textScale: 'xlarge',
      sounds: true,
    })
    expect(countActivePreferences(getPreferences())).toBe(3)
  })

  it('descarta valores inválidos e limita a velocidade e o volume', () => {
    const clean = sanitizePreferences({
      textScale: 'gigante',
      contrast: 'high',
      font: 'comic',
      speechRate: 9,
      speechPitch: -3,
      soundVolume: 'alto',
      sounds: 'sim',
      highlights: ['libras', 'teletransporte', 'libras'],
      voiceURI: '',
      campoDesconhecido: true,
    })
    expect(clean).toMatchObject({
      textScale: 'normal',
      contrast: 'high',
      font: 'default',
      speechRate: 2,
      speechPitch: 0.5,
      soundVolume: DEFAULT_PREFERENCES.soundVolume,
      sounds: false,
      highlights: ['libras'],
      voiceURI: null,
    })
    expect(clean).not.toHaveProperty('campoDesconhecido')
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(sanitizePreferences('texto')).toEqual(DEFAULT_PREFERENCES)
  })

  it('aplica as opções visuais como atributos do documento e remove ao desligar', () => {
    const root = document.createElement('html')
    applyToDocument(
      sanitizePreferences({
        textScale: 'large',
        contrast: 'high',
        font: 'dyslexia',
        textSpacing: true,
        strongFocus: true,
        motion: 'reduced',
      }),
      root,
    )
    expect(root.dataset).toMatchObject({
      textScale: 'large',
      contrast: 'high',
      font: 'dyslexia',
      textSpacing: 'wide',
      focus: 'strong',
      motion: 'reduce',
    })
    applyToDocument(DEFAULT_PREFERENCES, root)
    expect(Object.keys(root.dataset)).toEqual([])
  })

  it('o perfil para pessoas cegas liga voz, sons, vibração e alertas de barreiras', () => {
    const blind = preset('blind')
    expect(isPresetActive(getPreferences(), blind)).toBe(false)
    applyPreset(blind)
    expect(getPreferences()).toMatchObject({
      announceScreens: true,
      speakOnTouch: true,
      speakNotices: true,
      sounds: true,
      haptics: true,
      proximityAlerts: true,
    })
    expect(isPresetActive(getPreferences(), blind)).toBe(true)
  })

  it('perfis somam os destaques de mobilidade e desligar um não apaga o outro', () => {
    updatePreferences({ highlights: ['libras'] })
    applyPreset(preset('motor'))
    expect(getPreferences().highlights.sort()).toEqual(
      ['accessible_transit', 'libras', 'step_free'].sort(),
    )
    clearPreset(preset('motor'))
    expect(getPreferences().highlights).toEqual(['libras'])
    expect(getPreferences().textScale).toBe('normal')
  })

  it('todo perfil pronto altera pelo menos uma opção válida', () => {
    for (const item of PRESETS) {
      resetPreferences()
      applyPreset(item)
      expect(countActivePreferences(getPreferences())).toBeGreaterThan(0)
      expect(isPresetActive(getPreferences(), item)).toBe(true)
    }
  })
})

describe('voz', () => {
  it('divide textos longos em trechos curtos, cortando no fim das frases', () => {
    const text = 'Primeira frase curta. Segunda frase também curta! Terceira? Sim.'
    expect(splitForSpeech(text, 30)).toEqual([
      'Primeira frase curta.',
      'Segunda frase também curta!',
      'Terceira? Sim.',
    ])
    expect(splitForSpeech('   ')).toEqual([])
    expect(splitForSpeech('Curta.')).toEqual(['Curta.'])
  })

  it('corta frases maiores que o limite sem perder palavras', () => {
    const long = Array.from({ length: 60 }, (_, index) => `palavra${index}`).join(' ')
    const chunks = splitForSpeech(long, 80)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true)
    expect(chunks.join(' ')).toBe(long)
  })

  it('prefere vozes do Brasil e, entre elas, as instaladas no aparelho', () => {
    const voices = [
      { name: 'Joana', lang: 'pt-PT', localService: true },
      { name: 'English', lang: 'en-US', localService: true },
      { name: 'Online BR', lang: 'pt-BR', localService: false },
      { name: 'Luciana', lang: 'pt_BR', localService: true },
    ]
    expect(sortPortugueseVoices(voices).map((voice) => voice.name)).toEqual([
      'Luciana',
      'Online BR',
      'Joana',
    ])
  })
})

describe('descrição falada dos elementos', () => {
  function render(html: string): HTMLElement {
    document.body.innerHTML = html
    return document.body
  }

  it('diz o nome e o tipo de botões, links e títulos', () => {
    const body = render(`
      <button id="b"><svg aria-hidden="true"></svg> Registrar demanda</button>
      <a id="l" href="#/demandas">Demandas</a>
      <h1 id="h">Mobilidade acessível</h1>
      <button id="i" aria-label="Fechar"><svg></svg></button>
    `)
    expect(describeElement(body.querySelector('#b'))).toBe('Registrar demanda, botão')
    expect(describeElement(body.querySelector('#l'))).toBe('Demandas, link')
    expect(describeElement(body.querySelector('#h'))).toBe('Mobilidade acessível, título')
    expect(describeElement(body.querySelector('#i'))).toBe('Fechar, botão')
  })

  it('toque em um ícone dentro do botão fala o botão inteiro', () => {
    const body = render(`<button><span id="dentro">Ouvir</span> tela</button>`)
    expect(describeElement(body.querySelector('#dentro'))).toBe('Ouvir tela, botão')
  })

  it('informa o estado de chaves, caixas e opções', () => {
    const body = render(`
      <label for="s">Alto contraste</label>
      <button id="s" role="switch" aria-checked="true"></button>
      <label><input id="c" type="checkbox" /> Atendimento em Libras</label>
      <button id="r" role="radio" aria-checked="true">Grande</button>
      <button id="d" disabled>Enviar</button>
    `)
    expect(describeElement(body.querySelector('#s'))).toBe('Alto contraste, chave, ligado')
    expect(describeElement(body.querySelector('#c'))).toBe(
      'Atendimento em Libras, caixa de seleção, não marcado',
    )
    expect(describeElement(body.querySelector('#r'))).toBe('Grande, opção, selecionado')
    expect(describeElement(body.querySelector('#d'))).toBe('Enviar, botão, indisponível')
  })

  it('lê o rótulo e o conteúdo dos campos, sem revelar senhas', () => {
    const body = render(`
      <label for="n">Nome completo</label><input id="n" value="Ana Costa" />
      <label for="p">Senha</label><input id="p" type="password" value="segredo123" />
      <label for="v">Bairro</label><input id="v" value="" />
    `)
    expect(describeElement(body.querySelector('#n'))).toBe(
      'Nome completo, campo de texto, Ana Costa',
    )
    expect(describeElement(body.querySelector('#p'))).toBe('Senha, campo de texto, preenchido')
    expect(describeElement(body.querySelector('#v'))).toBe('Bairro, campo de texto, vazio')
  })

  it('ignora áreas vazias e conteúdo oculto de leitores de tela', () => {
    const body = render(`
      <div id="vazio"></div>
      <div aria-hidden="true"><p id="oculto">Decoração</p></div>
      <p id="p">Texto <span aria-hidden="true">★</span> simples</p>
    `)
    expect(describeElement(body.querySelector('#vazio'))).toBeNull()
    expect(describeElement(body.querySelector('#oculto'))).toBeNull()
    expect(describeElement(body.querySelector('#p'))).toBe('Texto simples')
    expect(describeElement(null)).toBeNull()
  })

  it('usa aria-labelledby e a descrição de imagens', () => {
    const body = render(`
      <span id="titulo">Linha 101</span>
      <section><button id="b" aria-labelledby="titulo">Ouvir</button></section>
      <img id="img" alt="Mapa do bairro" />
    `)
    expect(accessibleName(body.querySelector('#b')!)).toBe('Linha 101')
    expect(describeElement(body.querySelector('#img'))).toBe('Mapa do bairro, imagem')
  })

  it('monta o texto completo da tela para a leitura do começo ao fim', () => {
    const body = render(`
      <main>
        <h1>Demandas</h1>
        <p>Problemas do bairro.</p>
        <button aria-label="Abrir o mapa"><svg></svg></button>
        <span aria-hidden="true">decoração</span>
        <div data-no-read>Ouvir tela</div>
        <ul><li>Buraco na rua</li><li>Poste apagado</li></ul>
      </main>
    `)
    const text = readableText(body.querySelector('main'))
    expect(text).toBe('Demandas. Problemas do bairro. Abrir o mapa. Buraco na rua. Poste apagado.')
    expect(readableText(null)).toBe('')
  })
})

describe('seletor de bairros', () => {
  const list: Neighborhood[] = [
    { id: 'a', name: 'Vila Esperança', zone: 'Zona Norte', center: { lat: 0, lng: 0 } },
    { id: 'b', name: 'Centro', zone: 'Região Central', center: { lat: 0, lng: 0 } },
    { id: 'c', name: 'São José', zone: 'Zona Norte', center: { lat: 0, lng: 0 } },
    { id: 'd', name: 'Sem Região', center: { lat: 0, lng: 0 } },
  ]

  it('agrupa por região, com o centro primeiro e os bairros em ordem alfabética', () => {
    expect(
      groupNeighborhoods(list).map((group) => [group.zone, group.items.map((nb) => nb.name)]),
    ).toEqual([
      ['Região Central', ['Centro']],
      ['Zona Norte', ['São José', 'Vila Esperança']],
      ['Outros bairros', ['Sem Região']],
    ])
  })

  it('busca pelo nome ou pela região, sem diferenciar acentos e maiúsculas', () => {
    expect(searchNeighborhoods(list, 'sao jo').map((nb) => nb.id)).toEqual(['c'])
    expect(searchNeighborhoods(list, 'ESPERANCA').map((nb) => nb.id)).toEqual(['a'])
    expect(searchNeighborhoods(list, 'zona norte').map((nb) => nb.id)).toEqual(['a', 'c'])
    expect(searchNeighborhoods(list, 'xyz')).toEqual([])
    expect(searchNeighborhoods(list, '')).toHaveLength(4)
  })
})
