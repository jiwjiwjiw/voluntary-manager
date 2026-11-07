import { ConfirmationEmailData } from './ConfirmationEmailTemplateParams'
import { doitRenvoyer, EmpreintesStore } from './empreintes'
import { collectData, STATUS_COLUMN } from './sendEmails'
import { estEnvoye, STATUT_A_RENVOYER } from './statuts'

/**
 * The rows of people who were sent a confirmation and whose engagements or
 * contreparties have changed since, or who were given a new texte perso:
 * they need a new mail.
 */
export function rowsARenvoyer (
  data: ReadonlyArray<ConfirmationEmailData & { statut?: string }>,
  store: Pick<EmpreintesStore, 'get'>
): number[] {
  const rows: number[] = []
  for (const d of data) {
    if (d.row === undefined || d.libelle === '' || !estEnvoye(d.statut)) continue
    if (doitRenvoyer(store.get(d.libelle), d)) rows.push(d.row)
  }
  return rows
}

/** Flags « à renvoyer » the people whose confirmation is out of date. */
export function updateStatuts () {
  const spreadsheet = SpreadsheetApp.getActive()
  const personnesSheet = spreadsheet.getSheetByName('personnes')
  if (!personnesSheet) return
  const { data } = collectData(false)
  const store = new EmpreintesStore()
  for (const row of rowsARenvoyer(data, store)) {
    personnesSheet.getRange(row, STATUS_COLUMN).setValue(STATUT_A_RENVOYER)
  }
}
