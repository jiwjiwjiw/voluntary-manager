import { afterEach, describe, expect, it, vi } from 'vitest'
import { empreinte } from '../src/empreintes'
import { stepsForSheet, updateModels } from '../src/updateModels'
import {
  FakeSheet,
  installLockService,
  installPropertiesService,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

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
    expect(stepsForSheet('plages')).toEqual(['plages', 'planning', 'statuts'])
    expect(stepsForSheet('engagements')).toEqual(['planning', 'statuts'])
    expect(stepsForSheet('contreparties')).toEqual(['statuts'])
    expect(stepsForSheet('planning')).toEqual([])
    expect(stepsForSheet('modèle courriel')).toEqual([])
    expect(stepsForSheet('dates')).toEqual(['validation'])
  })
})

describe('updateModels', () => {
  it('recomputes everything without an event', () => {
    const { personnes, plages, planning, modele, sheets, lock } = workbook()

    updateModels()

    expect(personnes.cells[1][2]).toBe('Marie Dupont')
    expect(plages.cells[1][5]).toBe('01.01.2021 | bar | 20:00-21:00')
    expect(planning.column(1)).toEqual(['01.01.2021 | bar | 20:00-21:00'])
    expect(sheets.flatMap(s => s.validations)).toHaveLength(9)
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
