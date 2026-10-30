import { ChartBarIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, Select, TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText, ListSkeleton, LoadError, SuccessText } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { OrdersError } from '../kitchen/api.ts'
import { fetchStatistics, fetchTenantSettings, updateTenantSettings, type Statistics } from './api.ts'
import { presetRange, rangeError, todayIn, type DateRange, type RangePreset } from './logic.ts'
import { StatsReport } from './StatsReport.tsx'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' },
]

type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; value: T }

function messageOf(error: unknown): string {
  return error instanceof OrdersError ? error.message : 'Something went wrong. Please try again.'
}

/** Every IANA zone the browser knows, plus the current one in case it is missing from that list. */
function zoneOptions(current: string): string[] {
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
          Days run midnight to midnight in <span className="font-medium text-ink">{timezone}</span>.
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
          Change time zone
        </Button>
        {saved && <SuccessText>Time zone saved.</SuccessText>}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Time zone of the business" className="min-w-64">
        <Select value={choice} onChange={(event) => setChoice(event.target.value)}>
          {options.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
      </Field>
      <Button variant="primary" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
        Cancel
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

  const requestKey = range === null ? null : `${range.from}|${range.to}|${statsKey}`
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
        title="Statistics"
        description="What you collected, what is still on open bills, what sells most and how long orders take."
      />

      {timezone.status === 'loading' && <ListSkeleton rows={1} label="Loading statistics" />}
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
          <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
            {PRESETS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={preset === option.value ? 'primary' : 'secondary'}
                aria-pressed={preset === option.value}
                onClick={() => choosePreset(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="From">
                <TextInput type="date" value={custom.from} onChange={(event) => setCustom({ ...custom, from: event.target.value })} />
              </Field>
              <Field label="To">
                <TextInput type="date" value={custom.to} onChange={(event) => setCustom({ ...custom, to: event.target.value })} />
              </Field>
              <Button variant="primary" onClick={applyCustom}>
                Show
              </Button>
              {customError && <ErrorText>{customError}</ErrorText>}
            </div>
          )}
          <TimezoneSetting timezone={zone} onSaved={(value) => setTimezone({ status: 'loaded', value })} />
        </Card>
      )}

      {zone !== null && range === null && (
        <EmptyState icon={<ChartBarIcon size={24} aria-hidden />} title="Pick the days">
          Choose a start and an end date, then show the figures.
        </EmptyState>
      )}
      {range !== null && stats.status === 'loading' && <ListSkeleton rows={4} label="Loading statistics" />}
      {range !== null && stats.status === 'error' && (
        <LoadError message={stats.message} onRetry={() => setStatsKey((key) => key + 1)} />
      )}
      {range !== null && stats.status === 'loaded' && <StatsReport stats={stats.value} />}
    </div>
  )
}
