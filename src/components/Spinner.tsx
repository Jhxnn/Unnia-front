import './feedback.css'

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="spinner__label">{label}</span>
    </div>
  )
}
