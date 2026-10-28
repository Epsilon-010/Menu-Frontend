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
  return error instanceof OrdersError ? error.message : 'Something went wrong. Please try again.'
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
        title="Orders"
        description="The kitchen and the waiters see how long each order has waited. Orders waiting longer than this are highlighted on their screens."
      />

      {load.status === 'loading' && <ListSkeleton rows={1} label="Loading order settings" />}
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
              label="Highlight orders waiting longer than (minutes)"
              hint={`From ${MIN_LATE_ORDER_MINUTES} to ${MAX_LATE_ORDER_MINUTES} minutes.`}
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
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            {saved && <SuccessText>Saved. The kitchen and waiter screens use it the next time they open.</SuccessText>}
          </form>
        </Card>
      )}
    </div>
  )
}
