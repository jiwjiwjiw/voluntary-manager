import { compareRowsOnColumn, rowHasContent } from './sheets-tools/helpers'

/**
 * Builds the planning rows: one row per plage, with the label in the first
 * column and, in the second, the people engaged on it (one per line) followed
 * by one `?` per still vacant place.
 *
 * @param plages rows of `plages!E:F`: [nombre de personnes, libellé]
 * @param engagements rows of `engagements!A:B`: [personne, libellé de plage]
 */
export function computePlanning (
  plages: ReadonlyArray<any[]>,
  engagements: ReadonlyArray<any[]>
): Array<[string, string]> {
  let output: Array<[string, string]> = []
  for (let i = 0; i < plages.length; i++) {
    let personnes = ''
    let counter = plages[i][0]
    for (let j = 0; j < engagements.length; j++) {
      if (engagements[j][1] === plages[i][1]) {
        personnes += engagements[j][0] + '\n'
        counter--
      }
    }
    for (let c = 0; c < counter; c++) {
      personnes += '?\n'
    }
    if (personnes !== '') {
      personnes = personnes.slice(0, -1)
    }
    output.push([plages[i][1], personnes])
  }
  return output
}

export function updatePlanning () {
  // extract data from sheet
  let spreadsheet = SpreadsheetApp.getActive()
  let plagesSheet = spreadsheet.getSheetByName('plages')
  let engagementsSheet = spreadsheet.getSheetByName('engagements')
  let planningSheet = spreadsheet.getSheetByName('planning')
  let plagesRange = plagesSheet?.getRange('E2:F')
  let engagementsRange = engagementsSheet?.getRange('A2:B')
  let plagesData = plagesRange
    ?.getValues()
    .filter(rowHasContent)
    .sort(compareRowsOnColumn(1))
  let engagementsData = engagementsRange?.getValues().filter(rowHasContent)

  if (plagesData && engagementsData && planningSheet) {
    let output = computePlanning(plagesData, engagementsData)

    // write computed data to spreadsheet
    if (output.length > 0) {
      let planning = planningSheet.getRange('A2:B')
      planning.clearContent()
      let newPlanning = planningSheet.getRange(2, 1, output.length, 2)
      newPlanning.setValues(output)
    }
  }
}
