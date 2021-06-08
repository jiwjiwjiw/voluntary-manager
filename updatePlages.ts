function updatePlages() {
  let plagesSheet = SpreadsheetApp.getActive().getSheetByName('plages') 
  let plagesRange = plagesSheet.getRange('A2:F')
  let plagesData = plagesRange.getValues()
  let output = plagesData.map(x => {
    let texte = ""
    if(x[0]) {
      texte += x[0] + ' | '
    }
    if(x[1] !== '') {
      texte += x[1] + ' | '
    }
    if(x[2] && x[3]) {
      texte += x[2] + '-' + x[3] + ' | '
    }
    if(texte !== '') {
      texte = texte.slice(0, -3)
    }
    return [texte]
  })
  let outputRange =  plagesSheet.getRange('F2:F') 
  outputRange.setValues(output) 

}