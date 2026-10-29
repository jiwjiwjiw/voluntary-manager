/**
 * Writes a sheet that the script owns entirely: a header row followed by
 * computed rows. The sheet is created when missing, emptied below the header,
 * grown when the rows do not fit, and the header is rewritten each time so
 * that a renamed column comes back.
 */
export function writeComputedSheet (
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string,
  header: string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = spreadsheet.getSheetByName(name) ?? spreadsheet.insertSheet(name)
  const width = Math.max(header.length, ...rows.map(r => r.length))
  if (sheet.getMaxColumns() < width) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns())
  }
  const neededRows = rows.length + 1
  if (sheet.getMaxRows() < neededRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows())
  }
  sheet.getRange(1, 1, sheet.getMaxRows(), width).clearContent()
  sheet.getRange(1, 1, 1, header.length).setValues([header])
  if (rows.length > 0) {
    // Pad the rows to the same width: setValues() wants a rectangle.
    const rectangle = rows.map(r => [...r, ...Array(width - r.length).fill('')])
    sheet.getRange(2, 1, rows.length, width).setValues(rectangle)
  }
  return sheet
}
