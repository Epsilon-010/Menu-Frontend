import { TimerIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText, ListSkeleton, LoadError, SuccessText } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { OrdersError } from '../kitchen/api.ts'
import { fetchOrderSettings, MAX_LATE_ORDER_MINUTES, MIN_LATE_ORDER_MINUTES, updateOrderSettings } from './api.ts'
import { parseLateMinutes } from './logic.ts'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded' }

function messageOf(error: unknown): string {
  return error instanceof OrdersError ? error.message : 'Algo salió mal. Intenta de nuevo.'
}

/** Admin section for how orders are handled: when an order counts as late in the kitchen and delivery queues. */
export function OrderSettingsPanel() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [loadKey, setLoadKey] = useState(0)
  const [minutes, setMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    fetchOrderSettings()
      .then((settings) => {
        if (!active) return
        setMinutes(String(settings.late_order_minutes))
        setLoad({ status: 'loaded' })
      })
      .catch((caught: unknown) => {
        if (active) setLoad({ status: 'error', message: messageOf(caught) })
      })
    return () => {
      active = false
    }
  }, [loadKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    const parsed = parseLateMinutes(minutes)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    setSaving(true)
    try {
      const settings = await updateOrderSettings({ late_order_minutes: parsed.value })
      setMinutes(String(settings.late_order_minutes))
      setError(null)
      setSaved(true)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={<TimerIcon size={24} weight="fill" aria-hidden />}
        title="Órdenes"
        description="La cocina y los meseros ven cuánto ha esperado cada orden. Las órdenes que esperan más que esto se resaltan en sus pantallas."
      />

      {load.status === 'loading' && <ListSkeleton rows={1} label="Cargando la configuración de órdenes" />}
      {load.status === 'error' && (
        <LoadError
          message={load.message}
          onRetry={() => {
            setLoad({ status: 'loading' })
            setLoadKey((key) => key + 1)
          }}
        />
      )}
      {load.status === 'loaded' && (
        <Card className="max-w-md p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Resaltar órdenes que esperan más de (minutos)"
              hint={`De ${MIN_LATE_ORDER_MINUTES} a ${MAX_LATE_ORDER_MINUTES} minutos.`}
            >
              <TextInput
                inputMode="numeric"
                required
                value={minutes}
                onChange={(event) => {
                  setMinutes(event.target.value)
                  setSaved(false)
                }}
              />
            </Field>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            {saved && <SuccessText>Guardado. Las pantallas de cocina y meseros lo usan la próxima vez que se abran.</SuccessText>}
          </form>
        </Card>
      )}
    </div>
  )
}
