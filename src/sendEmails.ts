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

import { empreinte, EmpreintesStore } from './empreintes'
import { estAEnvoyer, STATUT_ENVOYE } from './statuts'

/** Column of the send status in `personnes` (E). */
export const STATUS_COLUMN = 5

/** What the confirmation dialog shows before anything is sent. */
export interface SendSummary {
  templates: string[]
  aEnvoyer: number
  sansEmail: number
  sansEngagement: number
  homonymes: number
  nomIncomplet: number
  quota: number
}

export function sendSummary (): SendSummary {
  const templates = new EmailTemplateList(SpreadsheetApp.getActive()).list.map(
    sheet => sheet.getName()
  )
  const { data, libelles } = collectData()
  const p = partitionRecipients(data, libelles)
  return {
    templates,
    aEnvoyer: p.aEnvoyer.length,
    sansEmail: p.sansEmail.length,
    sansEngagement: p.sansEngagement.length,
    homonymes: p.homonymes.length,
    nomIncomplet: p.nomIncomplet.length,
    quota: MailApp.getRemainingDailyQuota()
  }
}

/** Menu entry: shows the confirmation dialog, which then calls sendEmails(). */
export function selectEmailTemplate () {
  const summary = sendSummary()
  if (summary.templates.length === 0) {
    SpreadsheetApp.getUi().alert('Aucun modèle de message défini!')
    return
  }
  const htmlTemplate = HtmlService.createTemplateFromFile(
    'dist/SelectEmailTemplate'
  )
  htmlTemplate.summary = summary
  const html = htmlTemplate
    .evaluate()
    .setWidth(440)
    .setHeight(340)
  SpreadsheetApp.getUi().showModalDialog(html, 'Envoyer les emails')
}

/** Every combination of the template conditions, for test mails and previews. */
export function testEmailData (email: string): ConfirmationEmailData[] {
  const engagements = [
    '01.01.2021 | test | 20:00-21:00',
    '02.01.2021 | test | 20:00-21:00',
    '03.01.2021 | test | 20:00-21:00'
  ]
  const cas = (
    prenom: string,
    estArtiste: boolean,
    estBenevole: boolean,
    listeContreparties: string[]
  ): ConfirmationEmailData => ({
    personData: { nom: 'TEST', prenom, email },
    libelle: `${prenom} TEST`,
    listeEngagements: engagements,
    listeContreparties,
    estArtiste,
    estBenevole
  })
  return [
    cas('ArtisteSansContrepartie', true, false, []),
    cas('BenevoleSansContrepartie', false, true, []),
    cas('ArtisteEtBenevoleSansContrepartie', true, true, []),
    cas('ArtisteAvecContrepartie', true, false, [
      'contrepartie 1 (valable uniquement le premier weekend)',
      'contrepartie 2 (valable uniquement le premier weekend)'
    ]),
    cas('BenevoleAvecContrepartie', false, true, [
      "contrepartie 1 (valable pour n'importe quelle représentation)",
      "contrepartie 2 (valable pour n'importe quelle représentation)"
    ]),
    cas('ArtisteEtBenevoleAvecContrepartie', true, true, [
      "contrepartie 1 (valable pour n'importe quelle représentation)",
      'contrepartie 2 (valable uniquement le premier weekend)'
    ])
  ]
}

/** The address of the current user, or '' when Apps Script does not expose it. */
export function currentUserEmail (): string {
  return (
    Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail()
  )
}

/**
 * The test case that exercises every conditional block at once: an artist
 * who is also a volunteer and has contreparties.
 */
export function richestTestCase (email: string): ConfirmationEmailData {
  const cases = testEmailData(email)
  return (
    cases.find(
      d => d.estArtiste && d.estBenevole && d.listeContreparties.length > 0
    ) ?? cases[cases.length - 1]
  )
}

/**
 * Sends one real mail, the richest test case, to the current user, so that
 * the sending itself and the rendering in a real mail client can be checked.
 * The other cases can be looked at with « Aperçu d'un courriel ».
 */
export function testEmail () {
  const ownEmail = currentUserEmail()
  if (!ownEmail) {
    SpreadsheetApp.getUi().alert(
      "Impossible de déterminer votre adresse email, l'envoi de test est annulé."
    )
    return
  }
  const template = new EmailTemplate(new ConfirmationEmailTemplateParams())
  sendEmails2(template, [richestTestCase(ownEmail)])
}

/** Key of a test case in the preview dialog. */
const TEST_KEY_PREFIX = 'test:'

/** Menu entry: dialog to render the mail of a person or of a test case. */
export function previewEmailDialog () {
  const templates = new EmailTemplateList(SpreadsheetApp.getActive()).list.map(
    sheet => sheet.getName()
  )
  if (templates.length === 0) {
    SpreadsheetApp.getUi().alert('Aucun modèle de message défini!')
    return
  }
  const personnes = collectData(false)
    .data.filter(d => d.libelle !== '' && d.row !== undefined)
    .map(d => ({ key: String(d.row), label: displayName(d) }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const cas = testEmailData('').map((d, index) => ({
    key: `${TEST_KEY_PREFIX}${index}`,
    label: `TEST : ${d.personData.prenom}`
  }))
  const htmlTemplate = HtmlService.createTemplateFromFile('dist/PreviewEmail')
  htmlTemplate.templates = templates
  htmlTemplate.personnes = personnes
  htmlTemplate.cas = cas
  const html = htmlTemplate.evaluate().setWidth(760).setHeight(600)
  SpreadsheetApp.getUi().showModalDialog(html, "Aperçu d'un courriel")
}

/**
 * Renders the mail of one recipient without sending it. Called by the
 * preview dialog through google.script.run. `key` is a row of `personnes`
 * or `test:<index>` for one of the test cases.
 */
export function renderEmail (
  sheetName: string,
  key: string
): { subject: string; html: string } {
  const template = new EmailTemplate(
    new ConfirmationEmailTemplateParams(sheetName)
  )
  if (template.isEmpty()) {
    throw new Error(`Le modèle « ${sheetName} » est vide ou introuvable.`)
  }
  let d: ConfirmationEmailData | undefined
  if (key.startsWith(TEST_KEY_PREFIX)) {
    const email = currentUserEmail() || 'test@example.org'
    d = testEmailData(email)[Number(key.slice(TEST_KEY_PREFIX.length))]
  } else {
    d = collectData(false).data.find(x => x.row === Number(key))
  }
  if (!d) throw new Error('Personne introuvable.')
  const { subject, html } = template.constructHtml(d)
  return {
    subject: template.insertSubjectData(subject, d),
    html: template.insertData(html, d)
  }
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
  const { data, libelles } = collectData()
  sendEmails2(template, data, libelles)
}

/** A mail that could not be sent, as shown in the report. */
export interface SendError {
  personne: string
  email: string
  message: string
}

export interface SendReport {
  envoyes: number
  /** Mails left for another day because the daily quota ran out. */
  reportes: number
  sansEngagement: string[]
  sansEmail: string[]
  nomIncomplet: string[]
  homonymes: string[]
  erreurs: SendError[]
}

const displayName = (d: ConfirmationEmailData) =>
  [d.personData.prenom, d.personData.nom].filter(Boolean).join(' ')

/**
 * Splits the recipients into those who get a mail and those who are only
 * listed in the report:
 * - no engagement: nothing to confirm;
 * - no email address: cannot be reached;
 * - empty label (nom or prénom missing): their engagements cannot be found;
 * - homonyms (label shared with another person): their engagements and
 *   contreparties cannot be told apart, and the status of the other person
 *   would be overwritten.
 *
 * @param tousLesLibelles labels of every person of the sheet, not only the
 *   recipients, so that a homonym with another status is detected too
 */
export function partitionRecipients (
  data: ReadonlyArray<ConfirmationEmailData>,
  tousLesLibelles: ReadonlyArray<string> = data.map(d => d.libelle)
) {
  const occurrences = new Map<string, number>()
  for (const libelle of tousLesLibelles) {
    occurrences.set(libelle, (occurrences.get(libelle) ?? 0) + 1)
  }
  const aEnvoyer: ConfirmationEmailData[] = []
  const sansEngagement: string[] = []
  const sansEmail: string[] = []
  const nomIncomplet: string[] = []
  const homonymes: string[] = []
  for (const d of data) {
    if (d.libelle === '') {
      nomIncomplet.push(displayName(d) || `ligne ${d.row ?? '?'}`)
    } else if ((occurrences.get(d.libelle) ?? 0) > 1) {
      homonymes.push(displayName(d))
    } else if (d.listeEngagements.length === 0) {
      sansEngagement.push(displayName(d))
    } else if (!d.personData.email) {
      sansEmail.push(displayName(d))
    } else {
      aEnvoyer.push(d)
    }
  }
  return { aEnvoyer, sansEngagement, sansEmail, nomIncomplet, homonymes }
}

/** A readable text version of the HTML body, for clients that show no HTML. */
export function htmlToPlainText (html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|ul|ol|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sendEmails2 (
  template: EmailTemplate,
  data: ConfirmationEmailData[],
  tousLesLibelles?: string[]
) {
  const ui = SpreadsheetApp.getUi()
  // check if there are mails to send
  if (data.length === 0) {
    ui.alert('Aucun mail à envoyer!')
    return
  }

  // an unreadable template would send empty mails
  if (template.isEmpty()) {
    ui.alert('Envoi impossible, le modèle de courriel est vide ou introuvable!')
    return
  }

  const { aEnvoyer, ...nonEnvoyes } = partitionRecipients(
    data,
    tousLesLibelles
  )

  // Send what the daily quota allows, in sheet order; the rest keeps its
  // status and is counted in the report.
  const quota = MailApp.getRemainingDailyQuota()
  const envois = aEnvoyer.slice(0, Math.max(0, quota))
  if (envois.length === 0 && aEnvoyer.length > 0) {
    ui.alert("Envoi impossible, quota d'envoi journalier épuisé!")
    return
  }

  // A second click on the menu while a run is in progress would send the
  // same mails again: one run at a time.
  const lock = LockService.getDocumentLock()
  if (!lock.tryLock(0)) {
    ui.alert('Un envoi est déjà en cours, veuillez patienter.')
    return
  }
  const report: SendReport = {
    envoyes: 0,
    reportes: aEnvoyer.length - envois.length,
    erreurs: [],
    ...nonEnvoyes
  }
  const store = new EmpreintesStore()
  try {
    const spreadsheet = SpreadsheetApp.getActive()
    spreadsheet.toast(`Envoi de ${envois.length} courriel(s)…`, 'Envoi en cours')
    const personnesSheet = spreadsheet.getSheetByName('personnes')
    for (const d of envois) {
      const { subject, html } = template.constructHtml(d)
      const htmlBody = template.insertData(html, d)
      try {
        MailApp.sendEmail({
          to: d.personData.email.trim(),
          subject: template.insertSubjectData(subject, d),
          body: htmlToPlainText(htmlBody),
          htmlBody
        })
      } catch (e) {
        // One bad address must not stop the others.
        report.erreurs.push({
          personne: displayName(d),
          email: d.personData.email,
          message: e instanceof Error ? e.message : String(e)
        })
        continue
      }
      report.envoyes++
      if (d.row !== undefined) {
        personnesSheet?.getRange(d.row, STATUS_COLUMN).setValue(STATUT_ENVOYE)
        // Remember what was confirmed, to flag later changes « à renvoyer ».
        store.set(d.libelle, empreinte(d))
      }
    }
  } finally {
    store.save()
    lock.releaseLock()
  }

  // confirm mails are sent
  const htmlOutput = HtmlService.createTemplateFromFile(
    'dist/emailReportTemplate'
  )
  htmlOutput.report = report
  const emailReport = htmlOutput.evaluate().setWidth(500).setHeight(400)
  ui.showModalDialog(emailReport, "Rapport d'envoi")
}

/** Case- and space-insensitive comparison of sheet values. */
const sameText = (a: unknown, b: string) =>
  String(a).trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Assembles the email data of every recipient from the raw sheet rows.
 *
 * A person is an artist (resp. a volunteer) when at least one of their
 * plages has a function of type `artiste` (resp. `bénévole`). The function
 * of a plage is looked up in `plages` by label, so a function name that is
 * part of another one (bar / barman) or that appears in a date or a name
 * cannot cause a false match.
 *
 * @param destinataires rows of `personnes!A:E` to send to: [nom, prénom, « prénom nom », email, statut];
 *   a sixth element, when present, is the sheet row number
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
    .filter(row => sameText(row[1], 'artiste'))
    .map(getColumnAsRow(0))
  const fonctionsBenevole = fonctions
    .filter(row => sameText(row[1], 'bénévole'))
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
    const libelle = String(d[2] ?? '')
    // An empty label would match every engagement row without a person.
    const listeEngagements =
      libelle === ''
        ? []
        : engagements.filter(rowHasValue(0, libelle)).map(getColumnAsRow(1))
    const listeContreparties =
      libelle === ''
        ? []
        : contreparties
            .filter(rowHasValue(0, libelle))
            .map(row => (row[2] !== '' ? `${row[1]} (${row[2]})` : row[1]))
    data.push({
      personData: {
        nom: String(d[0] ?? ''),
        prenom: String(d[1] ?? ''),
        email: String(d[3] ?? '')
      },
      libelle,
      row: typeof d[5] === 'number' ? d[5] : undefined,
      listeEngagements,
      listeContreparties,
      estArtiste: aUneFonctionParmi(listeEngagements, fonctionsArtiste),
      estBenevole: aUneFonctionParmi(listeEngagements, fonctionsBenevole)
    })
  }
  return data
}

/**
 * Reads the workbook into email data. With `onlyToSend`, only the people
 * whose status is `à envoyer` or `à renvoyer`; otherwise everyone (for
 * previews and status updates), each with their `statut`.
 */
export function collectData (onlyToSend = true): {
  data: Array<ConfirmationEmailData & { statut: string }>
  libelles: string[]
} {
  // get data from spreadsheet
  const classeur = SpreadsheetApp.getActive()
  const personnesSheet = classeur.getSheetByName('personnes')
  const personnesData = personnesSheet?.getRange('A2:E').getValues() ?? []
  const libelles = personnesData
    .filter(rowHasContent)
    .map(row => String(row[2] ?? ''))
  const destinataires = personnesData
    .map((row, index) => [...row, index + 2]) // keep the sheet row
    .filter(row =>
      onlyToSend ? estAEnvoyer(row[4]) : rowHasContent(row.slice(0, 5))
    )
  const engagements =
    classeur
      .getSheetByName('engagements')
      ?.getRange('A2:B')
      .getValues()
      .filter(rowHasContent) ?? []
  const contreparties =
    classeur
      .getSheetByName('contreparties')
      ?.getRange('A2:C')
      .getValues()
      .filter(rowHasContent) ?? []
  const fonctions =
    classeur
      .getSheetByName('fonctions')
      ?.getRange('A2:B')
      .getValues()
      .filter(rowHasContent) ?? []
  const plages =
    classeur
      .getSheetByName('plages')
      ?.getRange('A2:F')
      .getDisplayValues()
      .filter(rowHasContent) ?? []

  const data = buildEmailData(
    destinataires,
    engagements,
    contreparties,
    fonctions,
    plages
  ).map((d, index) => ({ ...d, statut: String(destinataires[index][4] ?? '') }))
  return { data, libelles }
}
