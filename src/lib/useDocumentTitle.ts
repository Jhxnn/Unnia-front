import { useEffect } from 'react'

const SUFFIX = 'Unnia'

/** Define o título da aba. Sem argumento, volta ao título padrão. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : `${SUFFIX} — eventos solidários com vaga reservada`
  }, [title])
}
