import { Validation } from './sheets-tools/Validation'

/**
 * What `engagements!B` may name: a plage (its label, `plages!F`), or a
 * function that has no plage at all (costumes, technique…), for people
 * engaged on the function as a whole, with no slot and no count.
 */

/**
 * The functions that appear in no plage, in the order of `fonctions`.
 *
 * @param plages rows of `plages!A:F`: [date, fonction, début, fin, nombre, libellé]
 * @param fonctions names of `fonctions!A`
 */
export function fonctionsSansPlage (
  plages: ReadonlyArray<ReadonlyArray<unknown>>,
  fonctions: ReadonlyArray<unknown>
): string[] {
  const avecPlage = new Set(plages.map(row => String(row[1] ?? '').trim()))
  const libelles = new Set(plages.map(row => String(row[5] ?? '').trim()))
  const out: string[] = []
  for (const value of fonctions) {
    const nom = String(value ?? '').trim()
    if (nom === '' || avecPlage.has(nom) || libelles.has(nom) || out.includes(nom)) continue
    out.push(nom)
  }
  return out
}

/** Every value `engagements!B` accepts: the plage labels, then the functions without plage. */
export function ciblesEngagement (
  plages: ReadonlyArray<ReadonlyArray<unknown>>,
  fonctions: ReadonlyArray<unknown>
): string[] {
  const libelles = [
    ...new Set(plages.map(row => String(row[5] ?? '').trim()).filter(l => l !== ''))
  ]
  return [...libelles, ...fonctionsSansPlage(plages, fonctions)]
}

/** Reads `plages!A:F` (as displayed) and `fonctions!A`. */
export function readCibles (spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {
  const plages =
    spreadsheet.getSheetByName('plages')?.getRange('A2:F').getDisplayValues() ?? []
  const fonctions =
    spreadsheet
      .getSheetByName('fonctions')
      ?.getRange('A2:A')
      .getDisplayValues()
      .map(row => row[0]) ?? []
  return { plages, fonctions }
}

/**
 * The dropdown of `engagements!B`: a list of values written in the rule,
 * since it gathers two ranges. It does not follow the sheets on its own, so
 * it is rewritten after each edit of `plages` or `fonctions`. With nothing
 * to offer, it falls back on the plage labels range rather than an empty
 * list that would reject every input.
 */
export function engagementsValidation (
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): Validation {
  const { plages, fonctions } = readCibles(spreadsheet)
  const cibles = ciblesEngagement(plages, fonctions)
  return cibles.length > 0
    ? new Validation('engagements', 'B2:B', '', '', false, cibles)
    : new Validation('engagements', 'B2:B', 'plages', 'F2:F')
}

export function updateEngagementsValidation () {
  engagementsValidation(SpreadsheetApp.getActive()).update()
}
