import { describe, expect, it } from 'vitest'
import { movedById } from './order.ts'

describe('movedById', () => {
  const ids = ['a', 'b', 'c']

  it('swaps the element with its neighbour', () => {
    expect(movedById(ids, 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(movedById(ids, 'b', 1)).toEqual(['a', 'c', 'b'])
  })

  it('leaves the order alone at the edges or for an unknown id', () => {
    expect(movedById(ids, 'a', -1)).toEqual(ids)
    expect(movedById(ids, 'c', 1)).toEqual(ids)
    expect(movedById(ids, 'z', 1)).toEqual(ids)
  })

  it('never mutates the input', () => {
    const input = [...ids]
    movedById(input, 'a', 1)
    expect(input).toEqual(ids)
  })
})
