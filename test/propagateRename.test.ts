import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyRenames, computeRenames } from '../src/propagateRename'
import { updatePersonnes } from '../src/updatePersonnes'
import { updatePlages } from '../src/updatePlages'
import {
  FakeSheet,
  installPropertiesService,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())
beforeEach(() => installPropertiesService())

describe('computeRenames', () => {
  it('maps changed labels, row by row', () => {
    const renames = computeRenames(['a', 'b', 'c'], ['a', 'B', 'C'])
    expect([...renames]).toEqual([
      ['b', 'B'],
      ['c', 'C']
    ])
  })

  it('ignores rows that appear or disappear', () => {
    expect(computeRenames(['', 'b'], ['a', '']).size).toBe(0)
  })

  it('skips an old label shared by several rows', () => {
    expect(computeRenames(['x', 'x'], ['y', 'x']).size).toBe(0)
  })

  it('skips a new label that another row already had', () => {
    // Rows swapped their names: the references cannot be reassigned safely.
    expect(computeRenames(['a', 'b'], ['b', 'a']).size).toBe(0)
  })

  it('copes with a shorter old list', () => {
    expect([...computeRenames(['a'], ['A', 'new'])]).toEqual([['a', 'A']])
  })
})

describe('applyRenames', () => {
  it('rewrites only the matching cells and reports how many', () => {
    const sheet = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['a', 'p1'],
      ['b', 'p2'],
      ['a', 'p3']
    ])
    const changed = applyRenames(sheet as any, 'A2:A', new Map([['a', 'A']]))
    expect(changed).toBe(2)
    expect(sheet.column(1)).toEqual(['A', 'b', 'A'])
    expect(sheet.column(2)).toEqual(['p1', 'p2', 'p3'])
  })

  it('does nothing without renames or without sheet', () => {
    const sheet = new FakeSheet('engagements', [['personne', 'plage'], ['a', 'p1']])
    expect(applyRenames(sheet as any, 'A2:A', new Map())).toBe(0)
    expect(applyRenames(null, 'A2:A', new Map([['a', 'A']]))).toBe(0)
  })
})

describe('rename propagation', () => {
  it('follows a person renamed in personnes into engagements and contreparties', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', 'Maria', 'Marie Dupont', 'm@example.org', 'à envoyer'],
      ['Martin', 'Jean', 'Jean Martin', 'j@example.org', 'envoyé']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', 'p1'],
      ['Jean Martin', 'p1'],
      ['Marie Dupont', 'p2']
    ])
    const contreparties = new FakeSheet('contreparties', [
      ['personne', 'contrepartie', 'remarque'],
      ['Marie Dupont', 'boisson', '']
    ])
    installSpreadsheetApp([personnes, engagements, contreparties])

    updatePersonnes()

    expect(personnes.column(3)).toEqual(['Maria Dupont', 'Jean Martin'])
    expect(engagements.column(1)).toEqual(['Maria Dupont', 'Jean Martin', 'Maria Dupont'])
    expect(contreparties.column(1)).toEqual(['Maria Dupont'])
  })

  it('follows a plage whose time changed into engagements', () => {
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      ['01.01.2021', 'bar', '20:30', '21:30', 2, '01.01.2021 | bar | 20:00-21:00'],
      ['02.01.2021', 'bar', '20:00', '21:00', 2, '02.01.2021 | bar | 20:00-21:00']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00'],
      ['Jean Martin', '02.01.2021 | bar | 20:00-21:00']
    ])
    installSpreadsheetApp([plages, engagements])

    updatePlages()

    expect(engagements.column(2)).toEqual([
      '01.01.2021 | bar | 20:30-21:30',
      '02.01.2021 | bar | 20:00-21:00'
    ])
  })

  it('leaves references alone when a label becomes empty', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', '', 'Marie Dupont', 'm@example.org', 'à envoyer']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', 'p1']
    ])
    installSpreadsheetApp([personnes, engagements])

    updatePersonnes()

    expect(personnes.column(3)).toEqual([])
    expect(engagements.column(1)).toEqual(['Marie Dupont'])
  })
})
