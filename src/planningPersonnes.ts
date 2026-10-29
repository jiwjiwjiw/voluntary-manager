import { writeComputedSheet } from './computedSheet'

export const PLANNING_PERSONNES_SHEET = 'planning personnes'
export const PLANNING_PERSONNES_HEADER = ['personne', 'nombre de plages', 'plages']

/**
 * One row per person: label, number of plages, and the plages in
 * chronological order, one per line in the cell. Every person of the
 * `personnes` sheet appears, with 0 when they have no engagement, as well
 * as any name found in `engagements` only (an orphan that « Vérifier le
 * classeur » reports), so that the sheet reflects what the planning shows.
 *
 * @param personnes labels of `personnes!C`
 * @param plagesOrdered labels of the plages, in chronological order
 * @param engagements rows of `engagements!A:B`: [personne, libellé de plage]
 */
export function computePlanningPersonnes (
  personnes: ReadonlyArray<string>,
  plagesOrdered: ReadonlyArray<string>,
  engagements: ReadonlyArray<ReadonlyArray<unknown>>
): Array<[string, number, string]> {
  const rank = new Map(plagesOrdered.map((label, index) => [label, index]))
  const parPersonne = new Map<string, string[]>()
  for (const label of personnes) {
    if (label !== '' && !parPersonne.has(label)) parPersonne.set(label, [])
  }
  for (const [personne, plage] of engagements) {
    const p = String(personne ?? '')
    const label = String(plage ?? '')
    if (p === '' || label === '') continue
    if (!parPersonne.has(p)) parPersonne.set(p, [])
    parPersonne.get(p)!.push(label)
  }
  const unknownLast = (label: string) => rank.get(label) ?? Number.POSITIVE_INFINITY
  return [...parPersonne.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([personne, plages]) => {
      const ordered = [...plages].sort(
        (a, b) => unknownLast(a) - unknownLast(b) || a.localeCompare(b)
      )
      return [personne, ordered.length, ordered.join('\n')]
    })
}

/** Reads `personnes!C` and writes the `planning personnes` sheet. */
export function updatePlanningPersonnes (
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  plagesOrdered: ReadonlyArray<string>,
  engagements: ReadonlyArray<ReadonlyArray<unknown>>
) {
  const personnes =
    spreadsheet
      .getSheetByName('personnes')
      ?.getRange('C2:C')
      .getValues()
      .map(row => String(row[0] ?? '')) ?? []
  writeComputedSheet(
    spreadsheet,
    PLANNING_PERSONNES_SHEET,
    PLANNING_PERSONNES_HEADER,
    computePlanningPersonnes(personnes, plagesOrdered, engagements)
  )
}
