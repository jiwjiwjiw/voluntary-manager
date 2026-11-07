import { afterEach, describe, expect, it, vi } from 'vitest'
import { empreinte } from '../src/empreintes'
import { stepsForSheet, updateModels } from '../src/updateModels'
import { ValidationHandler } from '../src/sheets-tools/ValidationHandler'
import {
  FakeSheet,
  installLockService,
  installPropertiesService,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => {
  vi.unstubAllGlobals()
  // A singleton: each Apps Script run starts with a fresh one, each test should too.
  ;(ValidationHandler as any)._instance = undefined
})

function workbook () {
  const personnes = new FakeSheet('personnes', [
    ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
    ['Dupont', 'Marie', 'stale', 'marie@example.org', 'à envoyer']
  ])
  const plages = new FakeSheet('plages', [
    ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
    ['01.01.2021', 'bar', '20:00', '21:00', 1, 'stale']
  ])
  const engagements = new FakeSheet('engagements', [['personne', 'plage']])
  const planning = new FakeSheet('planning', [['plage', 'personnes'], ['stale', 'x']])
  const dates = new FakeSheet('dates', [['date'], ['01.01.2021']])
  const fonctions = new FakeSheet('fonctions', [['nom', 'type'], ['bar', 'bénévole']])
  const contreparties = new FakeSheet('contreparties', [['personne', 'contrepartie', 'remarque']])
  const modele = new FakeSheet('modèle courriel', [['Type', 'Condition', 'Texte']])
  const sheets = [personnes, plages, engagements, planning, dates, fonctions, contreparties, modele]
  installSpreadsheetApp(sheets)
  const lock = installLockService()
  installPropertiesService()
  return { personnes, plages, engagements, planning, modele, lock, sheets }
}

const editOn = (sheet: FakeSheet) => ({ range: sheet.getRange('A2') }) as any
const changeOf = (changeType: string) => ({ changeType }) as any

describe('stepsForSheet', () => {
  it('maps each source sheet to what it feeds', () => {
    expect(stepsForSheet('personnes')).toEqual(['personnes', 'statuts'])
    expect(stepsForSheet('plages')).toEqual(['plages', 'planning', 'statuts', 'cibles'])
    expect(stepsForSheet('fonctions')).toEqual(['fonctions', 'plages', 'planning', 'statuts', 'cibles'])
    expect(stepsForSheet('engagements')).toEqual(['planning', 'statuts'])
    expect(stepsForSheet('contreparties')).toEqual(['statuts'])
    expect(stepsForSheet('planning')).toEqual([])
    expect(stepsForSheet('modèle courriel')).toEqual([])
    expect(stepsForSheet('dates')).toEqual(['validation'])
  })
})

describe('updateModels', () => {
  it('carries a renamed function over to plages, their labels and engagements', () => {
    const { plages, engagements, sheets } = workbook()
    const fonctions = sheets.find(s => s.getName() === 'fonctions')!
    fonctions.cells.push(['technique', ''])
    engagements.cells.push(
      ['Marie Dupont', 'technique'],
      ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00']
    )
    plages.cells[1][5] = '01.01.2021 | bar | 20:00-21:00'

    fonctions.cells[1][0] = 'buvette'
    updateModels({ range: fonctions.getRange('A2'), oldValue: 'bar', value: 'buvette' } as any)
    fonctions.cells[2][0] = 'régie'
    updateModels({ range: fonctions.getRange('A3'), oldValue: 'technique', value: 'régie' } as any)

    expect(plages.cells[1][1]).toBe('buvette')
    expect(plages.cells[1][5]).toBe('01.01.2021 | buvette | 20:00-21:00')
    expect(engagements.column(2)).toEqual(['régie', '01.01.2021 | buvette | 20:00-21:00'])
  })

  it('renews an old status list before flagging « à renvoyer »', () => {
    const { personnes, engagements, sheets } = workbook()
    personnes.cells[1][4] = 'envoyé'
    engagements.cells.push(['Marie Dupont', '01.01.2021 | bar | 20:00-21:00'])
    // the dropdown left by a version that did not know « à renvoyer »
    personnes.validations.push({
      row: 2,
      column: 5,
      numRows: 10,
      numColumns: 1,
      rule: { allowInvalid: false, values: ['à envoyer', 'envoyé', 'réception confirmée'] }
    })
    installSpreadsheetApp(sheets)
    installPropertiesService({
      empreintes: JSON.stringify({
        'Marie Dupont': empreinte({ listeEngagements: [], listeContreparties: [] })
      })
    })

    expect(() => updateModels()).not.toThrow()
    expect(personnes.cells[1][4]).toBe('à renvoyer')
  })

  it('does not merge two functions renamed into one', () => {
    const { plages, sheets } = workbook()
    const fonctions = sheets.find(s => s.getName() === 'fonctions')!
    fonctions.cells.push(['caisse', 'bénévole'])

    fonctions.cells[1][0] = 'caisse'
    updateModels({ range: fonctions.getRange('A2'), oldValue: 'bar', value: 'caisse' } as any)

    expect(plages.cells[1][1]).toBe('bar')
  })

  it('recomputes everything without an event', () => {
    const { personnes, plages, planning, modele, sheets, lock } = workbook()

    updateModels()

    expect(personnes.cells[1][2]).toBe('Marie Dupont')
    expect(plages.cells[1][5]).toBe('01.01.2021 | bar | 20:00-21:00')
    expect(planning.column(1)).toEqual(['01.01.2021 | bar | 20:00-21:00'])
    // one rule per validated range (a rule set twice replaces the first)
    const ranges = sheets.flatMap(s => s.validations.map(v => `${s.getName()}!${v.row}:${v.column}`))
    expect(new Set(ranges).size).toBe(9)
    expect(modele.validations).toHaveLength(2)
    expect(lock.released).toBe(1)
  })

  it('only recomputes what the edited sheet feeds', () => {
    const { personnes, plages, planning, engagements, sheets } = workbook()

    updateModels(editOn(engagements))

    expect(personnes.cells[1][2]).toBe('stale')
    expect(plages.cells[1][5]).toBe('stale')
    expect(planning.column(1)).toEqual(['stale'])
    expect(sheets.flatMap(s => s.validations)).toHaveLength(0)
  })

  it('does nothing for an edit on a sheet that feeds nothing', () => {
    const { planning, lock } = workbook()

    updateModels(editOn(planning))

    expect(planning.column(1)).toEqual(['stale'])
    expect(lock.released).toBe(0)
  })

  it('skips onChange events of type EDIT and FORMAT, runs the others', () => {
    const { personnes, lock } = workbook()

    updateModels(changeOf('EDIT'))
    updateModels(changeOf('FORMAT'))
    expect(personnes.cells[1][2]).toBe('stale')
    expect(lock.released).toBe(0)

    updateModels(changeOf('REMOVE_ROW'))
    expect(personnes.cells[1][2]).toBe('Marie Dupont')
  })

  it('flags « à renvoyer » when a texte perso is written for a sent person', () => {
    const { personnes, engagements, sheets } = workbook()
    personnes.cells[1][4] = 'envoyé'
    personnes.cells[1][2] = 'Marie Dupont'
    engagements.cells.push(['Marie Dupont', 'p'])
    installSpreadsheetApp(sheets)
    installPropertiesService({
      empreintes: JSON.stringify({
        'Marie Dupont': empreinte({ listeEngagements: ['p'], listeContreparties: [] })
      })
    })

    updateModels(editOn(personnes))
    expect(personnes.cells[1][4]).toBe('envoyé')

    personnes.cells[1][5] = 'Merci pour le gâteau !'
    updateModels(editOn(personnes))
    expect(personnes.cells[1][4]).toBe('à renvoyer')
  })

  it('gives up when the lock is held', () => {
    const { personnes } = workbook()
    installLockService(true)

    updateModels()

    expect(personnes.cells[1][2]).toBe('stale')
  })

  it('registers the dropdowns of every template sheet', () => {
    const { sheets } = workbook()
    const second = new FakeSheet('modèle 2', [['type', 'condition', 'texte']])
    installSpreadsheetApp([...sheets, second])
    installLockService()
    installPropertiesService()

    updateModels()

    expect(second.validations).toHaveLength(2)
  })
})
