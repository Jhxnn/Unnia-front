import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import './field.css'

interface BaseProps {
  label: string
  hint?: string
  error?: string
}

type TextFieldProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

export function TextField({ label, hint, error, ...input }: TextFieldProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...input}
        id={id}
        className="field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

type TextAreaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>

export function TextArea({ label, hint, error, ...input }: TextAreaProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <textarea
        rows={4}
        {...input}
        id={id}
        className="field__control field__control--area"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Mensagem de erro do formulário inteiro (por exemplo, "e-mail ou senha incorretos"). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  )
}
