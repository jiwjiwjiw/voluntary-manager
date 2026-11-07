import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensurePersoColumn, findPersoColumn, readTextesPerso } from '../src/textePerso'
import { updateModels } from '../src/updateModels'
import { FakeSheet, installLockService, installPropertiesService, installSpreadsheetApp } from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

const header = ['nom', 'prénom', 'prénom nom', 'email', 'statut']

describe('findPersoColumn', () => {
  it('finds the column by its header, any case, wherever it is after E', () => {
    const sheet = new FakeSheet('personnes', [[...header, 'remarques', ' Texte perso MAIL ']])
    expect(findPersoColumn(sheet as any)).toBe(7)
  })

  it('finds nothing without the header, and never in A:E', () => {
    expect(findPersoColumn(new FakeSheet('personnes', [[...header, 'remarques']]) as any)).toBeUndefined()
    expect(
      findPersoColumn(new FakeSheet('personnes', [['texte perso mail', 'prénom']]) as any)
    ).toBeUndefined()
  })
})

describe('ensurePersoColumn', () => {
  it('adds the column at the right of the columns in use, never over them', () => {
    const sheet = new FakeSheet('personnes', [
      [...header, 'remarques', ''],
      ['Dupont', 'Marie', 'Marie Dupont', 'm@example.org', 'envoyé', 'végétarienne', 'tél. 079']
    ])
    expect(ensurePersoColumn(sheet as any)).toBe(8)
    expect(sheet.cells[0][7]).toBe('texte perso mail')
    expect(sheet.cells[0][5]).toBe('remarques')
    expect(ensurePersoColumn(sheet as any)).toBe(8)
  })

  it('puts it in F on a sheet that stops at E', () => {
    const sheet = new FakeSheet('personnes', [header])
    expect(ensurePersoColumn(sheet as any)).toBe(6)
  })
})

describe('readTextesPerso', () => {
  it('reads the column found, or blanks without it', () => {
    const sheet = new FakeSheet('personnes', [
      [...header, 'remarques', 'texte perso mail'],
      ['', '', '', '', '', 'x', 'merci'],
      ['', '', '', '', '', 'y', '']
    ])
    expect(readTextesPerso(sheet as any, 2)).toEqual(['merci', ''])
    expect(readTextesPerso(new FakeSheet('personnes', [header]) as any, 2)).toEqual(['', ''])
  })
})

describe('a column F the users already had', () => {
  it('is neither a texte perso nor a reason to flag « à renvoyer »', () => {
    const personnes = new FakeSheet('personnes', [
      [...header, 'remarques'],
      ['Dupont', 'Marie', 'Marie Dupont', 'm@example.org', 'envoyé', 'végétarienne']
    ])
    const engagements = new FakeSheet('engagements', [['personne', 'plage'], ['Marie Dupont', 'p']])
    installSpreadsheetApp([personnes, engagements])
    installLockService()
    installPropertiesService()

    updateModels({ range: personnes.getRange('A2') } as any)

    expect(personnes.cells[1][4]).toBe('envoyé')
    expect(personnes.cells[0][5]).toBe('remarques')
    expect(personnes.cells[0][6]).toBe('texte perso mail')
  })
})
