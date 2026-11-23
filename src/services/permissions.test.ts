import { describe, expect, it } from 'vitest'

import type { User, UserRole } from '@/types'

import { can } from './permissions'

function actor(role: UserRole, overrides: Partial<User> = {}): User {
  return {
    id: `usr_${role}`,
    name: 'Pessoa Teste',
    username: `teste_${role}`,
    email: `${role}@nexa.demo`,
    role,
    neighborhoodId: 'nb_centro',
    avatar: {
      skin: 'medium',
      hair: 'short',
      hairColor: 'black',
      top: 'green',
      background: 'mint',
    },
    status: 'active',
    isDemoAccount: false,
    createdAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  }
}

const resident = actor('resident')
const merchant = actor('merchant', { businessId: 'biz_1' })
const merchantWithoutBusiness = actor('merchant')
const institution = actor('institution', { institutionId: 'ins_1' })
const admin = actor('admin')

describe('permissões por perfil', () => {
  it('nega tudo para visitantes e contas suspensas', () => {
    expect(can(null, 'post:create')).toBe(false)
    expect(can(undefined, 'demand:create')).toBe(false)
    expect(can(actor('admin', { status: 'suspended' }), 'admin:access')).toBe(false)
    expect(can(actor('resident', { status: 'suspended' }), 'post:create')).toBe(false)
  })

  it('permite a qualquer perfil ativo publicar, registrar demanda e criar evento', () => {
    for (const user of [resident, merchant, institution, admin]) {
      expect(can(user, 'post:create')).toBe(true)
      expect(can(user, 'demand:create')).toBe(true)
      expect(can(user, 'event:create')).toBe(true)
    }
  })

  it('só o autor ou a administração excluem uma publicação', () => {
    expect(can(resident, 'post:delete', { ownerId: resident.id })).toBe(true)
    expect(can(resident, 'post:delete', { ownerId: 'outra_pessoa' })).toBe(false)
    expect(can(resident, 'post:delete')).toBe(false)
    expect(can(admin, 'post:delete', { ownerId: 'outra_pessoa' })).toBe(true)
  })

  it('restringe o status institucional à instituição responsável e à administração', () => {
    const demand = { ownerId: resident.id, institutionId: 'ins_1', isOpen: true }
    expect(can(institution, 'demand:manage', demand)).toBe(true)
    expect(can(admin, 'demand:manage', demand)).toBe(true)
    expect(can(resident, 'demand:manage', demand)).toBe(false)
    expect(can(merchant, 'demand:manage', demand)).toBe(false)
    // Instituição diferente da responsável não pode atualizar.
    expect(can(actor('institution', { institutionId: 'ins_2' }), 'demand:manage', demand)).toBe(
      false,
    )
    // Demanda sem instituição responsável: só a administração.
    expect(can(institution, 'demand:manage', { ownerId: resident.id })).toBe(false)
  })

  it('permite ao autor encerrar a própria demanda apenas enquanto estiver em aberto', () => {
    expect(can(resident, 'demand:close', { ownerId: resident.id, isOpen: true })).toBe(true)
    expect(can(resident, 'demand:close', { ownerId: resident.id, isOpen: false })).toBe(false)
    expect(can(resident, 'demand:close', { ownerId: 'outra_pessoa', isOpen: true })).toBe(false)
  })

  it('impede o autor de apoiar a própria demanda', () => {
    expect(can(resident, 'demand:support', { ownerId: resident.id })).toBe(false)
    expect(can(resident, 'demand:support', { ownerId: 'outra_pessoa' })).toBe(true)
  })

  it('mantém o NEXA Business privado ao proprietário do estabelecimento', () => {
    expect(can(merchant, 'business:panel')).toBe(true)
    expect(can(merchantWithoutBusiness, 'business:panel')).toBe(false)
    expect(can(admin, 'business:panel')).toBe(false)
    // Sem informar o negócio, a gestão é sempre negada.
    expect(can(merchant, 'business:manage')).toBe(false)
    expect(can(merchant, 'business:manage', { businessId: 'biz_1' })).toBe(true)
    expect(can(merchant, 'business:manage', { businessId: 'biz_2' })).toBe(false)
    expect(can(merchantWithoutBusiness, 'business:manage')).toBe(false)
    expect(can(resident, 'business:manage', { businessId: 'biz_1' })).toBe(false)
    // Nem a administração acessa os dados financeiros de um comerciante.
    expect(can(admin, 'business:manage', { businessId: 'biz_1' })).toBe(false)
  })

  it('permite cadastrar estabelecimento apenas a comerciantes sem negócio', () => {
    expect(can(merchantWithoutBusiness, 'business:create')).toBe(true)
    expect(can(merchant, 'business:create')).toBe(false)
    expect(can(resident, 'business:create')).toBe(false)
  })

  it('impede o proprietário de avaliar o próprio estabelecimento', () => {
    expect(can(merchant, 'business:review', { ownerId: merchant.id })).toBe(false)
    expect(can(resident, 'business:review', { ownerId: merchant.id })).toBe(true)
  })

  it('reserva o painel institucional e as iniciativas às contas institucionais', () => {
    expect(can(institution, 'institution:panel')).toBe(true)
    expect(can(institution, 'initiative:publish')).toBe(true)
    expect(can(actor('institution'), 'institution:panel')).toBe(false)
    expect(can(resident, 'institution:panel')).toBe(false)
    expect(can(admin, 'institution:panel')).toBe(false)
    expect(can(institution, 'initiative:manage', { institutionId: 'ins_1' })).toBe(true)
    expect(can(institution, 'initiative:manage', { institutionId: 'ins_2' })).toBe(false)
  })

  it('reserva as ferramentas administrativas à administração', () => {
    const adminOnly = [
      'admin:access',
      'category:manage',
      'user:manage',
      'content:moderate',
      'demand:assign',
      'demand:delete',
      'event:delete',
      'institution:verify',
    ] as const
    for (const permission of adminOnly) {
      expect(can(admin, permission)).toBe(true)
      for (const user of [resident, merchant, institution]) {
        expect(can(user, permission)).toBe(false)
      }
    }
  })
})
