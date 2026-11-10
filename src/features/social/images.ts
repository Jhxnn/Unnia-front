/** Regras de imagem que o servidor também confere; aqui servem para avisar antes de gastar o envio. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** O backend aceita no máximo 4 mídias por postagem. */
export const MAX_POST_IMAGES = 4

/** Devolve o motivo da recusa, ou nulo se a imagem serve. */
export function imageProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Use uma imagem JPEG, PNG, WebP ou GIF.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'A imagem passa de 5 MB.'
  }
  if (file.size === 0) {
    return 'O arquivo está vazio.'
  }
  return null
}
