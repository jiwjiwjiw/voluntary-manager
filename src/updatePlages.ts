import { applyRenames, computeRenames } from './propagateRename'

/**
 * Composes the label of a `plages` row ([date, fonction, début, fin, …]) as
 * `date | fonction | début-fin`. Missing parts are left out together with
 * their separator; the time part only appears when both bounds are set.
 */
export function composePlageLabel (row: ReadonlyArray<unknown>): string {
  let texte = ''
  if (row[0]) {
    texte += `${row[0]} | `
  }
  if (row[1] !== '') {
    texte += `${row[1]} | `
  }
  if (row[2] && row[3]) {
    texte += `${row[2]}-${row[3]} | `
  }
  if (texte !== '') {
    texte = texte.slice(0, -3)
  }
  return texte
}

/**
 * Recomputes `plages!F` and carries any changed label over to the
 * references in `engagements!B`.
 */
export function updatePlages () {
  const spreadsheet = SpreadsheetApp.getActive()
  const plagesSheet = spreadsheet.getSheetByName('plages')
  if (!plagesSheet) return
  // Display values, so that a date or time cell contributes the text shown
  // in the sheet rather than a JavaScript Date.
  const plagesData = plagesSheet.getRange('A2:F').getDisplayValues()
  const oldLabels = plagesData.map(x => x[5])
  const newLabels = plagesData.map(composePlageLabel)
  plagesSheet.getRange('F2:F').setValues(newLabels.map(label => [label]))

  const renames = computeRenames(oldLabels, newLabels)
  applyRenames(spreadsheet.getSheetByName('engagements'), 'B2:B', renames)
}
