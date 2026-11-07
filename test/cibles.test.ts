import { afterEach, describe, expect, it, vi } from 'vitest'
import { ciblesEngagement, fonctionsSansPlage, updateEngagementsValidation } from '../src/cibles'
import { FakeSheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

const plages = [
  ['01.01.2021', 'bar', '20:00', '21:00', 2, '01.01.2021 | bar | 20:00-21:00'],
  ['02.01.2021', 'bar', '', '', 1, '02.01.2021 | bar'],
  ['', 'costumes', '', '', '', 'costumes']
]

describe('fonctionsSansPlage', () => {
  it('lists the functions that appear in no plage, once, in sheet order', () => {
    expect(
      fonctionsSansPlage(plages, ['technique', 'bar', 'costumes', '', ' coiffure ', 'technique'])
    ).toEqual(['technique', 'coiffure'])
  })
})

describe('ciblesEngagement', () => {
  it('offers the plage labels, then the functions without plage', () => {
    expect(ciblesEngagement([...plages, plages[0]], ['bar', 'technique'])).toEqual([
      '01.01.2021 | bar | 20:00-21:00',
      '02.01.2021 | bar',
      'costumes',
      'technique'
    ])
  })
})

describe('updateEngagementsValidation', () => {
  const sheets = (plageRows: any[][], fonctionRows: any[][]) => {
    const engagements = new FakeSheet('engagements', [['personne', 'plage']])
    installSpreadsheetApp([
      engagements,
      new FakeSheet('plages', [['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'], ...plageRows]),
      new FakeSheet('fonctions', [['nom', 'type'], ...fonctionRows])
    ])
    return engagements
  }

  it('writes the targets as a strict list on engagements!B', () => {
    const engagements = sheets(plages, [['bar', 'bénévole'], ['technique', '']])

    updateEngagementsValidation()

    expect(engagements.validations).toHaveLength(1)
    expect(engagements.validations[0]).toMatchObject({ row: 2, column: 2 })
    expect(engagements.validations[0].rule).toMatchObject({
      allowInvalid: false,
      values: ['01.01.2021 | bar | 20:00-21:00', '02.01.2021 | bar', 'costumes', 'technique']
    })
  })

  it('falls back on the plage labels range when there is nothing to offer', () => {
    const engagements = sheets([], [])

    updateEngagementsValidation()

    expect(engagements.validations[0].rule.values).toBeUndefined()
  })
})
