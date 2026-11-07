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
   * Substitutes the markers in the HTML body. Values are escaped, and the
   * replacement is a function so that `$` sequences in a value are inserted
   * literally (a string replacement would interpret `$&`, `$'`…).
   */
  insertData (html: string, data: ConfirmationEmailData): string {
    const list = (items: string[]) =>
      `<ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
    const values: Record<string, string> = {
      '%PRENOM%': escapeHtml(data.personData.prenom),
      '%NOM%': escapeHtml(data.personData.nom),
      '%EMAIL%': escapeHtml(data.personData.email),
      '%LISTE_ENGAGEMENTS%': list(data.listeEngagements),
      '%LISTE_CONTREPARTIES%': list(data.listeContreparties),
      '%PERSO%': textToHtml(data.textePerso ?? '')
    }
    for (const marker of Object.keys(values)) {
      html = html.replaceAll(marker, () => values[marker])
    }
    return html
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
