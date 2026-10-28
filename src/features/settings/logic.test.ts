import { describe, expect, it } from 'vitest'
import { parseLateMinutes } from './logic.ts'

describe('parseLateMinutes', () => {
  it('accepts whole minutes from 1 to 240', () => {
    expect(parseLateMinutes('1')).toEqual({ ok: true, value: 1 })
    expect(parseLateMinutes(' 240 ')).toEqual({ ok: true, value: 240 })
  })

  it('explains what is wrong with anything else', () => {
    const message = 'Use a whole number of minutes from 1 to 240.'
    for (const input of ['', '0', '241', '12.5', 'abc', '-3']) {
      expect(parseLateMinutes(input)).toEqual({ ok: false, message })
    }
  })
})
