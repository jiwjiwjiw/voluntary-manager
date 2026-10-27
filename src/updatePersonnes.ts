/**
 * Composes the « prénom nom » label of a `personnes` row ([nom, prénom, …]).
 * Returns '' when either part is missing, so that incomplete rows produce
 * an empty label instead of a dangling name.
 */
export function composeFullName (row: ReadonlyArray<unknown>): string {
  return row[0] && row[1] ? `${row[1]} ${row[0]}` : ''
}

export function updatePersonnes () {
  let personnesSheet = SpreadsheetApp.getActive().getSheetByName('personnes')
  let personnesRange = personnesSheet?.getRange('A2:F')
  let personnesData = personnesRange?.getValues()
  let output = personnesData?.map(x => [composeFullName(x)])
  if (output) {
    let outputRange = personnesSheet?.getRange('C2:C')
    outputRange?.setValues(output)
  }
}
