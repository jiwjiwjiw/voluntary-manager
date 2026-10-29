import { updatePlanningPersonnes } from './planningPersonnes'
import { rowHasContent } from './sheets-tools/helpers'
import { updateSynthese } from './synthese'

/**
 * Chronological sort key of a `plages` row ([date, fonction, début, fin, …]).
 * The date cell is a Date when Sheets recognised it, or a `jj.mm.aaaa` text;
 * anything else sorts after the dated rows, by its text. The start time
 * breaks ties between plages of the same day.
 */
export function plageSortKey (
  row: ReadonlyArray<any>
): [number, string, number, string] {
  const date = row[0]
  let time = NaN
  if (date instanceof Date) {
    time = date.getTime()
  } else {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(date).trim())
    if (m) time = new Date(+m[3], +m[2] - 1, +m[1]).getTime()
  }
  const debut = row[2]
  return [
    Number.isNaN(time) ? Infinity : time,
    String(date),
    timeOfDayInMinutes(debut),
    String(debut)
  ]
}

/**
 * Minutes since midnight of a time cell (a Date) or of a time typed as text
 * (`9:00`, `09:00`, `9h`, `9h30`, `09:00:00`); Infinity when unreadable, so
 * that such rows sort last by their text.
 */
export function timeOfDayInMinutes (value: unknown): number {
  if (value instanceof Date) return value.getHours() * 60 + value.getMinutes()
  const m = /^(\d{1,2})\s*[:hH]\s*(\d{0,2})(?::\d{2})?$/.exec(String(value).trim())
  if (!m) return Infinity
  return +m[1] * 60 + (m[2] === '' ? 0 : +m[2])
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
  const output: Array<[string, string]> = []
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
  const spreadsheet = SpreadsheetApp.getActive()
  const plagesSheet = spreadsheet.getSheetByName('plages')
  const engagementsSheet = spreadsheet.getSheetByName('engagements')
  const planningSheet = spreadsheet.getSheetByName('planning')
  const plagesRange = plagesSheet?.getRange('A2:F')
  const engagementsRange = engagementsSheet?.getRange('A2:B')
  const plagesSorted = plagesRange
    ?.getValues()
    .filter(rowHasContent)
    .sort(comparePlages)
  const plagesData = plagesSorted?.map(row => [row[4], row[5]]) // [nombre de personnes, libellé]
  const engagementsData = engagementsRange?.getValues().filter(rowHasContent)

  if (plagesSorted && plagesData && engagementsData && planningSheet) {
    const output = computePlanning(plagesData, engagementsData)

    // write computed data to spreadsheet
    planningSheet.getRange('A2:B').clearContent()
    if (output.length > 0) {
      // getRange() throws beyond the last row of the sheet: grow it first.
      const missingRows = output.length + 1 - planningSheet.getMaxRows()
      if (missingRows > 0) {
        planningSheet.insertRowsAfter(planningSheet.getMaxRows(), missingRows)
      }
      planningSheet.getRange(2, 1, output.length, 2).setValues(output)
    }

    // the same data seen from each person
    updatePlanningPersonnes(
      spreadsheet,
      plagesSorted.map(row => String(row[5] ?? '')),
      engagementsData
    )

    // and summed up per date and per function; dates as displayed, since
    // getValues() returns Date objects for date cells
    const displayed = plagesRange!.getDisplayValues().filter(rowHasContent)
    const dateOf = new Map(displayed.map(row => [row[5], row[0]]))
    updateSynthese(
      spreadsheet,
      plagesSorted.map(row => ({
        date: dateOf.get(String(row[5] ?? '')) ?? String(row[0] ?? ''),
        fonction: String(row[1] ?? ''),
        nombre: row[4],
        libelle: String(row[5] ?? '')
      })),
      engagementsData
    )
  }
}
