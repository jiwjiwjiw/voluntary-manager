import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeComputedSheet } from '../src/computedSheet'
import { computePlanningPersonnes } from '../src/planningPersonnes'
import { updatePlanning } from '../src/updatePlanning'
import { FakeSheet, FakeSpreadsheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('computePlanningPersonnes', () => {
  const plages = ['01.01 | bar', '02.01 | bar', '03.01 | caisse']

  it('lists each person with their plages in chronological order', () => {
    const rows = computePlanningPersonnes(
      ['Marie Dupont', 'Jean Martin', 'Ana Roux'],
      plages,
      [
        ['Marie Dupont', '03.01 | caisse'],
        ['Jean Martin', '02.01 | bar'],
        ['Marie Dupont', '01.01 | bar']
      ]
    )
    expect(rows).toEqual([
      ['Ana Roux', 0, ''],
      ['Jean Martin', 1, '02.01 | bar'],
      ['Marie Dupont', 2, '01.01 | bar\n03.01 | caisse']
    ])
  })

  it('includes names found in engagements only, and ignores empty cells', () => {
    const rows = computePlanningPersonnes(
      ['', 'Marie Dupont'],
      plages,
      [
        ['Inconnu', '01.01 | bar'],
        ['', '02.01 | bar'],
        ['Marie Dupont', '']
      ]
    )
    expect(rows).toEqual([
      ['Inconnu', 1, '01.01 | bar'],
      ['Marie Dupont', 0, '']
    ])
  })

  it('puts plages that no longer exist last', () => {
    const [row] = computePlanningPersonnes(
      ['A'],
      plages,
      [
        ['A', 'obsolète'],
        ['A', '02.01 | bar']
      ]
    )
    expect(row[2]).toBe('02.01 | bar\nobsolète')
  })
})

describe('writeComputedSheet', () => {
  it('creates the sheet, writes header and rows, grows and pads as needed', () => {
    const spreadsheet = new FakeSpreadsheet([])
    const rows = Array.from({ length: 25 }, (_, i) => [`r${i}`, i])

    const sheet = writeComputedSheet(
      spreadsheet as any,
      'calc',
      ['a', 'b', 'c'],
      rows
    ) as unknown as FakeSheet

    expect(spreadsheet.getSheetByName('calc')).toBe(sheet)
    expect(sheet.getMaxRows()).toBe(26)
    expect(sheet.cells[0]).toEqual(['a', 'b', 'c'])
    expect(sheet.rows()).toHaveLength(25)
    expect(sheet.cells[1]).toEqual(['r0', 0, ''])
  })

  it('empties stale rows of an existing sheet', () => {
    const sheet = new FakeSheet('calc', [['x'], ['old 1'], ['old 2'], ['old 3']])
    const spreadsheet = new FakeSpreadsheet([sheet])

    writeComputedSheet(spreadsheet as any, 'calc', ['a'], [['new']])

    expect(sheet.cells[0]).toEqual(['a'])
    expect(sheet.rows()).toEqual([['new']])
  })
})

describe('updatePlanning', () => {
  it('also writes the planning per person', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', 'Marie', 'Marie Dupont', '', ''],
      ['Martin', 'Jean', 'Jean Martin', '', '']
    ])
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      ['02.01.2021', 'bar', '', '', 1, '02.01.2021 | bar'],
      ['01.01.2021', 'bar', '', '', 1, '01.01.2021 | bar']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', '02.01.2021 | bar'],
      ['Marie Dupont', '01.01.2021 | bar']
    ])
    const planning = new FakeSheet('planning', [['plage', 'personnes']])
    const { spreadsheet } = installSpreadsheetApp([personnes, plages, engagements, planning])

    updatePlanning()

    const perPerson = spreadsheet.getSheetByName('planning personnes')!
    expect(perPerson.cells[0]).toEqual(['personne', 'nombre de plages', 'plages'])
    expect(perPerson.rows()).toEqual([
      ['Jean Martin', 0, ''],
      ['Marie Dupont', 2, '01.01.2021 | bar\n02.01.2021 | bar']
    ])
  })
})
