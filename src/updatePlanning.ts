import { rowHasContent } from './sheets-tools/helpers'

/**
 * Chronological sort key of a `plages` row ([date, fonction, début, fin, …]).
 * The date cell is a Date when Sheets recognised it, or a `jj.mm.aaaa` text;
 * anything else sorts after the dated rows, by its text. The start time
 * breaks ties between plages of the same day.
 */
export function plageSortKey (row: ReadonlyArray<any>): [number, string, string] {
  const date = row[0]
  let time = NaN
  if (date instanceof Date) {
    time = date.getTime()
  } else {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(date).trim())
    if (m) time = new Date(+m[3], +m[2] - 1, +m[1]).getTime()
  }
  const debut = row[2]
  const debutKey =
    debut instanceof Date
      ? `${String(debut.getHours()).padStart(2, '0')}:${String(debut.getMinutes()).padStart(2, '0')}`
      : String(debut)
  return [Number.isNaN(time) ? Infinity : time, String(date), debutKey]
}

export function comparePlages (a: ReadonlyArray<any>, b: ReadonlyArray<any>) {
  const ka = plageSortKey(a)
  const kb = plageSortKey(b)
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1
    if (ka[i] > kb[i]) return 1
  }
  return 0
}

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
  let plagesRange = plagesSheet?.getRange('A2:F')
  let engagementsRange = engagementsSheet?.getRange('A2:B')
  let plagesData = plagesRange
    ?.getValues()
    .filter(rowHasContent)
    .sort(comparePlages)
    .map(row => [row[4], row[5]]) // [nombre de personnes, libellé]
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
