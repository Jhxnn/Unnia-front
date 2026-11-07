import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Registrant } from '../../lib/api/types'
import { RegistrantsList } from './RegistrantsList'

function registrant(overrides: Partial<Registrant> = {}): Registrant {
  return {
    volunteerId: 'vol-1',
    name: 'Maria Souza',
    city: 'Recife',
    status: 'CONFIRMED',
    registeredAt: new Date(2026, 10, 7, 14, 46).toISOString(),
    ...overrides,
  }
}

describe('RegistrantsList', () => {
  it('lista nome, cidade e quando cada pessoa se inscreveu', () => {
    render(<RegistrantsList registrants={[registrant()]} canRecordAttendance={false} onRecordAttendance={vi.fn()} />)

    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
    expect(screen.getByText(/Recife/)).toBeInTheDocument()
    expect(screen.getByText('inscrito em 7 nov, 14:46')).toBeInTheDocument()
  })

  it('sem inscritos, explica o que acontece em seguida', () => {
    render(<RegistrantsList registrants={[]} canRecordAttendance onRecordAttendance={vi.fn()} />)

    expect(screen.getByText(/Ninguém se inscreveu ainda/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('resume quantos estão inscritos e quantos compareceram', () => {
    render(
      <RegistrantsList
        registrants={[
          registrant({ volunteerId: 'a', name: 'Ana' }),
          registrant({ volunteerId: 'b', name: 'Bia', status: 'ATTENDED' }),
          registrant({ volunteerId: 'c', name: 'Caio', status: 'ATTENDED' }),
        ]}
        canRecordAttendance
        onRecordAttendance={vi.fn()}
      />,
    )

    expect(screen.getByText(/inscritos/)).toHaveTextContent('3 inscritos · 2 presenças')
  })

  it('concorda no singular', () => {
    render(
      <RegistrantsList registrants={[registrant({ status: 'ATTENDED' })]} canRecordAttendance onRecordAttendance={vi.fn()} />,
    )

    expect(document.querySelector('.registrants__summary')).toHaveTextContent('1 inscrito · 1 presença')
  })

  it('depois do início, oferece registrar presença de quem ainda não compareceu', async () => {
    const onRecord = vi.fn()
    render(
      <RegistrantsList
        registrants={[
          registrant({ volunteerId: 'a', name: 'Ana' }),
          registrant({ volunteerId: 'b', name: 'Bia', status: 'ATTENDED' }),
        ]}
        canRecordAttendance
        onRecordAttendance={onRecord}
      />,
    )

    const rows = screen.getAllByRole('listitem')
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument()
    expect(within(rows[1]).getByText('Presença registrada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Registrar presença de Ana' }))

    expect(onRecord).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('antes do início não há botão e a lista explica por quê', () => {
    render(<RegistrantsList registrants={[registrant()]} canRecordAttendance={false} onRecordAttendance={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('A presença pode ser registrada quando o evento começar.')).toBeInTheDocument()
  })

  it('não repete o aviso quando todos já compareceram', () => {
    render(
      <RegistrantsList
        registrants={[registrant({ status: 'ATTENDED' })]}
        canRecordAttendance={false}
        onRecordAttendance={vi.fn()}
      />,
    )

    expect(screen.queryByText(/quando o evento começar/)).not.toBeInTheDocument()
  })

  it('bloqueia o botão de quem está sendo atualizado', () => {
    render(
      <RegistrantsList
        registrants={[registrant({ volunteerId: 'a', name: 'Ana' }), registrant({ volunteerId: 'b', name: 'Bia' })]}
        canRecordAttendance
        recordingVolunteerId="a"
        onRecordAttendance={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Registrar presença de Ana' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Registrar presença de Bia' })).toBeEnabled()
  })
})
