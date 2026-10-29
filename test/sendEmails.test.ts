import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  currentUserEmail,
  htmlToPlainText,
  partitionRecipients,
  previewEmailDialog,
  renderEmail,
  richestTestCase,
  selectEmailTemplate,
  sendEmails,
  testEmail,
  testEmailData
} from '../src/sendEmails'
import { ConfirmationEmailData } from '../src/ConfirmationEmailTemplateParams'
import {
  FakeSheet,
  installHtmlService,
  installLockService,
  installMailApp,
  installPropertiesService,
  installSession,
  installSpreadsheetApp
} from './fakeSpreadsheet'
import { empreinte } from '../src/empreintes'

afterEach(() => vi.unstubAllGlobals())

const headers = ['Type', 'Condition', 'Texte']
const simpleTemplate = () =>
  new FakeSheet('modèle courriel', [headers, ['sujet', '', 'Pour %PRENOM%']])

function workbook (
  extraSheets: FakeSheet[] = [],
  options: { rejects?: RegExp; locked?: boolean; quota?: number } = {}
) {
  const personnes = new FakeSheet('personnes', [
    ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
    ['Dupont', 'Marie', 'Marie Dupont', 'marie@example.org', 'à envoyer'],
    ['Martin', 'Jean', 'Jean Martin', 'jean@example.org', 'envoyé'],
    ['Durand', 'Paul', 'Paul Durand', '', 'à envoyer'],
    ['Petit', 'Léa', 'Léa Petit', 'lea@example.org', 'à envoyer'],
    ['Roux', 'Ana', 'Ana Roux', 'ana@example.org', 'à envoyer'],
    ['Roux', 'Ana', 'Ana Roux', 'ana2@example.org', 'envoyé'],
    ['Blanc', '', '', 'blanc@example.org', 'à envoyer'],
    ['Noir', 'Luc', 'Luc Noir', 'luc@example.org', 'À envoyer ']
  ])
  const engagements = new FakeSheet('engagements', [
    ['personne', 'plage'],
    ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00'],
    ['Paul Durand', '01.01.2021 | bar | 20:00-21:00'],
    ['Ana Roux', '01.01.2021 | bar | 20:00-21:00'],
    ['Luc Noir', '01.01.2021 | bar | 20:00-21:00'],
    ['', '01.01.2021 | bar | 20:00-21:00']
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
  const { ui, spreadsheet } = installSpreadsheetApp(sheets)
  const { sent } = installMailApp(options.quota ?? 100, options.rejects)
  const { templates } = installHtmlService()
  const lock = installLockService(options.locked)
  const { values: properties } = installPropertiesService()
  return { personnes, ui, sent, templates, lock, spreadsheet, properties }
}

const report = (templates: ReturnType<typeof workbook>['templates']) =>
  templates.find(t => t.file === 'dist/emailReportTemplate')?.template.report

describe('sendEmails', () => {
  it('sends to the people to send to and marks their row', () => {
    const { sent, personnes, templates } = workbook([simpleTemplate()])

    sendEmails('modèle courriel')

    expect(sent.map(m => m.to)).toEqual(['marie@example.org', 'luc@example.org'])
    expect(personnes.column(5)).toEqual([
      'envoyé',
      'envoyé',
      'à envoyer',
      'à envoyer',
      'à envoyer',
      'envoyé',
      'à envoyer',
      'envoyé'
    ])
    expect(report(templates)).toEqual({
      envoyes: 2,
      reportes: 0,
      erreurs: [],
      sansEmail: ['Paul Durand'],
      sansEngagement: ['Léa Petit'],
      homonymes: ['Ana Roux'],
      nomIncomplet: ['Blanc']
    })
  })

  it('remembers what each sent person was told', () => {
    const { properties } = workbook([simpleTemplate()])

    sendEmails('modèle courriel')

    expect(JSON.parse(properties.empreintes)).toEqual({
      'Marie Dupont': empreinte({
        listeEngagements: ['01.01.2021 | bar | 20:00-21:00'],
        listeContreparties: []
      }),
      'Luc Noir': empreinte({
        listeEngagements: ['01.01.2021 | bar | 20:00-21:00'],
        listeContreparties: []
      })
    })
  })

  it('also sends to people flagged « à renvoyer »', () => {
    const { sent, personnes } = workbook([simpleTemplate()])
    personnes.cells[2][4] = 'à renvoyer' // Jean Martin, who has no engagement
    personnes.cells[4][4] = 'à renvoyer' // Léa Petit, no engagement either

    sendEmails('modèle courriel')

    expect(sent.map(m => m.to)).toEqual(['marie@example.org', 'luc@example.org'])
    expect(personnes.cells[2][4]).toBe('à renvoyer')
  })

  it('substitutes the markers of the subject and adds a text body', () => {
    const { sent } = workbook([
      new FakeSheet('modèle courriel', [
        headers,
        ['sujet', '', 'Pour %PRENOM% %NOM%'],
        ['paragraphe', '', 'Bonjour %PRENOM%,'],
        ['élément de liste', '', 'a & b']
      ])
    ])

    sendEmails('modèle courriel')

    expect(sent[0].subject).toBe('Pour Marie Dupont')
    expect(sent[0].htmlBody).toBe(
      "<p><span style=''>Bonjour Marie,</span></p><ul><li><span style=''>a &amp; b</span></li></ul>"
    )
    expect(sent[0].body).toBe('Bonjour Marie,\n- a & b')
  })

  it('uses the template sheet it is given', () => {
    const { sent } = workbook([
      simpleTemplate(),
      new FakeSheet('modèle 2', [headers, ['sujet', '', 'Second modèle']])
    ])

    sendEmails('modèle 2')

    expect(sent[0].subject).toBe('Second modèle')
  })

  it('goes on after a rejected address and reports it', () => {
    const { sent, personnes, templates, ui } = workbook([simpleTemplate()], {
      rejects: /marie/
    })

    sendEmails('modèle courriel')

    expect(sent.map(m => m.to)).toEqual(['luc@example.org'])
    expect(personnes.cells[1][4]).toBe('à envoyer')
    expect(report(templates).envoyes).toBe(1)
    expect(report(templates).erreurs).toEqual([
      {
        personne: 'Marie Dupont',
        email: 'marie@example.org',
        message: 'Invalid email: marie@example.org'
      }
    ])
    expect(ui.showModalDialog).toHaveBeenCalledTimes(1)
  })

  it('refuses to run while another send holds the lock', () => {
    const { sent, ui } = workbook([simpleTemplate()], { locked: true })

    sendEmails('modèle courriel')

    expect(sent).toHaveLength(0)
    expect(ui.alerts).toEqual(['Un envoi est déjà en cours, veuillez patienter.'])
  })

  it('releases the lock and shows progress', () => {
    const { lock, spreadsheet } = workbook([simpleTemplate()])

    sendEmails('modèle courriel')

    expect(lock.locked).toBe(false)
    expect(lock.released).toBe(1)
    expect(spreadsheet.toasts).toHaveLength(1)
  })

  it('refuses to send from an empty template', () => {
    const { sent, ui } = workbook([new FakeSheet('modèle courriel', [headers])])

    sendEmails('modèle courriel')

    expect(sent).toHaveLength(0)
    expect(ui.alerts).toHaveLength(1)
    expect(ui.showModalDialog).not.toHaveBeenCalled()
  })

  it('sends what the daily quota allows and reports the rest', () => {
    const { sent, personnes, templates } = workbook([simpleTemplate()], { quota: 1 })

    sendEmails('modèle courriel')

    expect(sent.map(m => m.to)).toEqual(['marie@example.org'])
    expect(personnes.cells[8][4]).toBe('À envoyer ')
    expect(report(templates).envoyes).toBe(1)
    expect(report(templates).reportes).toBe(1)
  })

  it('refuses to send when the daily quota is exhausted', () => {
    const { sent, ui } = workbook([simpleTemplate()], { quota: 0 })

    sendEmails('modèle courriel')

    expect(sent).toHaveLength(0)
    expect(ui.alerts).toEqual(["Envoi impossible, quota d'envoi journalier épuisé!"])
  })

  it("ignores the dialog's placeholder entry", () => {
    const { sent, ui } = workbook([simpleTemplate()])

    sendEmails('')

    expect(sent).toHaveLength(0)
    expect(ui.showModalDialog).not.toHaveBeenCalled()
  })
})

describe('selectEmailTemplate', () => {
  it('shows the counts, the quota and the templates in the dialog', () => {
    const { templates, ui } = workbook([
      simpleTemplate(),
      new FakeSheet('modèle 2', [headers, ['sujet', '', 'S']])
    ])

    selectEmailTemplate()

    expect(templates[0].file).toBe('dist/SelectEmailTemplate')
    expect(templates[0].template.summary).toEqual({
      templates: ['modèle courriel', 'modèle 2'],
      aEnvoyer: 2,
      sansEmail: 1,
      sansEngagement: 1,
      homonymes: 1,
      nomIncomplet: 1,
      quota: 100
    })
    expect(ui.showModalDialog).toHaveBeenCalledTimes(1)
  })

  it('alerts when the workbook holds no template sheet', () => {
    const { ui, sent } = workbook()

    selectEmailTemplate()

    expect(ui.alerts).toEqual(['Aucun modèle de message défini!'])
    expect(ui.showModalDialog).not.toHaveBeenCalled()
    expect(sent).toHaveLength(0)
  })
})

describe('testEmail', () => {
  it('sends the richest test case only, to the current user, without touching the sheet', () => {
    const { sent, personnes } = workbook([simpleTemplate()])
    installSession('me@example.org')

    testEmail()

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('me@example.org')
    expect(sent[0].subject).toBe('Pour ArtisteEtBenevoleAvecContrepartie')
    expect(personnes.column(5)).toContain('à envoyer')
  })

  it('picks the case where every condition holds', () => {
    const d = richestTestCase('x@y.z')
    expect(d.estArtiste && d.estBenevole && d.listeContreparties.length > 0).toBe(true)
  })

  it('stops with an alert when the user address is unknown', () => {
    const { sent, ui } = workbook([simpleTemplate()])
    installSession('', '')

    testEmail()

    expect(sent).toHaveLength(0)
    expect(ui.alerts).toHaveLength(1)
  })

  it('falls back on the effective user', () => {
    installSession('', 'owner@example.org')
    expect(currentUserEmail()).toBe('owner@example.org')
  })

  it('covers every combination of the conditions', () => {
    const data = testEmailData('x@y.z')
    const keys = data.map(
      d => `${d.estArtiste}/${d.estBenevole}/${d.listeContreparties.length > 0}`
    )
    expect(new Set(keys).size).toBe(6)
    expect(data.every(d => d.listeEngagements.length > 0)).toBe(true)
  })
})

describe('partitionRecipients', () => {
  const person = (
    nom: string,
    email: string,
    engagements: string[],
    libelle = `p ${nom}`
  ): ConfirmationEmailData => ({
    personData: { nom, prenom: 'p', email },
    libelle,
    listeEngagements: engagements,
    listeContreparties: [],
    estArtiste: false,
    estBenevole: false
  })

  it('separates people without engagement, without email, without name', () => {
    const ok = person('Ok', 'ok@example.org', ['e'])
    const result = partitionRecipients([
      ok,
      person('SansEngagement', 'x@example.org', []),
      person('SansEmail', '', ['e']),
      person('SansRien', '', []),
      person('SansNom', 'n@example.org', ['e'], '')
    ])
    expect(result.aEnvoyer).toEqual([ok])
    expect(result.sansEngagement).toEqual(['p SansEngagement', 'p SansRien'])
    expect(result.sansEmail).toEqual(['p SansEmail'])
    expect(result.nomIncomplet).toEqual(['p SansNom'])
    expect(result.homonymes).toEqual([])
  })

  it('detects homonyms against every person of the sheet', () => {
    const a = person('A', 'a@example.org', ['e'], 'Ana Roux')
    const result = partitionRecipients([a], ['Ana Roux', 'Ana Roux', 'Bob'])
    expect(result.aEnvoyer).toEqual([])
    expect(result.homonymes).toEqual(['p A'])
  })
})

describe('htmlToPlainText', () => {
  it('turns block elements into lines and decodes entities', () => {
    expect(
      htmlToPlainText(
        '<h1>Titre</h1><p>Bonjour <b>A &amp; B</b><br>suite</p><ul><li>un</li><li>deux</li></ul>'
      )
    ).toBe('Titre\nBonjour A & B\nsuite\n- un\n- deux')
  })
})

describe('previewEmailDialog', () => {
  it('lists the templates, the test cases and every named person', () => {
    const { templates } = workbook([simpleTemplate()])

    previewEmailDialog()

    const t = templates[0]
    expect(t.file).toBe('dist/PreviewEmail')
    expect(t.template.templates).toEqual(['modèle courriel'])
    expect(t.template.cas).toHaveLength(6)
    expect(t.template.cas[0]).toEqual({ key: 'test:0', label: 'TEST : ArtisteSansContrepartie' })
    expect(t.template.personnes.map((p: any) => p.label)).toEqual([
      'Ana Roux',
      'Ana Roux',
      'Jean Martin',
      'Léa Petit',
      'Luc Noir',
      'Marie Dupont',
      'Paul Durand'
    ])
    expect(t.template.personnes[5]).toEqual({ key: '2', label: 'Marie Dupont' })
  })

  it('alerts without a template sheet', () => {
    const { ui } = workbook()
    previewEmailDialog()
    expect(ui.alerts).toEqual(['Aucun modèle de message défini!'])
  })
})

describe('renderEmail', () => {
  const template = () =>
    new FakeSheet('modèle courriel', [
      headers,
      ['sujet', '', 'Pour %PRENOM%'],
      ['paragraphe', '', 'Bonjour %PRENOM%'],
      ['élément de liste', 'est bénévole', 'bénévole'],
      ['élément de liste', 'a au moins un code', 'code']
    ])

  it('renders the mail of a person of the sheet, whatever their status', () => {
    workbook([template()])

    expect(renderEmail('modèle courriel', '3')).toEqual({
      subject: 'Pour Jean',
      html: "<p><span style=''>Bonjour Jean</span></p>"
    })
  })

  it('renders a test case', () => {
    workbook([template()])
    installSession('me@example.org')

    const { subject, html } = renderEmail('modèle courriel', 'test:5')

    expect(subject).toBe('Pour ArtisteEtBenevoleAvecContrepartie')
    expect(html).toContain('bénévole')
    expect(html).toContain('code')
  })

  it('throws a readable error for an unknown person or an empty template', () => {
    workbook([template(), new FakeSheet('vide', [headers])])
    expect(() => renderEmail('modèle courriel', '99')).toThrow('Personne introuvable.')
    expect(() => renderEmail('vide', '2')).toThrow('vide')
  })
})
