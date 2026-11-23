import {
  ArrowLeft,
  BusFront,
  Check,
  ChevronRight,
  Ear,
  Eye,
  Footprints,
  Hand,
  Mic,
  RotateCcw,
  Timer,
  TriangleAlert,
  Vibrate,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { paths } from '@/app/paths'
import { isDictationSupported } from '@/components/accessibility'
import { Logo } from '@/components/brand/Logo'
import {
  Button,
  Callout,
  Card,
  Checkbox,
  ConfirmDialog,
  Field,
  SegmentedControl,
  Select,
  SwitchRow,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useAccessibilityPreferences } from '@/hooks/useAccessibility'
import {
  isSoundSupported,
  isVibrationSupported,
  playSound,
  vibrate,
} from '@/services/accessibility/feedback'
import {
  applyPreset,
  clearPreset,
  countActivePreferences,
  isPresetActive,
  PRESETS,
  resetPreferences,
  SPEECH_PITCH_RANGE,
  SPEECH_RATE_RANGE,
  updatePreferences,
  type AccessibilityPreferences,
  type MobilityHighlight,
  type ReadingFont,
  type TextScale,
} from '@/services/accessibility/preferences'
import {
  isSpeechSupported,
  loadVoices,
  speak,
  type VoiceOption,
} from '@/services/accessibility/speech'
import { cn } from '@/utils/cn'
import { pluralize } from '@/utils/text'

const TEXT_SCALE_OPTIONS: Array<{ value: TextScale; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Muito grande' },
]

const FONT_OPTIONS: Array<{ value: ReadingFont; label: string }> = [
  { value: 'default', label: 'Padrão do NEXA' },
  { value: 'legible', label: 'Alta legibilidade (Atkinson Hyperlegible)' },
  { value: 'dyslexia', label: 'Para dislexia (OpenDyslexic)' },
]

const HIGHLIGHT_OPTIONS: Array<{ value: MobilityHighlight; label: string; hint: string }> = [
  {
    value: 'step_free',
    label: 'Caminhos e locais sem degraus',
    hint: 'Mostra rampas, elevadores e barreiras no mapa.',
  },
  {
    value: 'accessible_transit',
    label: 'Ônibus acessíveis',
    hint: 'Mostra as paradas no mapa e destaca as linhas com elevador ou piso baixo.',
  },
  {
    value: 'audio_tactile',
    label: 'Avisos sonoros e piso tátil',
    hint: 'Mostra semáforos sonoros, piso tátil e travessias de risco no mapa.',
  },
  {
    value: 'libras',
    label: 'Atendimento em Libras',
    hint: 'Destaca locais e eventos que informam atendimento em Libras.',
  },
]

/** Chaves das opções liga/desliga (usadas pelos interruptores). */
type ToggleKey = {
  [Key in keyof AccessibilityPreferences]: AccessibilityPreferences[Key] extends boolean
    ? Key
    : never
}[keyof AccessibilityPreferences]

interface SectionProps {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
}

function Section({ icon: Icon, title, description, children }: SectionProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex items-start gap-3">
        <span className="bg-nexa-100 text-nexa-900 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-ink-900 text-[1.0625rem] font-bold">
            {title}
          </h2>
          {description && <p className="text-ink-600 text-[0.8125rem]">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  /** Texto do valor para a tela e para leitores (ex.: "1,2 vez"). */
  format: (value: number) => string
  onChange: (value: number) => void
  disabled?: boolean
}

function RangeField({ label, value, min, max, step, format, onChange, disabled }: RangeFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-ink-900 text-sm font-bold">
          {label}
        </label>
        <span className="text-ink-600 text-[0.8125rem] font-semibold tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-nexa-800 h-11 w-full disabled:opacity-50"
      />
    </div>
  )
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/**
 * Acessibilidade: tudo o que adapta o NEXA a quem vê pouco ou não vê, ouve pouco ou
 * não ouve, tem mobilidade reduzida ou dificuldade de leitura. As opções valem para o
 * aparelho (inclusive antes de entrar na conta) e ficam guardadas somente nele.
 */
export default function AccessibilityPage() {
  const prefs = useAccessibilityPreferences()
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [voices, setVoices] = useState<VoiceOption[] | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const speechSupported = isSpeechSupported()
  const soundSupported = isSoundSupported()
  const vibrationSupported = isVibrationSupported()
  const dictationSupported = isDictationSupported()
  const signedIn = status === 'authenticated'
  const active = countActivePreferences(prefs)

  useEffect(() => {
    let alive = true
    void loadVoices().then((list) => {
      if (alive) setVoices(list)
    })
    return () => {
      alive = false
    }
  }, [])

  /** Liga ou desliga uma opção; quando há fala envolvida, confirma em voz alta. */
  const toggle = (key: ToggleKey, spoken?: string) => (checked: boolean) => {
    updatePreferences({ [key]: checked })
    playSound(checked ? 'on' : 'off')
    if (spoken && checked) speak(spoken, { interrupt: true })
  }

  const row = (key: ToggleKey, title: string, description: string, spoken?: string) => (
    <SwitchRow
      title={title}
      description={description}
      checked={prefs[key]}
      onChange={toggle(key, spoken)}
    />
  )

  const toggleHighlight = (value: MobilityHighlight, checked: boolean) => {
    const next = checked
      ? [...prefs.highlights, value]
      : prefs.highlights.filter((item) => item !== value)
    updatePreferences({ highlights: next })
  }

  return (
    <div className="pt-safe mx-auto min-h-dvh w-full max-w-2xl px-5 pb-16">
      <header className="flex h-16 items-center justify-between">
        <button
          type="button"
          onClick={() => {
            // `key === 'default'`: esta é a primeira tela aberta, não há para onde voltar no app.
            if (location.key !== 'default') navigate(-1)
            else navigate(signedIn ? paths.profile : paths.welcome, { replace: true })
          }}
          aria-label="Voltar"
          className="text-ink-800 hover:bg-ink-100 -ml-2.5 flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Logo size="sm" />
        <span className="w-11" />
      </header>

      <main className="mt-2 flex flex-col gap-8">
        <div>
          <h1 className="text-ink-900 text-[1.625rem] leading-tight font-extrabold">
            Acessibilidade
          </h1>
          <p className="text-ink-600 mt-1.5 text-[0.9375rem]">
            Ajuste o NEXA ao seu jeito de ver, ouvir e tocar. As opções valem para este aparelho,
            ficam guardadas só nele e funcionam mesmo antes de entrar na conta.
          </p>
          <p className="text-ink-700 mt-3 text-sm font-semibold" role="status">
            {active === 0
              ? 'Nenhuma opção ativa.'
              : `${pluralize(active, 'opção ativa', 'opções ativas')}.`}
          </p>
        </div>

        <Section
          icon={Hand}
          title="Comece por aqui"
          description="Escolha o que combina com você: cada perfil liga de uma vez as opções mais úteis. Depois é só ajustar o que quiser."
        >
          <ul className="flex flex-col gap-2">
            {PRESETS.map((preset) => {
              const on = isPresetActive(prefs, preset)
              return (
                <li key={preset.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? clearPreset(preset) : applyPreset(preset)
                      playSound(on ? 'off' : 'on', { force: next.sounds })
                      if (!on && (next.announceScreens || next.speakNotices)) {
                        speak(`Perfil ligado: ${preset.title}. O NEXA agora fala com você.`, {
                          interrupt: true,
                        })
                      }
                    }}
                    className={cn(
                      'rounded-card flex w-full items-center gap-3 border-2 p-4 text-left transition-colors',
                      on ? 'border-nexa-800 bg-nexa-50' : 'border-line bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                        on ? 'border-nexa-800 bg-nexa-800 text-white' : 'border-line-strong',
                      )}
                      aria-hidden
                    >
                      {on && <Check className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink-900 block text-[0.9375rem] font-bold">
                        {preset.title}
                      </span>
                      <span className="text-ink-600 block text-[0.8125rem]">
                        {preset.description}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section
          icon={Eye}
          title="Ver e ler"
          description="Tamanho, contraste, fonte e espaçamento."
        >
          <Card className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p id="tamanho-do-texto" className="text-ink-900 text-sm font-bold">
                Tamanho do texto
              </p>
              <SegmentedControl
                ariaLabel="Tamanho do texto"
                options={TEXT_SCALE_OPTIONS}
                value={prefs.textScale}
                onChange={(textScale) => updatePreferences({ textScale })}
                className="flex w-full"
              />
              <p className="text-ink-600 text-[0.8125rem]">
                Aumenta os textos, os botões e as áreas de toque de todo o aplicativo.
              </p>
            </div>
            <Field
              label="Fonte"
              hint="As fontes alternativas são baixadas na primeira vez que você escolhe."
            >
              <Select
                value={prefs.font}
                onChange={(event) => updatePreferences({ font: event.target.value as ReadingFont })}
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
          <Card padding="none" className="divide-line divide-y px-4">
            <SwitchRow
              title="Alto contraste"
              description="Textos mais escuros, linhas mais visíveis e fundos brancos."
              checked={prefs.contrast === 'high'}
              onChange={(checked) => {
                updatePreferences({ contrast: checked ? 'high' : 'normal' })
                playSound(checked ? 'on' : 'off')
              }}
            />
            {row(
              'textSpacing',
              'Espaçamento ampliado',
              'Mais espaço entre letras, palavras e linhas.',
            )}
            {row(
              'strongFocus',
              'Realçar foco e links',
              'Contorno grosso no item selecionado pelo teclado e links sublinhados.',
            )}
          </Card>
        </Section>

        <Section
          icon={Volume2}
          title="Ouvir o NEXA"
          description="Leitura em voz alta feita pelo próprio aparelho, sem enviar nada para fora."
        >
          {!speechSupported ? (
            <Callout tone="warning" title="Voz indisponível neste navegador">
              Este navegador não oferece leitura em voz alta. Em outro navegador ou aparelho, as
              opções de voz aparecem aqui.
            </Callout>
          ) : (
            <>
              <Callout tone="info" title="Já usa TalkBack, VoiceOver ou outro leitor de tela?">
                Deixe as opções de voz abaixo desligadas, para as duas vozes não falarem ao mesmo
                tempo. O NEXA já avisa o seu leitor a cada troca de tela.
              </Callout>
              <Card padding="none" className="divide-line divide-y px-4">
                {row(
                  'announceScreens',
                  'Falar o nome de cada tela',
                  'Ao abrir uma tela, o NEXA diz onde você está.',
                  'Ligado. Vou dizer o nome de cada tela.',
                )}
                {row(
                  'speakOnTouch',
                  'Ler o que eu tocar',
                  'Fala o texto, o botão ou o campo tocado ou selecionado.',
                  'Ligado. Toque em qualquer item para ouvir o que ele é.',
                )}
                {row(
                  'speakNotices',
                  'Ler avisos e confirmações',
                  'Fala mensagens como "Demanda registrada" e os erros.',
                  'Ligado. Vou ler os avisos em voz alta.',
                )}
                {row(
                  'readerButton',
                  'Botão "Ouvir tela"',
                  'Mostra em todas as telas um botão que lê o conteúdo do começo ao fim.',
                )}
              </Card>
              <Card className="flex flex-col">
                {voices !== null && voices.length === 0 ? (
                  <p className="text-ink-700 text-sm">
                    Nenhuma voz em português foi encontrada neste aparelho. A leitura usa a voz
                    padrão do sistema; para melhorar, instale uma voz em português nas configurações
                    do aparelho.
                  </p>
                ) : (
                  <Field label="Voz" hint="Vozes instaladas no aparelho funcionam sem internet.">
                    <Select
                      value={prefs.voiceURI ?? ''}
                      onChange={(event) =>
                        updatePreferences({ voiceURI: event.target.value || null })
                      }
                    >
                      <option value="">Voz padrão em português</option>
                      {(voices ?? []).map((voice) => (
                        <option key={voice.uri} value={voice.uri}>
                          {voice.name} ({voice.lang}){voice.local ? '' : ' · precisa de internet'}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <RangeField
                  label="Velocidade da fala"
                  value={prefs.speechRate}
                  {...SPEECH_RATE_RANGE}
                  format={(value) => `${decimal.format(value)}×`}
                  onChange={(speechRate) => updatePreferences({ speechRate })}
                />
                <RangeField
                  label="Tom da voz"
                  value={prefs.speechPitch}
                  {...SPEECH_PITCH_RANGE}
                  format={(value) =>
                    value < 0.95 ? 'Mais grave' : value > 1.05 ? 'Mais agudo' : 'Normal'
                  }
                  onChange={(speechPitch) => updatePreferences({ speechPitch })}
                />
                <Button
                  variant="secondary"
                  leftIcon={<Volume2 className="size-4" />}
                  onClick={() =>
                    speak(
                      'Olá! Esta é a voz do NEXA. É assim que as telas e os avisos serão lidos para você.',
                      { interrupt: true },
                    )
                  }
                >
                  Testar a voz
                </Button>
              </Card>
            </>
          )}
        </Section>

        <Section
          icon={Vibrate}
          title="Sons e vibração"
          description="Sinais curtos que confirmam ações, erros e alertas."
        >
          <Card padding="none" className="divide-line divide-y px-4">
            <SwitchRow
              title="Sons da interface"
              description={
                soundSupported
                  ? 'Um som para cada tipo de aviso: confirmação, erro e alerta.'
                  : 'Este navegador não permite gerar sons.'
              }
              checked={prefs.sounds}
              disabled={!soundSupported}
              onChange={(checked) => {
                updatePreferences({ sounds: checked })
                playSound(checked ? 'success' : 'off', { force: true })
              }}
            />
            <RangeField
              label="Volume dos sons"
              value={prefs.soundVolume}
              min={0.1}
              max={1}
              step={0.1}
              disabled={!prefs.sounds}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(soundVolume) => {
                updatePreferences({ soundVolume })
                playSound('notice')
              }}
            />
            <SwitchRow
              title="Vibração"
              description={
                vibrationSupported
                  ? 'Vibra ao confirmar ações, em erros e nos alertas de barreiras.'
                  : 'Este aparelho ou navegador não oferece vibração (é o caso do iPhone).'
              }
              checked={prefs.haptics}
              disabled={!vibrationSupported}
              onChange={(checked) => {
                updatePreferences({ haptics: checked })
                if (checked) vibrate('success', { force: true })
              }}
            />
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!soundSupported}
              onClick={() => playSound('alert', { force: true })}
            >
              Ouvir o som de alerta
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!vibrationSupported}
              onClick={() => vibrate('alert', { force: true })}
            >
              Sentir a vibração de alerta
            </Button>
          </div>
        </Section>

        <Section icon={Timer} title="Tempo e movimento">
          <Card padding="none" className="divide-line divide-y px-4">
            {row(
              'longerNotices',
              'Avisos por mais tempo',
              'As mensagens temporárias ficam 10 segundos na tela e ganham um botão de fechar.',
            )}
            <SwitchRow
              title="Reduzir animações"
              description="Desliga transições e movimentos da interface."
              checked={prefs.motion === 'reduced'}
              onChange={(checked) => {
                updatePreferences({ motion: checked ? 'reduced' : 'system' })
                playSound(checked ? 'on' : 'off')
              }}
            />
          </Card>
        </Section>

        <Section
          icon={Mic}
          title="Falar em vez de digitar"
          description="Um microfone aparece ao lado dos campos de texto mais longos."
        >
          <Card padding="none" className="px-4">
            <SwitchRow
              title="Ditado por voz"
              description={
                dictationSupported
                  ? 'Na NEXA IA, nas publicações e nas demandas.'
                  : 'Este navegador não oferece reconhecimento de voz.'
              }
              checked={prefs.dictation}
              disabled={!dictationSupported}
              onChange={toggle('dictation')}
            />
          </Card>
          <p className="text-ink-600 text-xs">
            O reconhecimento de voz é feito pelo navegador, que pode enviar o áudio ao serviço do
            próprio fabricante para transformar a fala em texto. O NEXA não grava nem guarda o
            áudio.
          </p>
        </Section>

        <Section
          icon={Footprints}
          title="Pela cidade"
          description="Informações para planejar o caminho com menos barreiras."
        >
          <Card className="flex flex-col gap-3">
            <p className="text-ink-900 text-sm font-bold">O que destacar para mim</p>
            {HIGHLIGHT_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                checked={prefs.highlights.includes(option.value)}
                onChange={(checked) => toggleHighlight(option.value, checked)}
              >
                <span className="text-ink-900 block font-bold">{option.label}</span>
                <span className="text-ink-600 block text-xs">{option.hint}</span>
              </Checkbox>
            ))}
          </Card>
          <Card padding="none" className="px-4">
            {row(
              'proximityAlerts',
              'Alertas de barreiras no caminho',
              'Mostra as barreiras no mapa. O aviso por voz, som e vibração ao se aproximar de escadas e degraus é ligado na aba Alertas da Mobilidade acessível.',
            )}
          </Card>
          {signedIn ? (
            <ul className="bg-surface rounded-card shadow-card divide-line divide-y">
              {[
                { to: paths.mobilityTab('onibus'), icon: BusFront, label: 'Ônibus acessíveis' },
                {
                  to: paths.mobilityTab('caminho'),
                  icon: TriangleAlert,
                  label: 'Barreiras e apoios no caminho',
                },
                { to: paths.mobilityTab('alertas'), icon: Ear, label: 'Alertas de proximidade' },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="flex min-h-14 items-center gap-3 px-4 py-3">
                    <item.icon className="text-nexa-800 size-5 shrink-0" aria-hidden />
                    <span className="text-ink-900 flex-1 text-sm font-bold">{item.label}</span>
                    <ChevronRight className="text-ink-400 size-5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Callout tone="info">
              Depois de entrar no NEXA, você encontra aqui os ônibus acessíveis, as barreiras e os
              apoios no caminho.
            </Callout>
          )}
        </Section>

        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            leftIcon={<RotateCcw className="size-4" />}
            disabled={active === 0}
            onClick={() => setConfirmReset(true)}
          >
            Restaurar o padrão
          </Button>
          <p className="text-ink-600 text-center text-xs">
            Estas preferências não fazem parte da sua conta: ficam somente neste aparelho e não são
            enviadas a nenhum servidor.
          </p>
        </div>
      </main>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Restaurar o padrão?"
        description="Todas as opções de acessibilidade deste aparelho voltam ao estado inicial."
        confirmLabel="Restaurar"
        onConfirm={async () => {
          resetPreferences()
        }}
      />
    </div>
  )
}
