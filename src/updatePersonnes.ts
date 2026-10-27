/**
 * Composes the « prénom nom » label of a `personnes` row ([nom, prénom, …]).
 * Returns '' when either part is missing, so that incomplete rows produce
 * an empty label instead of a dangling name.
 */
export function composeFullName (row: ReadonlyArray<unknown>): string {
  return row[0] && row[1] ? `${row[1]} ${row[0]}` : ''
}

export function updatePersonnes () {
  const personnesSheet = SpreadsheetApp.getActive().getSheetByName('personnes')
  const personnesRange = personnesSheet?.getRange('A2:F')
  const personnesData = personnesRange?.getValues()
  const output = personnesData?.map(x => [composeFullName(x)])
  if (output) {
    const outputRange = personnesSheet?.getRange('C2:C')
    outputRange?.setValues(output)
  }
}
