import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router'

import { cn } from '@/utils/cn'

import { Spinner } from './feedback'

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'light'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap select-none transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-nexa-900 text-white shadow-[0_8px_18px_-10px_rgb(6_77_59/0.7)] hover:bg-nexa-800',
  secondary: 'bg-nexa-100 text-nexa-900 hover:bg-nexa-200',
  outline: 'border border-line-strong bg-surface text-ink-900 hover:bg-cream-50',
  ghost: 'text-nexa-800 hover:bg-nexa-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  accent: 'bg-sun-400 text-ink-900 hover:bg-sun-300',
  light: 'bg-white text-nexa-900 hover:bg-cream-50',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-6 text-[15px]',
}

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

/** Classes de um botão — útil para estilizar outros elementos como botão. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonStyleOptions, 'className'> {
  /** Exibe o indicador de carregamento e bloqueia novos cliques. */
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/** Botão em pílula do NEXA. */
export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

export interface ButtonLinkProps extends LinkProps, Omit<ButtonStyleOptions, 'className'> {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

/** Link interno com aparência de botão. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  )
}

type IconButtonVariant = 'ghost' | 'soft' | 'solid' | 'outline' | 'light'

const ICON_VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-700 hover:bg-ink-100',
  soft: 'bg-nexa-50 text-nexa-900 hover:bg-nexa-100',
  solid: 'bg-nexa-900 text-white hover:bg-nexa-800',
  outline: 'border border-line bg-surface text-ink-800 hover:bg-cream-50',
  light: 'bg-white/90 text-nexa-900 shadow-card hover:bg-white',
}

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-13',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Descrição da ação (vira `aria-label`). Obrigatória: o botão não tem texto. */
  label: string
  variant?: IconButtonVariant
  size?: ButtonSize
  ref?: Ref<HTMLButtonElement>
}

/** Botão redondo apenas com ícone. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        ICON_VARIANTS[variant],
        ICON_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
