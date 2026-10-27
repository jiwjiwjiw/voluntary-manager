import { EmailTemplateParams } from './sheets-tools/EmailTemplate'

/** Everything the confirmation email needs to know about one recipient. */
export interface ConfirmationEmailData {
  personData: {
    nom: string
    prenom: string
    email: string
  }
  /** Labels of the plages the person is engaged on. */
  listeEngagements: string[]
  /** Contreparties granted to the person, remark included in parentheses. */
  listeContreparties: string[]
  estArtiste: boolean
  estBenevole: boolean
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
    'est bénévole et a au moins un code'
  ]

  insertData (html: string, data: ConfirmationEmailData): string {
    html = html.replaceAll('%PRENOM%', data.personData.prenom)
    html = html.replaceAll('%NOM%', data.personData.nom)
    html = html.replaceAll('%EMAIL%', data.personData.email)
    html = html.replaceAll(
      '%LISTE_ENGAGEMENTS%',
      `<ul>${data.listeEngagements.map(x => `<li>${x}</li>`).join('')}</ul>`
    )
    html = html.replaceAll(
      '%LISTE_CONTREPARTIES%',
      `<ul>${data.listeContreparties.map(x => `<li>${x}</li>`).join('')}</ul>`
    )
    return html
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
      default:
        break
    }
    return conditionOk
  }
}
