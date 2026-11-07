import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MAX_SLOTS, slotModel } from './slotModel'
import { SlotCaption, SlotStrip } from './SlotStrip'

describe('slotModel', () => {
  it('uma marca por vaga enquanto cabem', () => {
    expect(slotModel(20, 7)).toEqual({ total: 20, filled: 7, perSlot: 1 })
  })

  it('agrupa vagas quando a capacidade passa do limite de marcas', () => {
    const model = slotModel(200, 100)

    expect(model.total).toBe(MAX_SLOTS)
    expect(model.perSlot).toBe(5)
    expect(model.filled).toBe(20)
  })

  it('nunca mostra a fileira vazia se já há alguém inscrito', () => {
    expect(slotModel(200, 1).filled).toBe(1)
  })

  it('nunca mostra a fileira cheia se ainda há vaga', () => {
    expect(slotModel(200, 199).filled).toBe(MAX_SLOTS - 1)
  })

  it('só enche por completo quando está lotado', () => {
    expect(slotModel(200, 200).filled).toBe(MAX_SLOTS)
    expect(slotModel(5, 5).filled).toBe(5)
  })

  it('o limite de marcas pode ser menor, para fileiras compactas', () => {
    const model = slotModel(100, 50, 24)

    expect(model.total).toBe(24)
    expect(model.perSlot).toBe(5)
    expect(model.filled).toBe(12)
  })

  it('evento sem inscritos fica vazio', () => {
    expect(slotModel(30, 0).filled).toBe(0)
  })

  it('tolera capacidade pequena e dados inconsistentes', () => {
    expect(slotModel(1, 0)).toEqual({ total: 1, filled: 0, perSlot: 1 })
    expect(slotModel(3, 9).filled).toBe(3)
  })
})

describe('SlotStrip', () => {
  it('descreve a situação para leitores de tela', () => {
    render(<SlotStrip capacity={20} occupied={7} />)

    expect(screen.getByRole('img', { name: '7 de 20 vagas ocupadas, 13 livres' })).toBeInTheDocument()
  })

  it('diz que está lotado', () => {
    render(<SlotStrip capacity={10} occupied={10} />)

    expect(screen.getByRole('img', { name: 'Lotado: 10 de 10 vagas ocupadas' })).toBeInTheDocument()
  })

  it('desenha uma marca por vaga e destaca as ocupadas', () => {
    const { container } = render(<SlotStrip capacity={8} occupied={3} />)

    expect(container.querySelectorAll('.slots__slot')).toHaveLength(8)
    expect(container.querySelectorAll('.slots__slot--filled')).toHaveLength(3)
  })

  it('concorda no singular', () => {
    render(<SlotStrip capacity={4} occupied={3} />)

    expect(screen.getByRole('img', { name: '3 de 4 vagas ocupadas, 1 livre' })).toBeInTheDocument()
  })
})

describe('SlotCaption', () => {
  it('mostra ocupadas sobre capacidade e quantas faltam', () => {
    render(<SlotCaption capacity={20} occupied={7} />)

    expect(screen.getByText('7/20')).toBeInTheDocument()
    expect(screen.getByText('13 vagas livres')).toBeInTheDocument()
  })

  it('troca o texto por Lotado', () => {
    render(<SlotCaption capacity={5} occupied={5} />)

    expect(screen.getByText('Lotado')).toBeInTheDocument()
  })
})
