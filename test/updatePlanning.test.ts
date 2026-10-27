import { afterEach, describe, expect, it, vi } from 'vitest'
import { comparePlages, computePlanning, updatePlanning } from '../src/updatePlanning'
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

describe('comparePlages', () => {
  const row = (date: any, debut: any = '') => [date, 'f', debut, '', 1, 'l']

  it('orders by date before anything else', () => {
    const rows = [row('02.01.2021'), row('15.12.2020'), row('01.01.2021')]
    expect(rows.sort(comparePlages).map(r => r[0])).toEqual([
      '15.12.2020',
      '01.01.2021',
      '02.01.2021'
    ])
  })

  it('accepts Date cells and text dates alike', () => {
    const rows = [row('02.01.2021'), row(new Date(2021, 0, 1))]
    expect(rows.sort(comparePlages).map(r => r[0])).toEqual([
      new Date(2021, 0, 1),
      '02.01.2021'
    ])
  })

  it('breaks ties on the start time', () => {
    const rows = [
      row('01.01.2021', '20:00'),
      row('01.01.2021', new Date(1899, 11, 30, 9, 30)),
      row('01.01.2021', '14:00')
    ]
    expect(rows.sort(comparePlages).map(r => r[2])).toEqual([
      new Date(1899, 11, 30, 9, 30),
      '14:00',
      '20:00'
    ])
  })

  it('puts rows without a recognisable date last, in text order', () => {
    const rows = [row('b'), row('01.01.2021'), row('a')]
    expect(rows.sort(comparePlages).map(r => r[0])).toEqual([
      '01.01.2021',
      'a',
      'b'
    ])
  })
})

describe('updatePlanning', () => {
  it('rewrites the planning sheet in chronological order', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      ['02.01.2021', 'caisse', '', '', 1, '02.01.2021 | caisse'],
      ['01.01.2021', 'bar', '20:00', '21:00', 2, '01.01.2021 | bar | 20:00-21:00'],
      ['15.12.2020', 'bar', '20:00', '21:00', 1, '15.12.2020 | bar | 20:00-21:00']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00']
    ])
    const planning = new FakeSheet('planning', [
      ['plage', 'personnes'],
      ['old 1', 'x'],
      ['old 2', 'y'],
      ['old 3', 'z'],
      ['old 4', 'w']
    ])
    installSpreadsheetApp([plages, engagements, planning])

    updatePlanning()

    expect(planning.column(1)).toEqual([
      '15.12.2020 | bar | 20:00-21:00',
      '01.01.2021 | bar | 20:00-21:00',
      '02.01.2021 | caisse'
    ])
    expect(planning.column(2)).toEqual(['?', 'Marie Dupont\n?', '?'])
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
