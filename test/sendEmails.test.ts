import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendEmails } from '../src/sendEmails'
import {
  FakeSheet,
  installHtmlService,
  installMailApp,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

const headers = ['Type', 'Condition', 'Texte']

function workbook (extraSheets: FakeSheet[] = []) {
  const personnes = new FakeSheet('personnes', [
    ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
    ['Dupont', 'Marie', 'Marie Dupont', 'marie@example.org', 'à envoyer'],
    ['Martin', 'Jean', 'Jean Martin', 'jean@example.org', 'envoyé']
  ])
  const engagements = new FakeSheet('engagements', [
    ['personne', 'plage'],
    ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00']
  ])
  const contreparties = new FakeSheet('contreparties', [
    ['personne', 'contrepartie', 'remarque']
  ])
  const fonctions = new FakeSheet('fonctions', [
    ['nom', 'type'],
    ['bar', 'bénévole']
  ])
  const plages = new FakeSheet('plages', [
    ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
    ['01.01.2021', 'bar', '20:00', '21:00', 2, '01.01.2021 | bar | 20:00-21:00']
  ])
  const sheets = [
    personnes,
    engagements,
    contreparties,
    fonctions,
    plages,
    ...extraSheets
  ]
  const { ui } = installSpreadsheetApp(sheets)
  const { sent } = installMailApp()
  const { templates } = installHtmlService()
  return { personnes, ui, sent, templates }
}

describe('sendEmails', () => {
  it('uses the template sheet it is given', () => {
    const { sent, personnes } = workbook([
      new FakeSheet('modèle courriel', [headers, ['sujet', '', 'Défaut']]),
      new FakeSheet('modèle 2', [headers, ['sujet', '', 'Second modèle']])
    ])

    sendEmails('modèle 2')

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('marie@example.org')
    expect(sent[0].subject).toBe('Second modèle')
    expect(personnes.cells[1][4]).toBe('envoyé')
  })

  it('shows the report after sending', () => {
    const { ui, templates } = workbook([
      new FakeSheet('modèle courriel', [headers, ['sujet', '', 'S']])
    ])

    sendEmails('modèle courriel')

    expect(templates[0].file).toBe('dist/emailReportTemplate')
    expect(templates[0].template.report).toEqual({
      envoyes: 1,
      nonEnvoyes: []
    })
    expect(ui.showModalDialog).toHaveBeenCalledTimes(1)
  })

  it("ignores the dialog's placeholder entry", () => {
    const { sent, ui } = workbook([
      new FakeSheet('modèle courriel', [headers, ['sujet', '', 'S']])
    ])

    sendEmails('')

    expect(sent).toHaveLength(0)
    expect(ui.showModalDialog).not.toHaveBeenCalled()
  })
})
