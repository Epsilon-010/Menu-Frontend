import { useState } from 'react'

/**
 * Busy and error state for the actions of one list row (rename, hide, delete...).
 *
 * Every action resolves to an error message, or null on success; `onSuccess` runs only then
 * (for example to close the form that triggered it).
 */
export function useRowAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>, onSuccess?: () => void): Promise<string | null> {
    setBusy(true)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (failure === null) onSuccess?.()
    return failure
  }

  return { busy, error, run }
}
