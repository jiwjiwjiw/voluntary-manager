/**
 * The « texte perso mail » column of `personnes`: a text written for one
 * person, inserted by %PERSO% in their next mail, then erased. It is found
 * by its header, wherever it is, so that a column the users already had
 * (remarks, phone…) is never taken for it.
 */

export const PERSO_HEADER = 'texte perso mail'

/** The columns A:E the script reads by position; the texte perso is never one of them. */
const FIXED_COLUMNS = 5

/** Column (1-based) whose header is « texte perso mail », any case; undefined when none. */
export function findPersoColumn (
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): number | undefined {
  const last = sheet.getLastColumn()
  if (last < 1) return undefined
  const headers = sheet.getRange(1, 1, 1, last).getDisplayValues()[0]
  const index = headers.findIndex(
    (header, i) => i >= FIXED_COLUMNS && header.trim().toLowerCase() === PERSO_HEADER
  )
  return index === -1 ? undefined : index + 1
}

/** The texte perso column, created at the right of the sheet when missing. */
export function ensurePersoColumn (sheet: GoogleAppsScript.Spreadsheet.Sheet): number {
  const found = findPersoColumn(sheet)
  if (found !== undefined) return found
  const column = Math.max(sheet.getLastColumn(), FIXED_COLUMNS) + 1
  if (sheet.getMaxColumns() < column) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), column - sheet.getMaxColumns())
  }
  sheet.getRange(1, column).setValue(PERSO_HEADER)
  return column
}

/**
 * The texte perso of `numRows` rows from row 2, '' for each row when the
 * sheet has no such column.
 */
export function readTextesPerso (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  numRows: number
): string[] {
  const column = findPersoColumn(sheet)
  if (column === undefined || numRows < 1) return Array(Math.max(0, numRows)).fill('')
  return sheet
    .getRange(2, column, numRows, 1)
    .getValues()
    .map(row => String(row[0] ?? ''))
}
