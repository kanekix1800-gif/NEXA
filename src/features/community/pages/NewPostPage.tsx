import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { paths } from '@/app/paths'
import { DictationButton } from '@/components/accessibility'
import {
  Button,
  Callout,
  Field,
  FilterChips,
  ImagePicker,
  notify,
  Page,
  PageHeader,
  Select,
  StickyActionBar,
  Textarea,
} from '@/components/ui'
import { config } from '@/config'
import { useCurrentUser } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos, type CreatePostInput } from '@/repositories'
import type { PostCategory } from '@/types'

type PublishAs = NonNullable<CreatePostInput['publishAs']>

/** Composição de uma nova publicação. */
export default function NewPostPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const institution = useQuery({
    queryKey: ['institutions', 'mine'],
    queryFn: () => repos.institutions.getMine(),
    enabled: user.role === 'institution',
  })

  const canPublishAsBusiness = user.role === 'merchant' && Boolean(user.businessId)
  const canPublishAsInstitution = Boolean(institution.data?.verified)

  const categories: Array<{ value: PostCategory; label: string }> = [
    { value: 'discussion', label: 'Discussão' },
    { value: 'social', label: 'Iniciativa social' },
    { value: 'event', label: 'Evento' },
    ...(canPublishAsBusiness ? [{ value: 'commerce' as const, label: 'Comércio' }] : []),
  ]
  const requested = params.get('categoria') as PostCategory | null
  const [category, setCategory] = useState<PostCategory>(
    categories.some((item) => item.value === requested) ? requested! : 'discussion',
  )
  const [publishAs, setPublishAs] = useState<PublishAs>('self')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])

  const effectivePublishAs: PublishAs = category === 'commerce' ? 'business' : publishAs
  const limit = config.limits.postMaxLength

  const publish = useAction(
    () =>
      repos.posts.create({
        content,
        category,
        imageUrl: images[0],
        publishAs: effectivePublishAs,
      }),
    {
      success: 'Publicação criada!',
      onSuccess: (post) => navigate(paths.post(post.id), { replace: true }),
    },
  )

  return (
    <>
      <PageHeader title="Nova publicação" variant="stack" backTo={paths.community} />
      <Page bottomNav={false} className="pb-28">
        <div className="flex flex-col gap-5 pt-2">
          <div>
            <p className="text-ink-800 mb-2 text-[0.8125rem] font-bold">Sobre o que é?</p>
            <FilterChips
              ariaLabel="Categoria da publicação"
              options={categories}
              value={category}
              onChange={setCategory}
            />
          </div>

          <Field
            label="O que você quer compartilhar?"
            counter={`${content.length}/${limit}`}
            required
          >
            <Textarea
              rows={6}
              maxLength={limit}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Escreva para a sua comunidade…"
            />
          </Field>
          <DictationButton
            field="a publicação"
            className="-mt-3 self-end"
            onText={(spoken) =>
              setContent((current) => `${current} ${spoken}`.trim().slice(0, limit))
            }
            onError={(message) => notify.warning(message)}
          />

          <div>
            <p className="text-ink-800 mb-2 text-[0.8125rem] font-bold">Imagem (opcional)</p>
            <ImagePicker value={images} onChange={setImages} max={1} />
          </div>

          {category !== 'commerce' && (canPublishAsBusiness || canPublishAsInstitution) && (
            <Field label="Publicar como">
              <Select
                value={publishAs}
                onChange={(event) => setPublishAs(event.target.value as PublishAs)}
              >
                <option value="self">{user.name}</option>
                {canPublishAsInstitution && (
                  <option value="institution">{institution.data?.name}</option>
                )}
                {canPublishAsBusiness && <option value="business">Meu estabelecimento</option>}
              </Select>
            </Field>
          )}

          <Callout tone="info">
            Seja respeitoso e não exponha dados pessoais de outras pessoas. Publicações podem ser
            denunciadas e moderadas.
          </Callout>
        </div>
      </Page>
      <StickyActionBar>
        <Button
          size="lg"
          fullWidth
          loading={publish.pending}
          disabled={content.trim().length === 0}
          onClick={() => void publish.run()}
        >
          Publicar
        </Button>
      </StickyActionBar>
    </>
  )
}
