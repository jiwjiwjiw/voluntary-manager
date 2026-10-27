import { afterEach, describe, expect, it, vi } from 'vitest'
import { composePlageLabel, updatePlages } from '../src/updatePlages'
import { FakeSheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('composePlageLabel', () => {
  it('joins date, function and time span with " | "', () => {
    expect(composePlageLabel(['01.01.2021', 'bar', '20:00', '21:00'])).toBe(
      '01.01.2021 | bar | 20:00-21:00'
    )
  })

  it('leaves out the missing parts', () => {
    expect(composePlageLabel(['01.01.2021', '', '20:00', '21:00'])).toBe(
      '01.01.2021 | 20:00-21:00'
    )
    expect(composePlageLabel(['', 'bar', '', ''])).toBe('bar')
    expect(composePlageLabel(['01.01.2021', 'bar', '20:00', ''])).toBe(
      '01.01.2021 | bar'
    )
  })

  it('is empty for an empty row', () => {
    expect(composePlageLabel(['', '', '', ''])).toBe('')
  })
})

describe('updatePlages', () => {
  it('uses the displayed text of date and time cells', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      [
        new Date(2021, 0, 1),
        'bar',
        new Date(1899, 11, 30, 20, 0),
        new Date(1899, 11, 30, 21, 30),
        2,
        ''
      ]
    ])
    installSpreadsheetApp([plages])

    updatePlages()

    expect(plages.column(6)).toEqual(['01.01.2021 | bar | 20:00-21:30'])
  })

  it('writes the label of every row into column F', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      ['01.01.2021', 'bar', '20:00', '21:00', 2, 'stale'],
      ['02.01.2021', 'caisse', '', '', 1, 'stale']
    ])
    installSpreadsheetApp([plages])

    updatePlages()

    expect(plages.column(6)).toEqual([
      '01.01.2021 | bar | 20:00-21:00',
      '02.01.2021 | caisse'
    ])
  })
})
