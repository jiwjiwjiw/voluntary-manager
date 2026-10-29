import { afterEach, describe, expect, it, vi } from 'vitest'
import { Validation } from '../src/sheets-tools/Validation'
import { FakeSheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('Validation', () => {
  it('references the validating range when the values come from a sheet', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      ['', '', '', '', '', 'p1']
    ])
    const engagements = new FakeSheet('engagements', [['personne', 'plage']])
    installSpreadsheetApp([plages, engagements])

    new Validation('engagements', 'B2:B', 'plages', 'F2:F').update()

    expect(engagements.validations).toHaveLength(1)
    const { rule, column } = engagements.validations[0]
    expect(column).toBe(2)
    expect(rule.allowInvalid).toBe(false)
    expect(rule.range).toBe(`plages!2:${plages.getMaxRows()}/6:6`)
    expect(rule.showDropdown).toBe(true)
    expect(rule.values).toBeUndefined()
  })

  it('builds a list, without empty cells or duplicates, when extra values are added', () => {
    const dates = new FakeSheet('dates', [['date'], ['d1'], [''], ['d1'], ['d2']])
    const plages = new FakeSheet('plages', [['date']])
    installSpreadsheetApp([dates, plages])

    new Validation('plages', 'A2:A', 'dates', 'A2:A', false, ['x', 'd2']).update()

    const { rule } = plages.validations[0]
    expect(rule.values).toEqual(['d1', 'd2', 'x'])
    expect(rule.range).toBeUndefined()
  })

  it('works with a static list only', () => {
    const fonctions = new FakeSheet('fonctions', [['nom', 'type']])
    installSpreadsheetApp([fonctions])

    new Validation('fonctions', 'B2:B', '', '', false, ['artiste', 'bénévole']).update()

    expect(fonctions.validations[0].rule.values).toEqual(['artiste', 'bénévole'])
  })

  it('only refreshes when the modified range touches the validating range', () => {
    const dates = new FakeSheet('dates', [['date'], ['d1']])
    const plages = new FakeSheet('plages', [['date']])
    installSpreadsheetApp([dates, plages])
    const validation = new Validation('plages', 'A2:A', 'dates', 'A2:A')

    validation.update(plages.getRange('A2') as any)
    expect(plages.validations).toHaveLength(0)

    validation.update(dates.getRange('A3') as any)
    expect(plages.validations).toHaveLength(1)
  })

  it('writes nothing, without any UI call, when the validated sheet is missing', () => {
    const { ui } = installSpreadsheetApp([])
    expect(() => new Validation('absente', 'A2:A', '', '').update()).not.toThrow()
    expect(ui.alerts).toEqual([])
  })

  it('leaves the existing rule alone when the validating sheet is missing', () => {
    const engagements = new FakeSheet('engagements', [['personne', 'plage']])
    const { ui } = installSpreadsheetApp([engagements])

    new Validation('engagements', 'A2:A', 'personnes', 'C2:C').update()

    expect(engagements.validations).toHaveLength(0)
    expect(ui.alerts).toEqual([])
  })
})
