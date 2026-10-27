import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConfirmationEmailData,
  ConfirmationEmailTemplateParams
} from '../src/ConfirmationEmailTemplateParams'
import { EmailTemplate } from '../src/sheets-tools/EmailTemplate'
import {
  Cell,
  FakeRichText,
  FakeSheet,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

const headers = ['Type', 'Condition', 'Texte']

function templateFrom (rows: Cell[][]) {
  const sheet = new FakeSheet('modèle courriel', [headers, ...rows])
  const { ui } = installSpreadsheetApp([sheet])
  return { template: new EmailTemplate(new ConfirmationEmailTemplateParams()), ui }
}

const benevole: ConfirmationEmailData = {
  personData: { nom: 'Dupont', prenom: 'Marie', email: 'marie@example.org' },
  listeEngagements: ['01.01.2021 | bar | 20:00-21:00'],
  listeContreparties: [],
  estArtiste: false,
  estBenevole: true
}

describe('EmailTemplate', () => {
  it('reads every template row, the last one included', () => {
    const { template } = templateFrom([
      ['sujet', '', 'Confirmation'],
      ['paragraphe', '', 'premier'],
      ['paragraphe', '', 'dernier']
    ])
    const { subject, html } = template.constructHtml(benevole)
    expect(subject).toBe('Confirmation')
    expect(html).toBe(
      "<p><span style=''>premier</span></p><p><span style=''>dernier</span></p>"
    )
  })

  it('renders each block type and closes a list that ends the template', () => {
    const { template } = templateFrom([
      ['sujet', '', 'Sujet'],
      ['titre', '', 'Titre'],
      ['sous-titre', '', 'Sous-titre'],
      ['aucun', '', '<hr>'],
      ['élément de liste', '', 'un'],
      ['élément de liste', '', 'deux']
    ])
    expect(template.constructHtml(benevole).html).toBe(
      '<h1>Titre</h1><h2>Sous-titre</h2><hr>' +
        "<ul><li><span style=''>un</span></li><li><span style=''>deux</span></li></ul>"
    )
  })

  it('closes the list before the next block', () => {
    const { template } = templateFrom([
      ['élément de liste', '', 'un'],
      ['paragraphe', '', 'suite']
    ])
    expect(template.constructHtml(benevole).html).toBe(
      "<ul><li><span style=''>un</span></li></ul><p><span style=''>suite</span></p>"
    )
  })

  it('drops the blocks whose condition does not hold', () => {
    const { template } = templateFrom([
      ['paragraphe', 'est bénévole', 'pour bénévoles'],
      ['paragraphe', 'est artiste', 'pour artistes'],
      ['élément de liste', 'a au moins un code', 'code']
    ])
    expect(template.constructHtml(benevole).html).toBe(
      "<p><span style=''>pour bénévoles</span></p>"
    )
  })

  it('converts rich text runs into styled spans and links', () => {
    const rich = FakeRichText.runs(
      new FakeRichText('gras ', { bold: true }),
      new FakeRichText('lien', { italic: true, color: '#ff0000' }, 'https://example.org'),
      new FakeRichText(' barré', { underline: true, strikethrough: true })
    )
    const { template } = templateFrom([['paragraphe', '', rich]])
    expect(template.constructHtml(benevole).html).toBe(
      '<p>' +
        "<span style='font-weight:bold'>gras </span>" +
        "<a href='https://example.org'><span style='color:#ff0000;font-style:italic'>lien</span></a>" +
        "<span style='text-decoration:underline line-through'> barré</span>" +
        '</p>'
    )
  })

  it('is empty, with an alert, when the template sheet is missing', () => {
    installSpreadsheetApp([])
    const template = new EmailTemplate(new ConfirmationEmailTemplateParams())
    expect(template.isEmpty()).toBe(true)
    expect(template.constructHtml(benevole)).toEqual({ subject: '', html: '' })
  })

  it('is empty when the sheet only has a header', () => {
    const { template } = templateFrom([])
    expect(template.isEmpty()).toBe(true)
  })

  it('delegates marker substitution to the params', () => {
    const { template } = templateFrom([['paragraphe', '', 'Bonjour %PRENOM%']])
    const { html } = template.constructHtml(benevole)
    expect(template.insertData(html, benevole)).toBe(
      "<p><span style=''>Bonjour Marie</span></p>"
    )
  })
})
