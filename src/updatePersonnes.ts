import { applyRenames, computeRenames } from './propagateRename'

/**
 * Composes the « prénom nom » label of a `personnes` row ([nom, prénom, …]).
 * Returns '' when either part is missing, so that incomplete rows produce
 * an empty label instead of a dangling name.
 */
export function composeFullName (row: ReadonlyArray<unknown>): string {
  return row[0] && row[1] ? `${row[1]} ${row[0]}` : ''
}

/**
 * Recomputes `personnes!C` and carries any changed label over to the
 * references in `engagements!A` and `contreparties!A`.
 */
export function updatePersonnes () {
  const spreadsheet = SpreadsheetApp.getActive()
  const personnesSheet = spreadsheet.getSheetByName('personnes')
  if (!personnesSheet) return
  const personnesData = personnesSheet.getRange('A2:C').getValues()
  const oldLabels = personnesData.map(x => String(x[2] ?? ''))
  const newLabels = personnesData.map(composeFullName)
  personnesSheet.getRange('C2:C').setValues(newLabels.map(label => [label]))

  const renames = computeRenames(oldLabels, newLabels)
  applyRenames(spreadsheet.getSheetByName('engagements'), 'A2:A', renames)
  applyRenames(spreadsheet.getSheetByName('contreparties'), 'A2:A', renames)
}
