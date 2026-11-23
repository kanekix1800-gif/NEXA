import { ChevronDown, CircleAlert, Eye, EyeOff, Minus, Plus, Search, Star, X } from 'lucide-react'
import {
  createContext,
  useContext,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

import type { Cents } from '@/types'
import { cn } from '@/utils/cn'
import { centsToInput, parseCurrencyInput } from '@/utils/format'

/**
 * FORMULÁRIOS
 * `Field` cuida de rótulo, dica e erro e liga tudo ao controle filho (id e ARIA)
 * automaticamente — basta colocar `Input`, `Textarea`, `Select` etc. dentro dele:
 *
 *   <Field label="Título" error={errors.title} hint="Seja breve" required>
 *     <Input value={title} onChange={(e) => setTitle(e.target.value)} />
 *   </Field>
 */

interface FieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
  required?: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Props de acessibilidade herdadas do `Field` mais próximo (se houver). */
export function useFieldControl(props: { id?: string; 'aria-describedby'?: string }) {
  const field = useContext(FieldContext)
  return {
    id: props.id ?? field?.id,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'aria-invalid': field?.invalid || undefined,
    'aria-required': field?.required || undefined,
  }
}

interface FieldProps {
  label: string
  hint?: string
  /** Mensagem de erro (quando presente, o controle fica marcado como inválido). */
  error?: string | null
  required?: boolean
  /** Contador exibido à direita do rótulo (ex.: "120/600"). */
  counter?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, required, counter, children, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <FieldContext.Provider
      value={{ id, describedBy: describedBy || undefined, invalid: Boolean(error), required }}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-ink-800 text-[0.8125rem] font-bold">
            {label}
            {required && (
              <span className="text-danger-500 ml-0.5" aria-hidden>
                *
              </span>
            )}
          </label>
          {counter && <span className="text-ink-400 text-[0.6875rem] tabular-nums">{counter}</span>}
        </div>
        {children}
        {error ? (
          <p id={errorId} className="text-danger-600 flex items-center gap-1 text-xs font-semibold">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-ink-500 text-xs">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

const CONTROL =
  'w-full rounded-2xl border border-line bg-surface text-[0.9375rem] text-ink-900 placeholder:text-ink-400 outline-none transition-[border-color,box-shadow] focus:border-nexa-600 focus:ring-4 focus:ring-nexa-100 disabled:bg-ink-50 disabled:text-ink-400 aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:ring-danger-50'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  /** Conteúdo à direita, dentro do campo (ex.: botão). */
  rightSlot?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function Input({ leftIcon, rightSlot, className, ...props }: InputProps) {
  const control = useFieldControl(props)
  return (
    <div className="relative">
      {leftIcon && (
        <span className="text-ink-400 pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
          {leftIcon}
        </span>
      )}
      <input
        {...props}
        {...control}
        className={cn(CONTROL, 'h-12 px-4', leftIcon && 'pl-11', rightSlot && 'pr-12', className)}
      />
      {rightSlot && (
        <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{rightSlot}</span>
      )}
    </div>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  const control = useFieldControl(props)
  return (
    <textarea
      rows={rows}
      {...props}
      {...control}
      className={cn(CONTROL, 'resize-none px-4 py-3 leading-relaxed', className)}
    />
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>
}

/** Seletor nativo estilizado (melhor experiência no celular). */
export function Select({ className, children, ...props }: SelectProps) {
  const control = useFieldControl(props)
  return (
    <div className="relative">
      <select
        {...props}
        {...control}
        className={cn(CONTROL, 'h-12 appearance-none pr-10 pl-4', className)}
      >
        {children}
      </select>
      <ChevronDown
        className="text-ink-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  )
}

/** Campo de senha com botão para mostrar/ocultar. */
export function PasswordInput(props: Omit<InputProps, 'type' | 'rightSlot'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="text-ink-500 hover:bg-ink-100 flex size-9 items-center justify-center rounded-full"
        >
          {visible ? <EyeOff className="size-[1.125rem]" /> : <Eye className="size-[1.125rem]" />}
        </button>
      }
    />
  )
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Rótulo acessível do campo. */
  label?: string
  className?: string
}

/** Campo de busca suave, como nas telas Comunidade e Comércio Local. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  label = 'Buscar',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-[1.125rem] -translate-y-1/2"
        aria-hidden
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="border-line bg-surface text-ink-900 placeholder:text-ink-400 focus:border-nexa-600 focus:ring-nexa-100 h-12 w-full rounded-full border pr-11 pl-11 text-[0.9375rem] outline-none focus:ring-4 [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="text-ink-500 hover:bg-ink-100 absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'leftIcon'> {
  /** Valor em centavos (ou `null` quando vazio/ inválido). */
  value: Cents | null
  onValueChange: (cents: Cents | null) => void
}

/** Campo de valor em reais; trabalha com centavos inteiros. */
export function CurrencyInput({ value, onValueChange, ...props }: CurrencyInputProps) {
  const [text, setText] = useState(() => centsToInput(value))
  const [lastValue, setLastValue] = useState(value)

  // Sincroniza quando o valor muda por fora (ex.: formulário reiniciado).
  if (value !== lastValue) {
    setLastValue(value)
    if (parseCurrencyInput(text) !== value) setText(centsToInput(value))
  }

  return (
    <Input
      {...props}
      inputMode="decimal"
      placeholder={props.placeholder ?? '0,00'}
      value={text}
      leftIcon={<span className="text-ink-500 text-sm font-bold">R$</span>}
      onChange={(event) => {
        const next = event.target.value.replace(/[^\d.,]/g, '')
        setText(next)
        const cents = parseCurrencyInput(next)
        setLastValue(cents)
        onValueChange(cents)
      }}
      onBlur={(event) => {
        if (value !== null) setText(centsToInput(value))
        props.onBlur?.(event)
      }}
    />
  )
}

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Rótulo acessível (ex.: "Quantidade de Pão francês"). */
  label: string
  size?: 'sm' | 'md'
}

/** Seletor de quantidade com botões de menos e mais. */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  label,
  size = 'md',
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 1000) / 1000))
  const button = cn(
    'flex items-center justify-center rounded-full bg-nexa-50 text-nexa-900 transition-colors hover:bg-nexa-100 active:scale-95 disabled:opacity-40',
    size === 'md' ? 'size-10' : 'size-8',
  )
  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label={label}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="Diminuir"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={String(value).replace('.', ',')}
        onChange={(event) => {
          const parsed = Number(event.target.value.replace(',', '.'))
          if (Number.isFinite(parsed)) onChange(clamp(parsed))
        }}
        className={cn(
          'text-ink-900 bg-transparent text-center font-bold tabular-nums outline-none',
          size === 'md' ? 'w-12 text-base' : 'w-9 text-sm',
        )}
      />
      <button
        type="button"
        className={button}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="Aumentar"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Rótulo acessível quando não há `SwitchRow`. */
  label?: string
  disabled?: boolean
  id?: string
}

/** Interruptor liga/desliga. */
export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
        checked ? 'bg-nexa-800' : 'bg-ink-300',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

/** Linha com título, descrição e interruptor (usada em Configurações). */
export function SwitchRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="text-ink-900 block text-sm font-bold">{title}</span>
        {description && <span className="text-ink-500 block text-xs">{description}</span>}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

/** Caixa de seleção com rótulo. */
export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  error?: string | null
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-ink-700 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          className="border-line-strong accent-nexa-800 mt-0.5 size-5 shrink-0 rounded"
        />
        <span>{children}</span>
      </label>
      {error && <p className="text-danger-600 pl-8 text-xs font-semibold">{error}</p>}
    </div>
  )
}

interface RatingInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
}

/** Seleção de nota de 1 a 5 estrelas (funciona com teclado). */
export function RatingInput({ value, onChange, label = 'Sua nota' }: RatingInputProps) {
  return (
    <div
      role="radiogroup"
      tabIndex={-1}
      aria-label={label}
      className="inline-flex gap-1"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault()
          onChange(Math.min(5, value + 1))
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault()
          onChange(Math.max(1, value - 1))
        }
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
          tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
          onClick={() => onChange(star)}
          className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-90"
        >
          <Star
            className={cn('size-8', star <= value ? 'fill-sun-400 text-sun-400' : 'text-ink-300')}
          />
        </button>
      ))}
    </div>
  )
}

export interface RadioCardOption<T extends string> {
  value: T
  title: string
  description?: string
  icon?: ReactNode
}

interface RadioCardGroupProps<T extends string> {
  options: RadioCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  label: string
  /** Número de colunas (padrão 2, como na tela "Nova Demanda"). */
  columns?: 1 | 2 | 3
  /** `tile` = ícone acima do título (grade); `row` = ícone ao lado (lista). */
  layout?: 'tile' | 'row'
}

/** Grade de cartões selecionáveis (seleção única). */
export function RadioCardGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 2,
  layout = 'tile',
}: RadioCardGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      tabIndex={-1}
      aria-label={label}
      className={cn(
        'grid gap-3',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-tile bg-surface border-2 p-3.5 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]',
              layout === 'tile'
                ? 'flex flex-col items-center gap-2.5 text-center'
                : 'flex items-center gap-3',
              selected ? 'border-nexa-800 bg-nexa-50' : 'border-transparent shadow-card',
            )}
          >
            {option.icon}
            <span className="min-w-0">
              <span className="text-ink-900 block text-[0.8125rem] leading-tight font-bold">
                {option.title}
              </span>
              {option.description && (
                <span className="text-ink-500 mt-0.5 block text-xs leading-snug">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
