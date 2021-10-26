function updatePlanning() {
    // extract data from sheet
    let spreadsheet = SpreadsheetApp.getActive()
    let plagesSheet = spreadsheet.getSheetByName('plages')
    let engagementsSheet = spreadsheet.getSheetByName('engagements')
    let planningSheet = spreadsheet.getSheetByName('planning')
    let plagesRange = plagesSheet.getRange("E2:F")
    let engagementsRange = engagementsSheet.getRange("A2:B")
    let plagesData = plagesRange.getValues().filter(rowHasContent).sort(compareRowsOnColumn(1))
    let engagementsData = engagementsRange.getValues().filter(rowHasContent)
    
    // match data
    let output = []
    for (let i = 0; i < plagesData.length; i++){
      let personnes = ""
      let counter = plagesData[i][0]
      for (let j = 0; j < engagementsData.length; j++) {
        if(engagementsData[j][1] === plagesData[i][1]) {
          personnes += engagementsData[j][0] + "\n"
          counter--
        }
      }  
      for (let c = 0; c < counter; c++) {
        personnes += "?\n"
      }
      if(personnes !== "") {
        personnes = personnes.slice(0, -1)
      }
      output.push([plagesData[i][1], personnes])
    }
    
    // write computed data to spreadsheet
    let planning = planningSheet.getRange("A2:B")
    planning.clearContent()
    let newPlanning = planningSheet.getRange(2, 1, output.length, 2)
    newPlanning.setValues(output)  
  }