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
  libelle: 'Marie Dupont',
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
        '<a href="https://example.org"><span style=\'color:#ff0000;font-style:italic\'>lien</span></a>' +
        "<span style='text-decoration:underline line-through'> barré</span>" +
        '</p>'
    )
  })

  it('escapes HTML characters and keeps line breaks of cell text', () => {
    const { template } = templateFrom([
      ['titre', '', 'Tom & Jerry <3'],
      ['paragraphe', '', 'ligne 1\nligne 2'],
      ['élément de liste', '', 'a < b']
    ])
    expect(template.constructHtml(benevole).html).toBe(
      '<h1>Tom &amp; Jerry &lt;3</h1>' +
        "<p><span style=''>ligne 1<br>ligne 2</span></p>" +
        "<ul><li><span style=''>a &lt; b</span></li></ul>"
    )
  })

  it('renders cells that are not text (dates, numbers) as their text', () => {
    const { template } = templateFrom([
      ['sujet', '', 2026],
      ['paragraphe', '', 2026],
      ['élément de liste', '', true],
      ['aucun', '', 42]
    ])
    expect(template.constructHtml(benevole)).toEqual({
      subject: '2026',
      html: '<p>2026</p><ul><li>true</li></ul>42'
    })
  })

  it('applies the condition of a sujet row', () => {
    const { template } = templateFrom([
      ['sujet', 'est artiste', 'Pour artistes'],
      ['sujet', 'est bénévole', 'Pour bénévoles']
    ])
    expect(template.constructHtml(benevole).subject).toBe('Pour bénévoles')
  })

  it('tolerates spaces around the type and condition', () => {
    const { template } = templateFrom([['  paragraphe ', ' est bénévole ', 'ok']])
    expect(template.constructHtml(benevole).html).toBe(
      "<p><span style=''>ok</span></p>"
    )
  })

  it('substitutes the markers of the subject through the params', () => {
    const { template } = templateFrom([['sujet', '', 'Pour %PRENOM% %NOM%']])
    const { subject } = template.constructHtml(benevole)
    expect(template.insertSubjectData(subject, benevole)).toBe('Pour Marie Dupont')
  })

  it('is empty, without any UI call, when the template sheet is missing', () => {
    const { ui } = installSpreadsheetApp([])
    const template = new EmailTemplate(new ConfirmationEmailTemplateParams())
    expect(template.isEmpty()).toBe(true)
    expect(template.constructHtml(benevole)).toEqual({ subject: '', html: '' })
    expect(ui.alerts).toEqual([])
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
