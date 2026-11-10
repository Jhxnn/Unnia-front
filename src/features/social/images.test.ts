import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, MAX_POST_IMAGES, imageProblem } from './images'

describe('imageProblem', () => {
  it('aceita JPEG, PNG, WebP e GIF dentro do limite', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(imageProblem({ type, size: 1024 })).toBeNull()
    }
  })

  it('recusa outros formatos, inclusive SVG e PDF', () => {
    for (const type of ['image/svg+xml', 'application/pdf', 'text/plain', 'video/mp4', '']) {
      expect(imageProblem({ type, size: 1024 })).toBe('Use uma imagem JPEG, PNG, WebP ou GIF.')
    }
  })

  it('o limite de 5 MB vale exatamente: 5 MB passa, um byte a mais não', () => {
    expect(imageProblem({ type: 'image/png', size: MAX_IMAGE_BYTES })).toBeNull()
    expect(imageProblem({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toBe('A imagem passa de 5 MB.')
  })

  it('recusa arquivo vazio', () => {
    expect(imageProblem({ type: 'image/png', size: 0 })).toBe('O arquivo está vazio.')
  })

  it('o limite de imagens por postagem acompanha o do backend', () => {
    expect(MAX_POST_IMAGES).toBe(4)
  })
})
