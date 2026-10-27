import { describe, expect, it } from 'vitest'
import {
  compareRowsOnColumn,
  getColumnAsRow,
  rowHasContent,
  rowHasValue
} from '../src/sheets-tools/helpers'

// The helpers of the sheets-tools submodule that this project relies on.

describe('rowHasContent', () => {
  it('is false for a row made of empty cells', () => {
    expect(rowHasContent(['', '', ''])).toBe(false)
  })

  it('is true as soon as one cell is filled', () => {
    expect(rowHasContent(['', 'x', ''])).toBe(true)
  })
})

describe('rowHasValue', () => {
  it('matches the exact value in the given column', () => {
    expect(rowHasValue(1, 'b')(['a', 'b'])).toBe(true)
    expect(rowHasValue(1, 'b')(['b', 'a'])).toBe(false)
    expect(rowHasValue(1, 'b')(['a', 'bb'])).toBe(false)
  })
})

describe('getColumnAsRow', () => {
  it('picks one column of a row', () => {
    expect([['a', 'b'], ['c', 'd']].map(getColumnAsRow(1))).toEqual(['b', 'd'])
  })
})

describe('compareRowsOnColumn', () => {
  it('sorts rows by the given column', () => {
    const rows = [['x', 'b'], ['y', 'a'], ['z', 'c']]
    expect(rows.sort(compareRowsOnColumn(1))).toEqual([
      ['y', 'a'],
      ['x', 'b'],
      ['z', 'c']
    ])
  })
})
