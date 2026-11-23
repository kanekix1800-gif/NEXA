import { Check, Minus } from 'lucide-react'

import { paths } from '@/app/paths'
import {
  Badge,
  Button,
  Callout,
  IconTile,
  notify,
  Page,
  PageHeader,
  SectionHeader,
} from '@/components/ui'
import { useCurrentUser } from '@/contexts/AuthContext'
import { PLAN_COMPARISON, PLANS, PLANS_DISCLAIMER } from '@/data/plans'
import type { Plan, UserRole } from '@/types'
import { cn } from '@/utils/cn'

interface PlanAction {
  label: string
  title: string
  detail: string
}

const NO_CHARGE = 'Nesta fase não há contratação nem pagamento: os valores ainda serão definidos.'

/** O que o botão de cada plano diz para o perfil atual (nada aqui contrata ou cobra). */
function planAction(planId: Plan['id'], role: UserRole): PlanAction {
  if (planId === 'community') {
    return role === 'resident' || role === 'admin'
      ? {
          label: 'Plano atual',
          title: 'Este é o seu plano',
          detail: 'Você já usa os recursos gratuitos do NEXA.',
        }
      : {
          label: 'Incluído na sua conta',
          title: 'Recursos incluídos',
          detail: 'Os recursos da comunidade fazem parte de todas as contas.',
        }
  }
  if (planId === 'business_free') {
    return role === 'merchant'
      ? {
          label: 'Plano atual',
          title: 'Este é o seu plano',
          detail: 'As ferramentas gratuitas do NEXA Business já estão na sua conta.',
        }
      : {
          label: 'Gratuito para comerciantes',
          title: 'Disponível para comerciantes',
          detail:
            'Crie uma conta de comerciante para cadastrar o seu negócio e usar o NEXA Business.',
        }
  }
  const unlockedInDemo =
    (planId === 'business_premium' && role === 'merchant') ||
    (planId === 'institutional' && role === 'institution')
  return unlockedInDemo
    ? {
        label: 'Liberado na demonstração',
        title: 'Recursos liberados neste protótipo',
        detail: NO_CHARGE,
      }
    : { label: 'Tenho interesse', title: 'Plano em definição', detail: NO_CHARGE }
}

/** Planos e monetização: comparação demonstrativa (sem pagamentos reais). */
export default function PlansPage() {
  const user = useCurrentUser()
  return (
    <>
      <PageHeader title="Planos" variant="stack" backTo={paths.profile} width="wide" />
      <Page width="wide">
        <div className="flex flex-col gap-6">
          <p className="text-ink-600 max-w-2xl text-[0.9375rem]">
            O NEXA é gratuito para a comunidade. Recursos avançados para negócios e instituições
            sustentam a plataforma.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => {
              const action = planAction(plan.id, user.role)
              return (
                <article
                  key={plan.id}
                  className={cn(
                    'rounded-card flex flex-col gap-3 p-5',
                    plan.highlight
                      ? 'bg-nexa-900 shadow-raised text-white'
                      : 'bg-surface shadow-card',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <IconTile
                      icon={plan.icon}
                      color={plan.highlight ? 'orange' : 'brand'}
                      size="lg"
                    />
                    {plan.highlight && (
                      <Badge color="orange" variant="solid">
                        Mais completo
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h2
                      className={cn(
                        'text-lg leading-tight font-extrabold',
                        !plan.highlight && 'text-ink-900',
                      )}
                    >
                      {plan.name}
                    </h2>
                    <p className={cn('text-xs', plan.highlight ? 'text-white/70' : 'text-ink-500')}>
                      {plan.audience}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'text-xl font-extrabold',
                      plan.highlight ? 'text-sun-300' : 'text-nexa-800',
                    )}
                  >
                    {plan.priceLabel}
                  </p>
                  <p
                    className={cn(
                      'text-[0.8125rem] leading-snug',
                      plan.highlight ? 'text-white/80' : 'text-ink-600',
                    )}
                  >
                    {plan.description}
                  </p>
                  <ul className="flex flex-1 flex-col gap-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          'flex items-start gap-2 text-[0.8125rem]',
                          plan.highlight ? 'text-white/90' : 'text-ink-700',
                        )}
                      >
                        <Check
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            plan.highlight ? 'text-sun-300' : 'text-nexa-700',
                          )}
                          aria-hidden
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.highlight ? 'accent' : 'secondary'}
                    onClick={() => notify.info(action.title, action.detail)}
                  >
                    {action.label}
                  </Button>
                </article>
              )
            })}
          </div>

          <section className="flex flex-col gap-3">
            <SectionHeader title="Comparação de recursos" />
            <div className="bg-surface rounded-card shadow-card overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[0.8125rem]">
                <thead>
                  <tr className="border-line border-b">
                    <th scope="col" className="text-ink-500 px-4 py-3 font-semibold">
                      Recurso
                    </th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className="text-ink-900 px-3 py-3 text-center font-bold"
                      >
                        {plan.name.replace('NEXA ', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {PLAN_COMPARISON.map((row) => (
                    <tr key={row.feature}>
                      <th scope="row" className="text-ink-800 px-4 py-2.5 font-medium">
                        {row.feature}
                      </th>
                      {PLANS.map((plan) => {
                        const value = row.availability[plan.id]
                        return (
                          <td key={plan.id} className="px-3 py-2.5 text-center">
                            {value === true ? (
                              <Check
                                className="text-nexa-700 mx-auto size-[1.125rem]"
                                aria-label="Incluído"
                              />
                            ) : value === false ? (
                              <Minus
                                className="text-ink-300 mx-auto size-[1.125rem]"
                                aria-label="Não incluído"
                              />
                            ) : (
                              <span className="text-ink-700 font-semibold">{value}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Callout tone="demo" title="Página demonstrativa">
            {PLANS_DISCLAIMER}
          </Callout>
        </div>
      </Page>
    </>
  )
}
