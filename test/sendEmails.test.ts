import { afterEach, describe, expect, it, vi } from 'vitest'
import { partitionRecipients, sendEmails } from '../src/sendEmails'
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
    ['Martin', 'Jean', 'Jean Martin', 'jean@example.org', 'envoyé'],
    ['Durand', 'Paul', 'Paul Durand', '', 'à envoyer'],
    ['Petit', 'Léa', 'Léa Petit', 'lea@example.org', 'à envoyer']
  ])
  const engagements = new FakeSheet('engagements', [
    ['personne', 'plage'],
    ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00'],
    ['Paul Durand', '01.01.2021 | bar | 20:00-21:00']
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
      nonEnvoyes: ['Petit Léa'],
      sansEmail: ['Durand Paul']
    })
    expect(ui.showModalDialog).toHaveBeenCalledTimes(1)
  })

  it('leaves the status of people it could not write to untouched', () => {
    const { personnes } = workbook([
      new FakeSheet('modèle courriel', [headers, ['sujet', '', 'S']])
    ])

    sendEmails('modèle courriel')

    expect(personnes.column(5)).toEqual([
      'envoyé',
      'envoyé',
      'à envoyer',
      'à envoyer'
    ])
  })

  it('refuses to send from an empty template', () => {
    const { sent, ui } = workbook([
      new FakeSheet('modèle courriel', [headers])
    ])

    sendEmails('modèle courriel')

    expect(sent).toHaveLength(0)
    expect(ui.alerts).toHaveLength(1)
    expect(ui.showModalDialog).not.toHaveBeenCalled()
  })

  it('refuses to send when the daily quota is too low', () => {
    const { sent, ui } = workbook([
      new FakeSheet('modèle courriel', [headers, ['sujet', '', 'S']])
    ])
    vi.stubGlobal('MailApp', {
      getRemainingDailyQuota: () => 0,
      sendEmail: () => sent.push('unexpected')
    })

    sendEmails('modèle courriel')

    expect(sent).toHaveLength(0)
    expect(ui.alerts).toEqual(["Envoi impossible, quota d'envoi journalier dépassé!"])
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

describe('partitionRecipients', () => {
  const person = (nom: string, email: string, engagements: string[]) => ({
    personData: { nom, prenom: 'p', email },
    listeEngagements: engagements,
    listeContreparties: [],
    estArtiste: false,
    estBenevole: false
  })

  it('separates people without engagement and without email', () => {
    const ok = person('Ok', 'ok@example.org', ['e'])
    const result = partitionRecipients([
      ok,
      person('SansEngagement', 'x@example.org', []),
      person('SansEmail', '', ['e']),
      person('SansRien', '', [])
    ])
    expect(result.aEnvoyer).toEqual([ok])
    expect(result.sansEngagement).toEqual(['SansEngagement p', 'SansRien p'])
    expect(result.sansEmail).toEqual(['SansEmail p'])
  })
})
