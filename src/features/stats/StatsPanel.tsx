import { ChartBarIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText, ListSkeleton, LoadError, SuccessText } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { SelectField } from '../../shared/ui/RowActions.tsx'
import { OrdersError } from '../kitchen/api.ts'
import { fetchStatistics, fetchTenantSettings, updateTenantSettings, type Statistics } from './api.ts'
import { presetRange, rangeError, statsRequestKey, todayIn, type DateRange, type RangePreset } from './logic.ts'
import { StatsReport } from './StatsReport.tsx'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'custom', label: 'Personalizado' },
]

type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; value: T }

function messageOf(error: unknown): string {
  return error instanceof OrdersError ? error.message : 'Algo salió mal. Inténtalo de nuevo.'
}

/**
 * Every IANA zone the browser knows, plus the current one in case it is missing from that list; null on
 * browsers without `Intl.supportedValuesOf` (they get a text field instead of a list).
 */
function zoneOptions(current: string): string[] | null {
  if (typeof Intl.supportedValuesOf !== 'function') return null
  const zones = Intl.supportedValuesOf('timeZone')
  return zones.includes(current) ? zones : [current, ...zones]
}

function TimezoneSetting({ timezone, onSaved }: { timezone: string; onSaved: (timezone: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [choice, setChoice] = useState(timezone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const options = useMemo(() => zoneOptions(timezone), [timezone])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const settings = await updateTenantSettings({ timezone: choice })
      onSaved(settings.timezone)
      setEditing(false)
      setSaved(true)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>
          Los días van de medianoche a medianoche en <span className="font-medium text-ink">{timezone}</span>.
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setChoice(timezone)
            setSaved(false)
            setEditing(true)
          }}
        >
          Cambiar zona horaria
        </Button>
        {saved && <SuccessText>Zona horaria guardada.</SuccessText>}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      {options === null ? (
        <Field label="Zona horaria del negocio" className="min-w-64">
          <TextInput value={choice} placeholder="America/Mexico_City" onChange={(event) => setChoice(event.target.value)} />
        </Field>
      ) : (
        <SelectField
          label="Zona horaria del negocio"
          className="min-w-64"
          value={choice}
          options={options.map((zone) => ({ value: zone, label: zone }))}
          onChange={setChoice}
        />
      )}
      <Button variant="primary" disabled={saving} onClick={() => void save()}>
        {saving ? 'Guardando…' : 'Guardar'}
      </Button>
      <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
        Cancelar
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}

/** Admin statistics: pick a range of the business's own days and read every figure for it. */
export function StatsPanel() {
  const [timezone, setTimezone] = useState<Load<string>>({ status: 'loading' })
  const [settingsKey, setSettingsKey] = useState(0)
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [custom, setCustom] = useState<DateRange>({ from: '', to: '' })
  const [applied, setApplied] = useState<DateRange | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)
  // Each result remembers which request it answers; any other request still counts as loading.
  const [result, setResult] = useState<{ key: string; load: Load<Statistics> } | null>(null)
  const [statsKey, setStatsKey] = useState(0)

  useEffect(() => {
    let active = true
    fetchTenantSettings()
      .then((settings) => {
        if (active) setTimezone({ status: 'loaded', value: settings.timezone })
      })
      .catch((caught: unknown) => {
        if (active) setTimezone({ status: 'error', message: messageOf(caught) })
      })
    return () => {
      active = false
    }
  }, [settingsKey])

  const zone = timezone.status === 'loaded' ? timezone.value : null
  // Presets follow the business's today, so they move when the zone changes; a custom range stays as typed.
  const range = useMemo<DateRange | null>(() => {
    if (zone === null) return null
    return preset === 'custom' ? applied : presetRange(preset, todayIn(zone))
  }, [zone, preset, applied])

  const requestKey = statsRequestKey(zone, range, statsKey)
  useEffect(() => {
    if (range === null || requestKey === null) return
    let active = true
    fetchStatistics(range)
      .then((value) => {
        if (active) setResult({ key: requestKey, load: { status: 'loaded', value } })
      })
      .catch((caught: unknown) => {
        if (active) setResult({ key: requestKey, load: { status: 'error', message: messageOf(caught) } })
      })
    return () => {
      active = false
    }
  }, [range, requestKey])
  const stats: Load<Statistics> = result !== null && result.key === requestKey ? result.load : { status: 'loading' }

  function choosePreset(next: RangePreset) {
    setPreset(next)
    if (next === 'custom' && zone !== null && custom.from === '') {
      setCustom(presetRange('7d', todayIn(zone)))
    }
  }

  function applyCustom() {
    const failure = rangeError(custom)
    setCustomError(failure)
    if (failure === null) setApplied({ ...custom })
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Estadísticas"
        description="Lo que cobraste, lo que sigue en cuentas abiertas, lo que más se vende y cuánto tardan las órdenes."
      />

      {timezone.status === 'loading' && <ListSkeleton rows={1} label="Cargando estadísticas" />}
      {timezone.status === 'error' && (
        <LoadError
          message={timezone.message}
          onRetry={() => {
            setTimezone({ status: 'loading' })
            setSettingsKey((key) => key + 1)
          }}
        />
      )}
      {zone !== null && (
        <Card className="space-y-4 p-4">
          <ToggleGroup
            type="single"
            aria-label="Rango de fechas"
            value={preset}
            className="flex-wrap"
            // Pressing the chosen range again would clear it; the report always has a range.
            onValueChange={(next) => next && choosePreset(next as RangePreset)}
          >
            {PRESETS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="py-2">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Desde">
                <TextInput type="date" value={custom.from} onChange={(event) => setCustom({ ...custom, from: event.target.value })} />
              </Field>
              <Field label="Hasta">
                <TextInput type="date" value={custom.to} onChange={(event) => setCustom({ ...custom, to: event.target.value })} />
              </Field>
              <Button variant="primary" onClick={applyCustom}>
                Mostrar
              </Button>
              {customError && <ErrorText>{customError}</ErrorText>}
            </div>
          )}
          <TimezoneSetting timezone={zone} onSaved={(value) => setTimezone({ status: 'loaded', value })} />
        </Card>
      )}

      {zone !== null && range === null && (
        <EmptyState icon={<ChartBarIcon size={24} aria-hidden />} title="Elige los días">
          Elige una fecha inicial y una final, y luego muestra las cifras.
        </EmptyState>
      )}
      {range !== null && stats.status === 'loading' && <ListSkeleton rows={4} label="Cargando estadísticas" />}
      {range !== null && stats.status === 'error' && (
        <LoadError message={stats.message} onRetry={() => setStatsKey((key) => key + 1)} />
      )}
      {range !== null && stats.status === 'loaded' && <StatsReport stats={stats.value} />}
    </div>
  )
}
