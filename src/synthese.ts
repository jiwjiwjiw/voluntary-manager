import { writeComputedSheet } from './computedSheet'

export const SYNTHESE_SHEET = 'synthèse'

/** One line of the fill-rate tables. `taux` is a ratio (0.75), not a percentage. */
export interface Remplissage {
  cle: string
  places: number
  pourvues: number
  vacantes: number
  taux: number | ''
}

export interface PlageRemplissage {
  /** Date as displayed in the sheet, used as the key of the per-date table. */
  date: string
  fonction: string
  /** Number of places; a blank or invalid cell counts as 0. */
  nombre: unknown
  libelle: string
}

function aggregate (
  plages: ReadonlyArray<PlageRemplissage>,
  engagesParPlage: ReadonlyMap<string, number>,
  key: (p: PlageRemplissage) => string,
  keysInOrder: ReadonlyArray<string>
): Remplissage[] {
  const lines = new Map<string, Remplissage>()
  for (const cle of keysInOrder) {
    if (!lines.has(cle)) lines.set(cle, { cle, places: 0, pourvues: 0, vacantes: 0, taux: '' })
  }
  for (const p of plages) {
    const cle = key(p)
    if (cle === '') continue
    const line = lines.get(cle) ?? { cle, places: 0, pourvues: 0, vacantes: 0, taux: '' }
    lines.set(cle, line)
    const places = Number(p.nombre)
    const engages = engagesParPlage.get(p.libelle) ?? 0
    line.places += Number.isFinite(places) && places > 0 ? places : 0
    line.pourvues += engages
  }
  for (const line of lines.values()) {
    line.vacantes = Math.max(0, line.places - line.pourvues)
    line.taux = line.places > 0 ? Math.min(1, line.pourvues / line.places) : ''
  }
  return [...lines.values()]
}

function total (lines: ReadonlyArray<Remplissage>): Remplissage {
  const places = lines.reduce((s, l) => s + l.places, 0)
  const pourvues = lines.reduce((s, l) => s + l.pourvues, 0)
  return {
    cle: 'total',
    places,
    pourvues,
    vacantes: Math.max(0, places - pourvues),
    taux: places > 0 ? Math.min(1, pourvues / places) : ''
  }
}

/**
 * Fill rate per date and per function: places, filled, vacant, ratio.
 *
 * @param plagesOrdered the plages in chronological order (dates come out in
 *   that order; functions in alphabetical order)
 * @param engagements rows of `engagements!A:B`: [personne, libellé de plage]
 */
export function computeSynthese (
  plagesOrdered: ReadonlyArray<PlageRemplissage>,
  engagements: ReadonlyArray<ReadonlyArray<unknown>>
): { parDate: Remplissage[]; parFonction: Remplissage[] } {
  const engagesParPlage = new Map<string, number>()
  for (const [, plage] of engagements) {
    const label = String(plage ?? '')
    if (label !== '') engagesParPlage.set(label, (engagesParPlage.get(label) ?? 0) + 1)
  }
  const dates = plagesOrdered.map(p => p.date)
  const fonctions = [...new Set(plagesOrdered.map(p => p.fonction))]
    .filter(f => f !== '')
    .sort((a, b) => a.localeCompare(b))
  const parDate = aggregate(plagesOrdered, engagesParPlage, p => p.date, dates)
  const parFonction = aggregate(
    plagesOrdered,
    engagesParPlage,
    p => p.fonction,
    fonctions
  )
  if (parDate.length > 0) parDate.push(total(parDate))
  if (parFonction.length > 0) parFonction.push(total(parFonction))
  return { parDate, parFonction }
}

const COLUMNS = ['places', 'pourvues', 'vacantes', 'taux']

/** The two tables as sheet rows: header, lines, blank row, header, lines. */
export function syntheseRows (synthese: {
  parDate: Remplissage[]
  parFonction: Remplissage[]
}): unknown[][] {
  const line = (l: Remplissage) => [l.cle, l.places, l.pourvues, l.vacantes, l.taux]
  return [
    ...synthese.parDate.map(line),
    [],
    ['fonction', ...COLUMNS],
    ...synthese.parFonction.map(line)
  ]
}

/** Writes the `synthèse` sheet. */
export function updateSynthese (
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  plagesOrdered: ReadonlyArray<PlageRemplissage>,
  engagements: ReadonlyArray<ReadonlyArray<unknown>>
) {
  const rows = syntheseRows(computeSynthese(plagesOrdered, engagements))
  const sheet = writeComputedSheet(spreadsheet, SYNTHESE_SHEET, ['date', ...COLUMNS], rows)
  // Column E holds ratios: show them as percentages.
  sheet.getRange(2, 5, Math.max(1, rows.length), 1).setNumberFormat('0%')
}
