import { describe, expect, it } from 'vitest'

import { detectIntent, QUICK_PROMPTS } from './assistant'

describe('NEXA IA — identificação da intenção', () => {
  it('cada sugestão pronta leva à resposta do próprio assunto', () => {
    const expected: Record<string, string> = {
      services: 'services',
      commerce: 'commerce',
      rights: 'rights',
      demand: 'demand',
      events: 'events',
      accessibility: 'transit',
      business: 'business',
    }
    for (const prompt of QUICK_PROMPTS) {
      expect([prompt.id, detectIntent(prompt.prompt)]).toEqual([prompt.id, expected[prompt.id]])
    }
  })

  it('perguntas sobre ônibus e barreiras não caem em comércio', () => {
    expect(detectIntent('Quais ônibus passam perto de mim?')).toBe('transit')
    expect(detectIntent('Qual linha de ônibus tem piso baixo?')).toBe('transit')
    expect(detectIntent('Tem escada perto de mim?')).toBe('barriers')
    expect(detectIntent('Onde tem rampa e piso tátil?')).toBe('barriers')
    expect(detectIntent('Sou cega, quais barreiras existem no caminho?')).toBe('barriers')
  })

  it('assuntos antigos continuam indo para o lugar certo', () => {
    expect(detectIntent('Sugira comércios perto de mim.')).toBe('commerce')
    expect(detectIntent('Qual restaurante tem acesso para cadeira de rodas?')).toBe('commerce')
    expect(detectIntent('Como registro uma demanda?')).toBe('demand')
    expect(detectIntent('Como está o meu negócio?')).toBe('business')
    expect(detectIntent('xyz')).toBe('unknown')
  })
})
