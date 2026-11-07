import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import './button.css'

type Variant = 'primary' | 'secondary' | 'vest' | 'danger' | 'quiet'

interface CommonProps {
  variant?: Variant
  size?: 'md' | 'lg'
}

function classes(variant: Variant, size: 'md' | 'lg', busy = false): string {
  return ['btn', `btn--${variant}`, size === 'lg' ? 'btn--lg' : '', busy ? 'btn--busy' : ''].filter(Boolean).join(' ')
}

interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  /** Mostra o estado de espera e bloqueia novos cliques. */
  busy?: boolean
}

export function Button({ variant = 'primary', size = 'md', busy = false, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={classes(variant, size, busy)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  )
}

interface ButtonLinkProps extends CommonProps, Omit<LinkProps, 'className'> {}

export function ButtonLink({ variant = 'primary', size = 'md', children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={classes(variant, size)}>
      {children}
    </Link>
  )
}
