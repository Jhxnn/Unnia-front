/** Marca do Unnia: duas vagas preenchidas e uma livre, com o nome ao lado. */
export function Logo() {
  return (
    <span className="logo">
      <svg className="logo__mark" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="2" y="3" width="24" height="6" rx="2" fill="var(--vest)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="2" y="11" width="24" height="6" rx="2" fill="var(--vest)" stroke="var(--ink)" strokeWidth="2" />
        <rect
          x="2"
          y="19"
          width="24"
          height="6"
          rx="2"
          fill="none"
          stroke="var(--ink-faint)"
          strokeWidth="2"
          strokeDasharray="3 2.5"
        />
      </svg>
      <span className="logo__word">Unnia</span>
    </span>
  )
}
