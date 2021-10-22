function updatePlages() {
  updatePlagesSynthese()
  updateValidation('plages', 'A2:A', 'dates', 'A2:A')
  updateValidation('plages', 'B2:B', 'fonctions', 'A2:A')
}

function updatePlagesSynthese() {
  let plagesSheet = SpreadsheetApp.getActive().getSheetByName('plages')
  let plagesRange = plagesSheet.getRange('A2:F')
  let plagesData = plagesRange.getValues()
  let output = plagesData.map(x => {
    let texte = ""
    if (x[0]) {
      texte += x[0] + ' | '
    }
    if (x[1] !== '') {
      texte += x[1] + ' | '
    }
    if (x[2] && x[3]) {
      texte += x[2] + '-' + x[3] + ' | '
    }
    if (texte !== '') {
      texte = texte.slice(0, -3)
    }
    return [texte]
  })
  let outputRange = plagesSheet.getRange('F2:F')
  outputRange.setValues(output)
}

function updateValidation(dataSheetName: string, dataRangeName: string, validationSheetName: string, validationRangeName: string) {
  const dataSheet = SpreadsheetApp.getActive().getSheetByName(dataSheetName)
  if(!dataSheet) {
    SpreadsheetApp.getUi().alert(`Tentative d'accès à la feuille inexistante "${dataSheetName}"`)
    return
  } 
  const validationSheet = SpreadsheetApp.getActive().getSheetByName(validationSheetName)
  if(!validationSheet) {
    SpreadsheetApp.getUi().alert(`Tentative d'accès à la feuille inexistante "${validationSheetName}"`)
    return
  } 
  let dataRange = dataSheet.getRange(dataRangeName)
  const validationRange = validationSheet.getRange(validationRangeName)
  let rules = SpreadsheetApp.newDataValidation()
    .setAllowInvalid(false)
    .requireValueInRange(validationRange)
    .build()
  dataRange.setDataValidation(rules)
}

