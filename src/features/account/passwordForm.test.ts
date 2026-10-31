import { describe, expect, it } from 'vitest'
import { passwordProblem } from './passwordForm.ts'

describe('passwordProblem', () => {
  it('accepts a new password of 8 to 128 characters, repeated and different from the current one', () => {
    expect(passwordProblem({ current: 'TEMPPASS0001', next: 'my-own-pass', repeat: 'my-own-pass' })).toBeNull()
    expect(passwordProblem({ current: 'a', next: 'x'.repeat(128), repeat: 'x'.repeat(128) })).toBeNull()
  })

  it('rejects a new password that is too short or too long', () => {
    const message = 'The new password must have 8 to 128 characters.'
    expect(passwordProblem({ current: 'old-pass-1', next: 'short', repeat: 'short' })).toBe(message)
    expect(passwordProblem({ current: 'old-pass-1', next: 'x'.repeat(129), repeat: 'x'.repeat(129) })).toBe(message)
  })

  it('rejects a repeat that does not match', () => {
    expect(passwordProblem({ current: 'old-pass-1', next: 'my-own-pass', repeat: 'my-own-pas' })).toBe(
      'The new passwords do not match.',
    )
  })

  it('rejects the current password as the new one', () => {
    expect(passwordProblem({ current: 'same-pass-1', next: 'same-pass-1', repeat: 'same-pass-1' })).toBe(
      'The new password must be different from the current one.',
    )
  })
})
