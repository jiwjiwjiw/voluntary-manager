/**
 * Optional `config` sheet: one setting per row, key in column A, value in
 * column B. Unknown keys are ignored, so the sheet can hold other notes.
 */
export interface MailConfig {
  /** Display name of the sender (the address stays the sending user's). */
  name?: string
  /** Address the recipients' replies go to. */
  replyTo?: string
  /** Hidden copy of every mail, e.g. the organiser's mailbox. */
  bcc?: string
}

const KEYS: Record<string, keyof MailConfig> = {
  "nom de l'expéditeur": 'name',
  'nom de l’expéditeur': 'name',
  'adresse de réponse': 'replyTo',
  'copie cachée': 'bcc'
}

const normalise = (s: unknown) => String(s).trim().toLowerCase()

/** @param rows rows of `config!A:B`: [clé, valeur] */
export function parseConfig (rows: ReadonlyArray<ReadonlyArray<unknown>>): MailConfig {
  const config: MailConfig = {}
  for (const row of rows) {
    const key = KEYS[normalise(row[0])]
    const value = String(row[1] ?? '').trim()
    if (key && value !== '') config[key] = value
  }
  return config
}

export function readConfig (
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): MailConfig {
  const sheet = spreadsheet.getSheetByName('config')
  if (!sheet) return {}
  return parseConfig(sheet.getRange('A2:B').getDisplayValues())
}
