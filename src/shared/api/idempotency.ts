/**
 * Client ids that make creates idempotent.
 *
 * One id per distinct submission: sending the same values again (a retry after a lost answer,
 * a double click) reuses the id, so the server returns what it already created; changed values
 * get a new id, so an edited resubmit is a new create and never gets stuck on "id already used".
 * Call `reset` after a success or when the form is cancelled.
 */
export function createDraftIds(newId: () => string = () => crypto.randomUUID()) {
  let current: { key: string; id: string } | null = null
  return {
    idFor(key: string): string {
      if (current === null || current.key !== key) current = { key, id: newId() }
      return current.id
    },
    reset(): void {
      current = null
    },
  }
}

export type DraftIds = ReturnType<typeof createDraftIds>
