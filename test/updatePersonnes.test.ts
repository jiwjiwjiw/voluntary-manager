import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeFullName, updatePersonnes } from '../src/updatePersonnes'
import { FakeSheet, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('composeFullName', () => {
  it('puts the first name before the last name', () => {
    expect(composeFullName(['Dupont', 'Marie'])).toBe('Marie Dupont')
  })

  it('is empty when either part is missing', () => {
    expect(composeFullName(['Dupont', ''])).toBe('')
    expect(composeFullName(['', 'Marie'])).toBe('')
    expect(composeFullName(['', ''])).toBe('')
  })
})

describe('updatePersonnes', () => {
  it('fills column C for every row below the header, blank rows included', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', 'Marie', 'stale', 'marie@example.org', 'à envoyer'],
      ['Martin', '', 'stale', '', '']
    ])
    installSpreadsheetApp([personnes])

    updatePersonnes()

    expect(personnes.column(3)).toEqual(['Marie Dupont'])
    expect(personnes.cells[2][2]).toBe('')
  })

  it('does nothing when the sheet is missing', () => {
    installSpreadsheetApp([])
    expect(() => updatePersonnes()).not.toThrow()
  })
})
