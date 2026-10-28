import { describe, expect, it } from 'vitest'
import { createDraftIds } from './idempotency.ts'

function sequentialIds() {
  let next = 0
  return () => `id-${++next}`
}

describe('createDraftIds', () => {
  it('reuses the id while the same values are submitted again (a retry)', () => {
    const drafts = createDraftIds(sequentialIds())

    expect(drafts.idFor('Tacos')).toBe('id-1')
    expect(drafts.idFor('Tacos')).toBe('id-1')
  })

  it('gives changed values a new id, so an edited resubmit is a new create, never a stuck 409', () => {
    const drafts = createDraftIds(sequentialIds())

    drafts.idFor('Tacso')
    expect(drafts.idFor('Tacos')).toBe('id-2')
  })

  it('starts over after a success or a cancel', () => {
    const drafts = createDraftIds(sequentialIds())

    drafts.idFor('Tacos')
    drafts.reset()
    expect(drafts.idFor('Tacos')).toBe('id-2')
  })
})