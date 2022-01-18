export function updatePersonnes () {
  let personnesSheet = SpreadsheetApp.getActive().getSheetByName('personnes')
  let personnesRange = personnesSheet?.getRange('A2:F')
  let personnesData = personnesRange?.getValues()
  let output = personnesData?.map(x =>
    x[0] && x[1] ? [x[1] + ' ' + x[0]] : ['']
  )
  if (output) {
    let outputRange = personnesSheet?.getRange('C2:C')
    outputRange?.setValues(output)
  }
}
