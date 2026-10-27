import {
  ConfirmationEmailData,
  ConfirmationEmailTemplateParams
} from './ConfirmationEmailTemplateParams'
import { EmailTemplateList } from './EmailTemplateList'
import { EmailTemplate } from './sheets-tools/EmailTemplate'
import {
  getColumnAsRow,
  rowHasContent,
  rowHasValue
} from './sheets-tools/helpers'

export function selectEmailTemplate () {
  const templateList = new EmailTemplateList(SpreadsheetApp.getActive()).list
  if (templateList.length == 0) {
    SpreadsheetApp.getUi().alert('Aucun modèle de message défini!')
  } else if (templateList.length == 1) {
    sendEmails(templateList[0].getName())
  } else {
    const htmlTemplate = HtmlService.createTemplateFromFile(
      'dist/SelectEmailTemplate'
    )
    htmlTemplate.templateNames = templateList.map(x => x.getName())
    const html = htmlTemplate
      .evaluate()
      .setWidth(250)
      .setHeight(40)
    SpreadsheetApp.getUi().showModalDialog(
      html,
      'Choisir un modèle de courriel'
    )
  }
}

export function testEmail () {
  const template = new EmailTemplate(new ConfirmationEmailTemplateParams())
  const ownEmail = Session.getActiveUser().getEmail()
  const data: ConfirmationEmailData[] = [
    {
      personData: {
        nom: 'TEST',
        prenom: 'ArtisteSansContrepartie',
        email: ownEmail
      },
      listeEngagements: [
        '01.01.2021 | test | 20:00-21:00',
        '02.01.2021 | test | 20:00-21:00',
        '03.01.2021 | test | 20:00-21:00'
      ],
      listeContreparties: [],
      estArtiste: true,
      estBenevole: false
    },
    {
      personData: {
        nom: 'TEST',
        prenom: 'BenevoleSansContrepartie',
        email: ownEmail
      },
      listeEngagements: [
        '01.01.2021 | test | 20:00-21:00',
        '02.01.2021 | test | 20:00-21:00',
        '03.01.2021 | test | 20:00-21:00'
      ],
      listeContreparties: [],
      estArtiste: false,
      estBenevole: true
    },
    {
      personData: {
        nom: 'TEST',
        prenom: 'ArtisteEtBenevoleSansContrepartie',
        email: ownEmail
      },
      listeEngagements: [
        '01.01.2021 | test | 20:00-21:00',
        '02.01.2021 | test | 20:00-21:00',
        '03.01.2021 | test | 20:00-21:00'
      ],
      listeContreparties: [],
      estArtiste: true,
      estBenevole: true
    },
    {
      personData: {
        nom: 'TEST',
        prenom: 'ArtisteAvecContrepartie',
        email: ownEmail
      },
      listeEngagements: [
        '01.01.2021 | test | 20:00-21:00',
        '02.01.2021 | test | 20:00-21:00',
        '03.01.2021 | test | 20:00-21:00'
      ],
      listeContreparties: [
        'contrepartie 1 (valable uniquement le premier weekend)',
        'contrepartie 2 (valable uniquement le premier weekend)'
      ],
      estArtiste: true,
      estBenevole: false
    },
    {
      personData: {
        nom: 'TEST',
        prenom: 'BenevoleAvecContrepartie',
        email: ownEmail
      },
      listeEngagements: [
        '01.01.2021 | test | 20:00-21:00',
        '02.01.2021 | test | 20:00-21:00',
        '03.01.2021 | test | 20:00-21:00'
      ],
      listeContreparties: [
        "contrepartie 1 (valable pour n'importe quelle représentation)",
        "contrepartie 2 (valable pour n'importe quelle représentation)"
      ],
      estArtiste: false,
      estBenevole: true
    },
    {
      personData: {
        nom: 'TEST',
        prenom: 'ArtisteEtBenevoleAvecContrepartie',
        email: ownEmail
      },
      listeEngagements: [
        '01.01.2021 | test | 20:00-21:00',
        '02.01.2021 | test | 20:00-21:00',
        '03.01.2021 | test | 20:00-21:00'
      ],
      listeContreparties: [
        "contrepartie 1 (valable pour n'importe quelle représentation)",
        'contrepartie 2 (valable uniquement le premier weekend)'
      ],
      estArtiste: true,
      estBenevole: true
    }
  ]
  sendEmails2(template, data)
}

/**
 * Sends the confirmation emails using the template held in `sheetName`.
 * Called directly when the spreadsheet has a single template sheet, and
 * from the SelectEmailTemplate dialog (through google.script.run) otherwise.
 */
export function sendEmails (sheetName: string) {
  if (!sheetName) return // the dialog's placeholder entry
  const template = new EmailTemplate(
    new ConfirmationEmailTemplateParams(sheetName)
  )
  const data = collectData()
  sendEmails2(template, data)
}

/**
 * Splits the recipients into those who get a mail and those who are only
 * listed in the report: people without any engagement have nothing to
 * confirm, people without an email address cannot be reached.
 */
export function partitionRecipients (data: ReadonlyArray<ConfirmationEmailData>) {
  const aEnvoyer: ConfirmationEmailData[] = []
  const sansEngagement: string[] = []
  const sansEmail: string[] = []
  for (const d of data) {
    const nomComplet = `${d.personData.nom} ${d.personData.prenom}`
    if (d.listeEngagements.length === 0) {
      sansEngagement.push(nomComplet)
    } else if (!d.personData.email) {
      sansEmail.push(nomComplet)
    } else {
      aEnvoyer.push(d)
    }
  }
  return { aEnvoyer, sansEngagement, sansEmail }
}

function sendEmails2 (template: EmailTemplate, data: ConfirmationEmailData[]) {
  // check if there are mails to send
  if (data.length === 0) {
    SpreadsheetApp.getUi().alert('Aucun mail à envoyer!')
    return
  }

  // an unreadable template would send empty mails
  if (template.isEmpty()) {
    SpreadsheetApp.getUi().alert(
      'Envoi impossible, le modèle de courriel est vide ou introuvable!'
    )
    return
  }

  const { aEnvoyer, sansEngagement, sansEmail } = partitionRecipients(data)

  // check if mail quota is sufficient
  if (MailApp.getRemainingDailyQuota() < aEnvoyer.length) {
    SpreadsheetApp.getUi().alert(
      "Envoi impossible, quota d'envoi journalier dépassé!"
    )
    return
  }

  for (const d of aEnvoyer) {
    const { subject, html } = template.constructHtml(d)
    MailApp.sendEmail({
      to: d.personData.email,
      subject: subject,
      htmlBody: template.insertData(html, d)
    })
    UpdateSendStatus(d.personData.nom, d.personData.prenom, 'envoyé')
  }

  // confirm mails are sent
  const htmlOutput = HtmlService.createTemplateFromFile(
    'dist/emailReportTemplate'
  )
  htmlOutput.report = {
    envoyes: aEnvoyer.length,
    nonEnvoyes: sansEngagement,
    sansEmail: sansEmail
  }
  const emailReport = htmlOutput.evaluate()
  SpreadsheetApp.getUi().showModalDialog(emailReport, "Rapport d'envoi")
}

/**
 * Assembles the email data of every recipient from the raw sheet rows.
 *
 * A person is an artist (resp. a volunteer) when at least one of their
 * plages has a function of type `artiste` (resp. `bénévole`). The function
 * of a plage is looked up in `plages` by label, so a function name that is
 * part of another one (bar / barman) or that appears in a date or a name
 * cannot cause a false match.
 *
 * @param destinataires rows of `personnes!A:E` to send to: [nom, prénom, « prénom nom », email, statut]
 * @param engagements rows of `engagements!A:B`: [personne, libellé de plage]
 * @param contreparties rows of `contreparties!A:C`: [personne, contrepartie, remarque]
 * @param fonctions rows of `fonctions!A:B`: [nom, type] with type `artiste` or `bénévole`
 * @param plages rows of `plages!A:F`: [date, fonction, début, fin, nombre, libellé]
 */
export function buildEmailData (
  destinataires: ReadonlyArray<any[]>,
  engagements: ReadonlyArray<any[]>,
  contreparties: ReadonlyArray<any[]>,
  fonctions: ReadonlyArray<any[]>,
  plages: ReadonlyArray<any[]>
): ConfirmationEmailData[] {
  const fonctionsArtiste = fonctions
    .filter(rowHasValue(1, 'artiste'))
    .map(getColumnAsRow(0))
  const fonctionsBenevole = fonctions
    .filter(rowHasValue(1, 'bénévole'))
    .map(getColumnAsRow(0))
  const fonctionDePlage = new Map<string, string>(
    plages.map(row => [row[5], row[1]])
  )
  const aUneFonctionParmi = (listeEngagements: string[], noms: string[]) =>
    listeEngagements.some(label => {
      const fonction = fonctionDePlage.get(label)
      return fonction !== undefined && noms.includes(fonction)
    })

  const data: ConfirmationEmailData[] = []
  for (const d of destinataires) {
    const listeEngagements = engagements
      .filter(rowHasValue(0, d[2]))
      .map(getColumnAsRow(1))
    const listeContreparties = contreparties
      .filter(rowHasValue(0, d[2]))
      .map(row => (row[2] !== '' ? `${row[1]} (${row[2]})` : row[1]))
    data.push({
      personData: {
        nom: d[0],
        prenom: d[1],
        email: d[3]
      },
      listeEngagements: listeEngagements,
      listeContreparties: listeContreparties,
      estArtiste: aUneFonctionParmi(listeEngagements, fonctionsArtiste),
      estBenevole: aUneFonctionParmi(listeEngagements, fonctionsBenevole)
    })
  }
  return data
}

function collectData (): ConfirmationEmailData[] {
  // get data from spreadsheet
  const classeur = SpreadsheetApp.getActive()
  const personnesSheet = classeur.getSheetByName('personnes')
  const personnesRange = personnesSheet?.getRange('A2:F')
  const personnesData = personnesRange?.getValues()
  const destinataires = personnesData?.filter(rowHasValue(4, 'à envoyer'))
  const engagementsSheet = classeur.getSheetByName('engagements')
  const engagementsRange = engagementsSheet?.getRange('A2:B')
  const engagementsData = engagementsRange?.getValues()
  const engagements = engagementsData?.filter(rowHasContent)
  const contrepartiesSheet = classeur.getSheetByName('contreparties')
  const contrepartiesRange = contrepartiesSheet?.getRange('A2:C')
  const contrepartiesData = contrepartiesRange?.getValues()
  const contreparties = contrepartiesData?.filter(rowHasContent)
  const fonctionsSheet = classeur.getSheetByName('fonctions')
  const fonctionsRange = fonctionsSheet?.getRange('A2:B')
  const fonctionsData = fonctionsRange?.getValues()
  const fonctions = fonctionsData?.filter(rowHasContent) ?? []
  const plagesSheet = classeur.getSheetByName('plages')
  const plagesRange = plagesSheet?.getRange('A2:F')
  const plages = plagesRange?.getDisplayValues().filter(rowHasContent) ?? []

  if (destinataires && engagements && contreparties) {
    return buildEmailData(
      destinataires,
      engagements,
      contreparties,
      fonctions,
      plages
    )
  }
  return []
}

function UpdateSendStatus (nom: string, prenom: string, status: string) {
  // get data from spreadsheet
  const personnesSheet = SpreadsheetApp.getActive().getSheetByName('personnes')
  const personnesRange = personnesSheet?.getRange('A2:F')
  const index = personnesRange
    ?.getValues()
    .findIndex(x => x[0] === nom && x[1] === prenom)
  if (index !== undefined && index !== -1) {
    personnesSheet
      ?.getRange(index + 2, 5, 1, 1) // increment index by 2, to take into account the different indexing (0-based for findIndex, 1-based for getRange) and the headings not included in personneRange
      .setValue(status)
  }
}
