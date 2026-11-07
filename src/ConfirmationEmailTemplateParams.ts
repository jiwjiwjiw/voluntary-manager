import { EmailTemplateParams } from './sheets-tools/EmailTemplate'
import { escapeHtml, textToHtml } from './sheets-tools/helpers'

/** Everything the confirmation email needs to know about one recipient. */
export interface ConfirmationEmailData {
  personData: {
    nom: string
    prenom: string
    email: string
  }
  /** The « prénom nom » label (personnes!C) that engagements refer to. */
  libelle: string
  /** Row of the person in `personnes`, when the data comes from the sheet. */
  row?: number
  /** Labels of the plages the person is engaged on. */
  listeEngagements: string[]
  /** Contreparties granted to the person, remark included in parentheses. */
  listeContreparties: string[]
  estArtiste: boolean
  estBenevole: boolean
  /** Text written for this person only (column « texte perso mail » of personnes), '' or absent when none. */
  textePerso?: string
}

export class ConfirmationEmailTemplateParams implements EmailTemplateParams {
  static readonly DEFAULT_SHEET_NAME = 'modèle courriel'

  /** @param sheetName the template sheet to read; defaults to `modèle courriel`. */
  constructor (
    readonly sheetName: string = ConfirmationEmailTemplateParams.DEFAULT_SHEET_NAME
  ) {}

  conditions = [
    'a au moins un code',
    'est artiste',
    'est bénévole',
    'est artiste et a au moins un code',
    'est bénévole et a au moins un code',
    'a un texte perso'
  ]

  /**
   * Substitutes the markers in the HTML body, in one pass, so that a value
   * holding a marker (a texte perso quoting « %NOM% ») is left as is. Values
   * are escaped, and the replacement is a function so that `$` sequences in
   * a value are inserted literally (a string replacement would interpret
   * `$&`, `$'`…).
   *
   * A list takes the style of the text around it (see listStyle()): a <ul>
   * cannot stay inside the styled <span> of that text, mail clients move it
   * out, and it would otherwise show in their default font.
   */
  insertData (html: string, data: ConfirmationEmailData): string {
    const list = (items: string[], css: string) =>
      `<ul${css ? ` style="${escapeHtml(css)}"` : ''}>` +
      items.map(x => `<li>${escapeHtml(x)}</li>`).join('') +
      '</ul>'
    const values: Record<string, (css: string) => string> = {
      '%PRENOM%': () => escapeHtml(data.personData.prenom),
      '%NOM%': () => escapeHtml(data.personData.nom),
      '%EMAIL%': () => escapeHtml(data.personData.email),
      '%LISTE_ENGAGEMENTS%': css => list(data.listeEngagements, css),
      '%LISTE_CONTREPARTIES%': css => list(data.listeContreparties, css),
      '%PERSO%': () => textToHtml(data.textePerso ?? '')
    }
    const pattern = new RegExp(Object.keys(values).join('|'), 'g')
    return html.replace(pattern, (marker: string, offset: number) =>
      values[marker](listStyle(html, offset))
    )
  }

  /** Substitutes the person markers in the plain-text subject. */
  insertSubjectData (subject: string, data: ConfirmationEmailData): string {
    const values: Record<string, string> = {
      '%PRENOM%': data.personData.prenom,
      '%NOM%': data.personData.nom,
      '%EMAIL%': data.personData.email
    }
    for (const marker of Object.keys(values)) {
      subject = subject.replaceAll(marker, () => values[marker])
    }
    return subject
  }

  evaluateCondition (condition: string, data: ConfirmationEmailData): boolean {
    let conditionOk = true
    switch (condition) {
      case 'a au moins un code':
        conditionOk = data.listeContreparties.length > 0
        break
      case 'est artiste':
        conditionOk = data.estArtiste
        break
      case 'est bénévole':
        conditionOk = data.estBenevole
        break
      case 'est artiste et a au moins un code':
        conditionOk = data.estArtiste && data.listeContreparties.length > 0
        break
      case 'est bénévole et a au moins un code':
        conditionOk = data.estBenevole && data.listeContreparties.length > 0
        break
      case 'a un texte perso':
        conditionOk = (data.textePerso ?? '') !== ''
        break
      default:
        break
    }
    return conditionOk
  }
}

const SPAN_OPEN = "<span style='"

/**
 * The inline style of the `<span style='…'>` that contains position
 * `offset` of the HTML built by EmailTemplate (one span per rich text run,
 * never nested); '' outside any span.
 */
export function enclosingStyle (html: string, offset: number): string {
  const open = html.lastIndexOf(SPAN_OPEN, offset)
  if (open === -1 || html.lastIndexOf('</span>', offset) > open) return ''
  const start = open + SPAN_OPEN.length
  const end = html.indexOf("'>", start)
  return end === -1 || end > offset ? '' : html.slice(start, end)
}

/**
 * The style a list inserted at `offset` should take: that of the text its
 * marker is written in, or, when the marker has no styled text around it (a
 * row of type `aucun`, a title, a cell without explicit format), that of the
 * nearest styled text before it, else after it; '' when the mail has none.
 */
export function listStyle (html: string, offset: number): string {
  const own = enclosingStyle(html, offset)
  if (own !== '') return own
  let before = ''
  let after = ''
  for (const m of html.matchAll(/<span style='([^']*)'>/g)) {
    if (m[1] === '') continue
    if (m.index < offset) before = m[1]
    else if (after === '') after = m[1]
  }
  return before || after
}
