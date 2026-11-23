import { DEMO_ACCOUNTS } from '@/data/demoAccounts'
import { defaultSettings } from '@/repositories/local/context'
import type { AvatarSpec, User, UserSettings } from '@/types'

import { BUSINESSES, INSTITUTIONS, NEIGHBORHOODS, PEOPLE, type PersonKey } from '../cast'
import type { SeedContext } from '../context'

/** Aparência ilustrada de cada pessoa do elenco (sem fotos de pessoas reais). */
const AVATARS: Record<PersonKey, AvatarSpec> = {
  antonio: {
    skin: 'tan',
    hair: 'short',
    hairColor: 'brown',
    facialHair: 'mustache',
    top: 'green',
    background: 'mint',
  },
  maria: {
    skin: 'tan',
    hair: 'wavy',
    hairColor: 'chestnut',
    accessory: 'earrings',
    top: 'terracotta',
    background: 'peach',
  },
  joao: {
    skin: 'brown',
    hair: 'buzz',
    hairColor: 'black',
    facialHair: 'beard',
    top: 'navy',
    background: 'sky',
  },
  ana: {
    skin: 'light',
    hair: 'bob',
    hairColor: 'blonde',
    accessory: 'glasses',
    top: 'teal',
    background: 'sage',
  },
  pedro: { skin: 'medium', hair: 'short', hairColor: 'black', top: 'orange', background: 'sand' },
  juliana: {
    skin: 'brown',
    hair: 'curly',
    hairColor: 'black',
    accessory: 'earrings',
    top: 'cream',
    background: 'peach',
  },
  carlos: {
    skin: 'dark',
    hair: 'afro',
    hairColor: 'black',
    facialHair: 'beard',
    top: 'green',
    background: 'sage',
  },
  fernanda: { skin: 'light', hair: 'long', hairColor: 'red', top: 'navy', background: 'mint' },
  rafael: {
    skin: 'medium',
    hair: 'short',
    hairColor: 'chestnut',
    accessory: 'glasses',
    top: 'teal',
    background: 'sky',
  },
  beatriz: { skin: 'tan', hair: 'bun', hairColor: 'brown', top: 'orange', background: 'sand' },
  luiz: {
    skin: 'brown',
    hair: 'bald',
    hairColor: 'gray',
    facialHair: 'mustache',
    top: 'cream',
    background: 'sage',
  },
  camila: {
    skin: 'medium',
    hair: 'long',
    hairColor: 'black',
    accessory: 'earrings',
    top: 'terracotta',
    background: 'mint',
  },
  carla: { skin: 'tan', hair: 'bun', hairColor: 'chestnut', top: 'orange', background: 'peach' },
  marcos: {
    skin: 'light',
    hair: 'short',
    hairColor: 'gray',
    accessory: 'glasses',
    top: 'teal',
    background: 'sky',
  },
  lucia: {
    skin: 'brown',
    hair: 'curly',
    hairColor: 'gray',
    accessory: 'earrings',
    top: 'green',
    background: 'sand',
  },
  paulo: {
    skin: 'medium',
    hair: 'buzz',
    hairColor: 'black',
    facialHair: 'beard',
    top: 'cream',
    background: 'peach',
  },
  patricia: {
    skin: 'light',
    hair: 'wavy',
    hairColor: 'blonde',
    accessory: 'earrings',
    top: 'terracotta',
    background: 'sage',
  },
  diego: {
    skin: 'tan',
    hair: 'short',
    hairColor: 'black',
    accessory: 'glasses',
    top: 'navy',
    background: 'sky',
  },
  heloisa: {
    skin: 'brown',
    hair: 'afro',
    hairColor: 'black',
    accessory: 'earrings',
    top: 'orange',
    background: 'mint',
  },
  bruno: {
    skin: 'light',
    hair: 'curly',
    hairColor: 'brown',
    facialHair: 'beard',
    top: 'green',
    background: 'sand',
  },
  roberto: { skin: 'medium', hair: 'short', hairColor: 'gray', top: 'navy', background: 'sage' },
  sandra: {
    skin: 'tan',
    hair: 'bob',
    hairColor: 'chestnut',
    accessory: 'glasses',
    top: 'teal',
    background: 'peach',
  },
  jorge: {
    skin: 'dark',
    hair: 'buzz',
    hairColor: 'gray',
    facialHair: 'mustache',
    top: 'cream',
    background: 'sky',
  },
  helena: {
    skin: 'light',
    hair: 'long',
    hairColor: 'brown',
    accessory: 'glasses',
    top: 'green',
    background: 'mint',
  },
}

/** Biografias curtas dos perfis principais. */
const BIOS: Partial<Record<PersonKey, string>> = {
  antonio:
    'Morador da Vila Esperança há 12 anos. Gosto de ver o bairro cuidado e de apoiar o comércio daqui.',
  maria: 'Professora, mãe de dois e vizinha atenta. Sempre disposta a ajudar nos mutirões.',
  joao: 'Trabalho no Centro e participo de ações de arrecadação de alimentos aos fins de semana.',
  ana: 'Engenheira ambiental. Cuido da horta da praça e organizo mutirões no Jardim das Flores.',
  carlos: 'Técnico de futebol da garotada do Alto da Serra.',
  juliana:
    'Atravesso o Centro a pé todo dia. Acessibilidade e segurança no trânsito são prioridade.',
  carla:
    'Padeira há 15 anos. A Padaria do Bairro é a minha segunda casa e a de muita gente da Vila.',
  marcos: 'Farmacêutico responsável pela Farmácia Popular, atendendo o Centro há mais de 20 anos.',
  paulo: 'Cozinheiro de forno e fogão. Comida caseira feita com carinho no coração do Centro.',
  heloisa:
    'Costureira e artesã. Cada peça do ateliê é feita à mão, com chita e muita memória afetiva.',
  roberto: 'Conta institucional de demonstração da Prefeitura Municipal. Nenhuma ação aqui é real.',
  sandra: 'Coordenadora de projetos da ONG Viva Melhor. Conta de demonstração.',
  jorge: 'Presidente da Associação de Moradores da Vila Esperança. Conta de demonstração.',
  helena: 'Equipe NEXA: cuido da moderação e da qualidade da comunidade.',
}

/** Dias atrás em que cada conta foi criada (espalhado pelos últimos 6 meses). */
const CREATED_DAYS_AGO: Record<PersonKey, number> = {
  antonio: 176,
  maria: 168,
  joao: 150,
  ana: 161,
  pedro: 118,
  juliana: 132,
  carlos: 97,
  fernanda: 84,
  rafael: 73,
  beatriz: 61,
  luiz: 42,
  camila: 29,
  carla: 174,
  marcos: 158,
  lucia: 140,
  paulo: 126,
  patricia: 109,
  diego: 95,
  heloisa: 79,
  bruno: 55,
  roberto: 178,
  sandra: 146,
  jorge: 135,
  helena: 180,
}

function isPersonKey(key: string): key is PersonKey {
  return key in PEOPLE
}

export function buildUsers(ctx: SeedContext): { users: User[]; userSettings: UserSettings[] } {
  const users: User[] = []
  for (const [key, person] of Object.entries(PEOPLE)) {
    if (!isPersonKey(key)) continue
    const createdAt = ctx.at(-CREATED_DAYS_AGO[key], 10, 15)
    const business = 'business' in person ? BUSINESSES[person.business] : undefined
    const institution = 'institution' in person ? INSTITUTIONS[person.institution] : undefined
    const isDemo = 'demo' in person && person.demo === true
    const bio = BIOS[key]

    users.push({
      id: person.id,
      name: person.name,
      username: person.username,
      email: isDemo ? DEMO_ACCOUNTS[person.role].email : `${person.username}@nexa.demo`,
      role: person.role,
      neighborhoodId: NEIGHBORHOODS[person.neighborhood].id,
      ...(bio ? { bio } : {}),
      avatar: AVATARS[key],
      ...(business ? { businessId: business.id } : {}),
      ...(institution ? { institutionId: institution.id } : {}),
      status: 'active',
      isDemoAccount: isDemo,
      termsAcceptedAt: createdAt,
      createdAt,
    })
  }

  const userSettings = users.map((user) => defaultSettings(user.id, user.createdAt))
  return { users, userSettings }
}
