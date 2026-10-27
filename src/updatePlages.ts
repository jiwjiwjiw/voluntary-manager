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

export function updatePlages () {
  const plagesSheet = SpreadsheetApp.getActive().getSheetByName('plages')
  const plagesRange = plagesSheet?.getRange('A2:F')
  // Display values, so that a date or time cell contributes the text shown
  // in the sheet rather than a JavaScript Date.
  const plagesData = plagesRange?.getDisplayValues()
  const output = plagesData?.map(x => [composePlageLabel(x)])
  if (output) {
    const outputRange = plagesSheet?.getRange('F2:F')
    outputRange?.setValues(output)
  }
}
