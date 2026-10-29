import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeSynthese, syntheseRows } from '../src/synthese'
import { updatePlanning } from '../src/updatePlanning'
import { FakeSheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

const plage = (date: string, fonction: string, nombre: unknown, suffix = '') => ({
  date,
  fonction,
  nombre,
  libelle: `${date} | ${fonction}${suffix}`
})

describe('computeSynthese', () => {
  const plages = [
    plage('15.12.2020', 'bar', 2),
    plage('15.12.2020', 'caisse', 1),
    plage('16.12.2020', 'bar', 2, ' | 20:00-21:00'),
    plage('16.12.2020', 'bar', 1, ' | 21:00-22:00')
  ]
  const engagements = [
    ['A', '15.12.2020 | bar'],
    ['B', '15.12.2020 | bar'],
    ['C', '15.12.2020 | caisse'],
    ['D', '15.12.2020 | caisse'], // over-booked
    ['E', '16.12.2020 | bar | 20:00-21:00']
  ]

  it('sums places and filled seats per date, in chronological order, with a total', () => {
    expect(computeSynthese(plages, engagements).parDate).toEqual([
      { cle: '15.12.2020', places: 3, pourvues: 4, vacantes: 0, taux: 1 },
      { cle: '16.12.2020', places: 3, pourvues: 1, vacantes: 2, taux: 1 / 3 },
      { cle: 'total', places: 6, pourvues: 5, vacantes: 1, taux: 5 / 6 }
    ])
  })

  it('sums per function, in alphabetical order', () => {
    expect(computeSynthese(plages, engagements).parFonction).toEqual([
      { cle: 'bar', places: 5, pourvues: 3, vacantes: 2, taux: 3 / 5 },
      { cle: 'caisse', places: 1, pourvues: 2, vacantes: 0, taux: 1 },
      { cle: 'total', places: 6, pourvues: 5, vacantes: 1, taux: 5 / 6 }
    ])
  })

  it('treats a missing or invalid number of places as 0, without a ratio', () => {
    const { parDate } = computeSynthese([plage('01.01.2021', 'bar', '')], [])
    expect(parDate[0]).toEqual({ cle: '01.01.2021', places: 0, pourvues: 0, vacantes: 0, taux: '' })
  })

  it('is empty without plages', () => {
    expect(computeSynthese([], engagements)).toEqual({ parDate: [], parFonction: [] })
  })
})

describe('syntheseRows', () => {
  it('lays out the two tables one under the other', () => {
    const rows = syntheseRows({
      parDate: [{ cle: 'd', places: 1, pourvues: 1, vacantes: 0, taux: 1 }],
      parFonction: [{ cle: 'f', places: 1, pourvues: 0, vacantes: 1, taux: 0 }]
    })
    expect(rows).toEqual([
      ['d', 1, 1, 0, 1],
      [],
      ['fonction', 'places', 'pourvues', 'vacantes', 'taux'],
      ['f', 1, 0, 1, 0]
    ])
  })
})

describe('updatePlanning', () => {
  it('also writes the synthèse sheet, with dates as displayed', () => {
    const personnes = new FakeSheet('personnes', [['nom', 'prénom', 'prénom nom', 'email', 'statut']])
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      [new Date(2021, 0, 2), 'bar', '', '', 1, '02.01.2021 | bar'],
      [new Date(2021, 0, 1), 'bar', '', '', 2, '01.01.2021 | bar']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', '01.01.2021 | bar']
    ])
    const planning = new FakeSheet('planning', [['plage', 'personnes']])
    const { spreadsheet } = installSpreadsheetApp([personnes, plages, engagements, planning])

    updatePlanning()

    const synthese = spreadsheet.getSheetByName('synthèse')!
    expect(synthese.cells[0]).toEqual(['date', 'places', 'pourvues', 'vacantes', 'taux'])
    expect(synthese.rows()).toEqual([
      ['01.01.2021', 2, 1, 1, 0.5],
      ['02.01.2021', 1, 0, 1, 0],
      ['total', 3, 1, 2, 1 / 3],
      [],
      ['fonction', 'places', 'pourvues', 'vacantes', 'taux'],
      ['bar', 3, 1, 2, 1 / 3],
      ['total', 3, 1, 2, 1 / 3]
    ])
  })
})
