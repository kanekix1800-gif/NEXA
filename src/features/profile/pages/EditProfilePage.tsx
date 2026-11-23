import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import {
  Avatar,
  Button,
  Field,
  ImagePicker,
  Input,
  Page,
  PageHeader,
  Select,
  StickyActionBar,
  Textarea,
} from '@/components/ui'
import { config } from '@/config'
import { useAuth, useCurrentUser } from '@/contexts/AuthContext'
import { useAction } from '@/hooks/useAction'
import { repos } from '@/repositories'
import type { AvatarSpec } from '@/types'
import { isAppError } from '@/utils/errors'
import { USERNAME_RULE_MESSAGE } from '@/utils/username'

const OPTIONS: {
  [K in keyof Required<AvatarSpec>]: Array<{ value: AvatarSpec[K] | ''; label: string }>
} = {
  skin: [
    { value: 'light', label: 'Clara' },
    { value: 'tan', label: 'Morena clara' },
    { value: 'medium', label: 'Morena' },
    { value: 'brown', label: 'Parda' },
    { value: 'dark', label: 'Negra' },
  ],
  hair: [
    { value: 'short', label: 'Curto' },
    { value: 'buzz', label: 'Raspado' },
    { value: 'curly', label: 'Cacheado' },
    { value: 'afro', label: 'Black power' },
    { value: 'long', label: 'Longo' },
    { value: 'bob', label: 'Chanel' },
    { value: 'bun', label: 'Coque' },
    { value: 'wavy', label: 'Ondulado' },
    { value: 'bald', label: 'Sem cabelo' },
  ],
  hairColor: [
    { value: 'black', label: 'Preto' },
    { value: 'brown', label: 'Castanho-escuro' },
    { value: 'chestnut', label: 'Castanho' },
    { value: 'blonde', label: 'Loiro' },
    { value: 'gray', label: 'Grisalho' },
    { value: 'red', label: 'Ruivo' },
  ],
  facialHair: [
    { value: '', label: 'Sem barba' },
    { value: 'beard', label: 'Barba' },
    { value: 'mustache', label: 'Bigode' },
  ],
  accessory: [
    { value: '', label: 'Nenhum' },
    { value: 'glasses', label: 'Óculos' },
    { value: 'earrings', label: 'Brincos' },
  ],
  top: [
    { value: 'green', label: 'Verde' },
    { value: 'orange', label: 'Laranja' },
    { value: 'cream', label: 'Creme' },
    { value: 'teal', label: 'Azul-petróleo' },
    { value: 'terracotta', label: 'Terracota' },
    { value: 'navy', label: 'Azul-marinho' },
  ],
  background: [
    { value: 'mint', label: 'Menta' },
    { value: 'sand', label: 'Areia' },
    { value: 'peach', label: 'Pêssego' },
    { value: 'sage', label: 'Sálvia' },
    { value: 'sky', label: 'Céu' },
  ],
}

const AVATAR_FIELDS: Array<{ key: keyof AvatarSpec; label: string }> = [
  { key: 'skin', label: 'Tom de pele' },
  { key: 'hair', label: 'Cabelo' },
  { key: 'hairColor', label: 'Cor do cabelo' },
  { key: 'facialHair', label: 'Barba' },
  { key: 'accessory', label: 'Acessório' },
  { key: 'top', label: 'Roupa' },
  { key: 'background', label: 'Fundo' },
]

/** Edição dos dados pessoais, do avatar ilustrado e da foto. */
export default function EditProfilePage() {
  const user = useCurrentUser()
  const { updateProfile } = useAuth()
  const navigate = useNavigate()
  const neighborhoods = useQuery({
    queryKey: ['reference', 'neighborhoods'],
    queryFn: () => repos.reference.listNeighborhoods(),
  })

  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio ?? '')
  const [neighborhoodId, setNeighborhoodId] = useState(user.neighborhoodId)
  const [avatar, setAvatar] = useState<AvatarSpec>(user.avatar)
  const [photo, setPhoto] = useState<string[]>(user.photoUrl ? [user.photoUrl] : [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useAction(
    () =>
      updateProfile({ name, username, bio, neighborhoodId, avatar, photoUrl: photo[0] ?? null }),
    {
      success: 'Perfil atualizado.',
      onSuccess: () => navigate(paths.profile, { replace: true }),
      onError: (error) => {
        if (isAppError(error) && error.fieldErrors) setErrors(error.fieldErrors)
      },
    },
  )

  return (
    <>
      <PageHeader title="Editar perfil" variant="stack" backTo={paths.profile} />
      <Page bottomNav={false} width="narrow" className="pb-32">
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex items-center gap-4">
            <Avatar name={name} avatar={avatar} photoUrl={photo[0]} size="2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-ink-800 mb-2 text-[13px] font-bold">Foto (opcional)</p>
              <ImagePicker value={photo} onChange={setPhoto} max={1} label="Enviar foto" />
            </div>
          </div>

          <Field label="Nome" error={errors.name} required>
            <Input
              value={name}
              maxLength={config.limits.nameMaxLength}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field
            label="Nome de usuário"
            error={errors.username}
            hint={USERNAME_RULE_MESSAGE}
            required
          >
            <Input
              value={username}
              maxLength={24}
              autoCapitalize="none"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              leftIcon={<span className="text-ink-500 text-sm font-bold">@</span>}
            />
          </Field>
          <Field
            label="Bairro"
            error={errors.neighborhoodId}
            hint="Usado para mostrar o que está perto de você."
          >
            <Select value={neighborhoodId} onChange={(e) => setNeighborhoodId(e.target.value)}>
              {(neighborhoods.data ?? []).map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Biografia (opcional)"
            error={errors.bio}
            counter={`${bio.length}/${config.limits.bioMaxLength}`}
          >
            <Textarea
              rows={3}
              maxLength={config.limits.bioMaxLength}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você."
            />
          </Field>

          <fieldset className="bg-surface rounded-card shadow-card p-4">
            <legend className="text-ink-800 float-left mb-3 text-[13px] font-bold">
              Avatar ilustrado
            </legend>
            <div className="clear-both grid grid-cols-2 gap-3">
              {AVATAR_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <Select
                    value={avatar[key] ?? ''}
                    onChange={(e) =>
                      setAvatar(
                        (current) =>
                          ({ ...current, [key]: e.target.value || undefined }) as AvatarSpec,
                      )
                    }
                  >
                    {OPTIONS[key].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
            <p className="text-ink-500 mt-3 text-xs">
              O avatar aparece quando você não usa uma foto.
            </p>
          </fieldset>
        </div>
      </Page>
      <StickyActionBar width="narrow">
        <Button
          size="lg"
          fullWidth
          loading={save.pending}
          onClick={() => {
            setErrors({})
            void save.run()
          }}
        >
          Salvar alterações
        </Button>
      </StickyActionBar>
    </>
  )
}
