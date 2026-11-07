import { useEffect, useRef, useState } from 'react'
import { TextField } from '../../components/Field'
import { CepNotFoundError, formatCep, isCompleteCep, lookupCep, type CepLookup } from '../../lib/viacep'
import { STATES, type AddressErrors, type AddressMode, type AddressValue } from './address'
import './address.css'

type Status = 'idle' | 'loading' | 'found' | 'not-found' | 'unavailable'

interface Props {
  value: AddressValue
  onChange: (value: AddressValue) => void
  /** `full` pede rua, número, complemento e bairro (eventos); `region` só CEP, cidade e estado (perfis). */
  mode: AddressMode
  errors?: AddressErrors
  /** Troca a consulta de CEP; os testes usam para não depender da internet. */
  lookup?: (cep: string, signal?: AbortSignal) => Promise<CepLookup>
}

const STATUS_HINT: Record<Status, string | undefined> = {
  idle: 'Digite o CEP e preenchemos o resto.',
  loading: 'Buscando o endereço…',
  found: 'Endereço encontrado. Confira e complete o número.',
  'not-found': undefined,
  unavailable: undefined,
}

/**
 * Endereço preenchido pelo CEP. Ao completar os 8 números, consulta o ViaCEP e preenche cidade, estado e (no modo
 * completo) rua e bairro. Tudo continua editável, e uma falha da consulta nunca impede de preencher à mão.
 */
export function AddressFields({ value, onChange, mode, errors = {}, lookup = lookupCep }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const latest = useRef(value)
  const request = useRef<AbortController | null>(null)

  // a consulta termina depois de a tela ter mudado; ela precisa mesclar com o que o usuário já digitou
  useEffect(() => {
    latest.current = value
  })
  useEffect(() => () => request.current?.abort(), [])

  function patch(changes: Partial<AddressValue>) {
    onChange({ ...latest.current, ...changes })
  }

  async function search(cep: string) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setStatus('loading')
    try {
      const found = await lookup(cep, controller.signal)
      if (controller.signal.aborted) return
      patch({
        cep: found.cep,
        city: found.city || latest.current.city,
        state: found.state || latest.current.state,
        ...(mode === 'full'
          ? {
              street: found.street || latest.current.street,
              neighborhood: found.neighborhood || latest.current.neighborhood,
            }
          : {}),
      })
      setStatus('found')
    } catch (caught) {
      if (controller.signal.aborted) return
      setStatus(caught instanceof CepNotFoundError ? 'not-found' : 'unavailable')
    }
  }

  function handleCep(raw: string) {
    const cep = formatCep(raw)
    patch({ cep })
    if (isCompleteCep(cep)) {
      void search(cep)
    } else {
      request.current?.abort()
      setStatus('idle')
    }
  }

  const cepError =
    errors.cep ??
    (status === 'not-found'
      ? 'CEP não encontrado. Confira os números ou preencha o endereço à mão.'
      : status === 'unavailable'
        ? 'Não foi possível consultar o CEP agora. Preencha o endereço à mão.'
        : undefined)

  return (
    <fieldset className="address">
      <legend className="visually-hidden">Endereço</legend>

      <TextField
        label="CEP"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        maxLength={9}
        hint={cepError ? undefined : STATUS_HINT[status]}
        error={cepError}
        value={value.cep}
        onChange={(event) => handleCep(event.target.value)}
      />

      {mode === 'full' ? (
        <>
          <TextField
            label="Endereço"
            autoComplete="address-line1"
            hint="Rua ou local onde o evento acontece."
            error={errors.street}
            value={value.street}
            onChange={(event) => patch({ street: event.target.value })}
          />
          <div className="address__row">
            <TextField
              label="Número"
              autoComplete="off"
              value={value.number}
              onChange={(event) => patch({ number: event.target.value })}
            />
            <TextField
              label="Complemento"
              autoComplete="address-line2"
              value={value.complement}
              onChange={(event) => patch({ complement: event.target.value })}
            />
          </div>
          <TextField
            label="Bairro"
            value={value.neighborhood}
            onChange={(event) => patch({ neighborhood: event.target.value })}
          />
        </>
      ) : null}

      <div className="address__row address__row--city">
        <TextField
          label="Cidade"
          autoComplete="address-level2"
          error={errors.city}
          value={value.city}
          onChange={(event) => patch({ city: event.target.value })}
        />
        <div className={`field ${errors.state ? 'field--invalid' : ''}`}>
          <label className="field__label" htmlFor="address-state">
            Estado
          </label>
          <select
            id="address-state"
            className="field__control"
            autoComplete="address-level1"
            aria-invalid={errors.state ? true : undefined}
            value={value.state}
            onChange={(event) => patch({ state: event.target.value })}
          >
            <option value="">Selecione</option>
            {STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {errors.state ? <p className="field__error">{errors.state}</p> : null}
        </div>
      </div>
    </fieldset>
  )
}
