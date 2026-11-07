import { EmpreintesStore } from './empreintes'
import { applyRenames, computeRenames } from './propagateRename'
import { PERSO_COLUMN, PERSO_HEADER } from './sendEmails'

/**
 * Composes the « prénom nom » label of a `personnes` row ([nom, prénom, …]).
 * Returns '' when either part is missing, so that incomplete rows produce
 * an empty label instead of a dangling name.
 */
export function composeFullName (row: ReadonlyArray<unknown>): string {
  return row[0] && row[1] ? `${row[1]} ${row[0]}` : ''
}

/**
 * Gives `personnes` its texte perso column: grows the sheet when it is too
 * narrow and names the column when its header is empty.
 */
export function ensurePersoColumn (sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  if (sheet.getMaxColumns() < PERSO_COLUMN) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), PERSO_COLUMN - sheet.getMaxColumns())
  }
  const header = sheet.getRange(1, PERSO_COLUMN)
  if (String(header.getValue() ?? '').trim() === '') header.setValue(PERSO_HEADER)
}

/**
 * Recomputes `personnes!C` and carries any changed label over to the
 * references in `engagements!A` and `contreparties!A`.
 */
export function updatePersonnes () {
  const spreadsheet = SpreadsheetApp.getActive()
  const personnesSheet = spreadsheet.getSheetByName('personnes')
  if (!personnesSheet) return
  ensurePersoColumn(personnesSheet)
  const personnesData = personnesSheet.getRange('A2:C').getValues()
  const oldLabels = personnesData.map(x => String(x[2] ?? ''))
  const newLabels = personnesData.map(composeFullName)
  personnesSheet.getRange('C2:C').setValues(newLabels.map(label => [label]))

  const renames = computeRenames(oldLabels, newLabels)
  applyRenames(spreadsheet.getSheetByName('engagements'), 'A2:A', renames)
  applyRenames(spreadsheet.getSheetByName('contreparties'), 'A2:A', renames)
  if (renames.size > 0) {
    const store = new EmpreintesStore()
    store.rename(renames)
    store.save()
  }
}
