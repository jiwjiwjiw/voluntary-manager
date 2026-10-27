import { afterEach, describe, expect, it, vi } from 'vitest'
import { computePlanning, updatePlanning } from '../src/updatePlanning'
import { FakeSheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('computePlanning', () => {
  it('lists the engaged people and fills the vacant places with "?"', () => {
    const plages = [
      [3, '01.01.2021 | bar | 20:00-21:00'],
      [1, '02.01.2021 | caisse']
    ]
    const engagements = [
      ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00'],
      ['Jean Martin', '02.01.2021 | caisse'],
      ['Paul Durand', '01.01.2021 | bar | 20:00-21:00']
    ]
    expect(computePlanning(plages, engagements)).toEqual([
      ['01.01.2021 | bar | 20:00-21:00', 'Marie Dupont\nPaul Durand\n?'],
      ['02.01.2021 | caisse', 'Jean Martin']
    ])
  })

  it('keeps everybody when more people are engaged than places', () => {
    const plages = [[1, 'p']]
    const engagements = [
      ['A', 'p'],
      ['B', 'p']
    ]
    expect(computePlanning(plages, engagements)).toEqual([['p', 'A\nB']])
  })

  it('shows no placeholder when the number of places is empty', () => {
    expect(computePlanning([['', 'p']], [])).toEqual([['p', '']])
  })
})

describe('updatePlanning', () => {
  it('rewrites the planning sheet sorted by label', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      ['02.01.2021', 'caisse', '', '', 1, '02.01.2021 | caisse'],
      ['01.01.2021', 'bar', '20:00', '21:00', 2, '01.01.2021 | bar | 20:00-21:00']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00']
    ])
    const planning = new FakeSheet('planning', [
      ['plage', 'personnes'],
      ['old 1', 'x'],
      ['old 2', 'y'],
      ['old 3', 'z']
    ])
    installSpreadsheetApp([plages, engagements, planning])

    updatePlanning()

    expect(planning.column(1)).toEqual([
      '01.01.2021 | bar | 20:00-21:00',
      '02.01.2021 | caisse'
    ])
    expect(planning.column(2)).toEqual(['Marie Dupont\n?', '?'])
  })

  it('leaves the planning sheet alone when there is no plage', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé']
    ])
    const engagements = new FakeSheet('engagements', [['personne', 'plage']])
    const planning = new FakeSheet('planning', [
      ['plage', 'personnes'],
      ['old', 'x']
    ])
    installSpreadsheetApp([plages, engagements, planning])

    expect(() => updatePlanning()).not.toThrow()
    expect(planning.column(1)).toEqual(['old'])
  })
})
