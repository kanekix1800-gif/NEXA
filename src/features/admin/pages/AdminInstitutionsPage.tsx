import { useQuery } from '@tanstack/react-query'
import { Landmark } from 'lucide-react'
import { Link } from 'react-router'

import { paths } from '@/app/paths'
import { AsyncView, Badge, Button, Callout, DemoBadge, EmptyState, IconTile } from '@/components/ui'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import { INSTITUTION_CATEGORY_LABEL, type InstitutionView } from '@/types'

import { AdminShell } from '../components/AdminShell'

/** Instituições cadastradas: verificação dos perfis institucionais. */
export default function AdminInstitutionsPage() {
  const institutions = useQuery({
    queryKey: ['institutions', 'admin'],
    queryFn: () => repos.institutions.list({ includeUnverified: true }),
  })
  const verify = useAction(
    (institution: InstitutionView) =>
      repos.institutions.setVerified(institution.id, !institution.verified),
    {
      success: (institution) =>
        institution.verified ? 'Instituição verificada.' : 'Verificação removida.',
    },
  )

  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <Callout tone="info">
          Apenas instituições verificadas aparecem no diretório e podem publicar em nome da
          organização, divulgar iniciativas e atualizar demandas.
        </Callout>
        <AsyncView
          query={institutions}
          empty={<EmptyState icon={Landmark} title="Nenhuma instituição cadastrada" />}
        >
          {(items) => (
            <ul className="rounded-card bg-surface shadow-card divide-line divide-y">
              {items.map((institution) => (
                <li key={institution.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <IconTile icon={institution.icon} color={institution.color} />
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      to={paths.institution(institution.id)}
                      className="text-ink-900 hover:text-nexa-800 block truncate text-sm font-bold"
                    >
                      {institution.name}
                    </Link>
                    <p className="text-ink-500 truncate text-xs">
                      {INSTITUTION_CATEGORY_LABEL[institution.category]} · {institution.demandCount}{' '}
                      demandas encaminhadas
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge color={institution.verified ? 'green' : 'orange'}>
                      {institution.verified ? 'Verificada' : 'Aguardando verificação'}
                    </Badge>
                    {institution.isDemo && <DemoBadge label="Exemplo" />}
                  </div>
                  <Button
                    size="sm"
                    variant={institution.verified ? 'outline' : 'primary'}
                    disabled={verify.pending}
                    onClick={() => void verify.run(institution)}
                  >
                    {institution.verified ? 'Remover verificação' : 'Verificar'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </div>
    </AdminShell>
  )
}
