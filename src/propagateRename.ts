/**
 * The labels of `personnes!C` and `plages!F` are the keys that `engagements`
 * and `contreparties` refer to. When a name or a plage is edited, its label
 * changes and every reference to the old label would become an orphan. The
 * functions below carry the change over to the referring columns.
 */

/**
 * Maps each old label to its new one, for the rows whose label changed.
 * A rename is skipped when it is ambiguous: the old label was shared by
 * several rows, or the new label is one that another row already had (the
 * references might belong to that other row).
 */
export function computeRenames (
  oldLabels: ReadonlyArray<string>,
  newLabels: ReadonlyArray<string>
): Map<string, string> {
  const occurrences = new Map<string, number>()
  for (const label of oldLabels) {
    if (label !== '') occurrences.set(label, (occurrences.get(label) ?? 0) + 1)
  }
  const renames = new Map<string, string>()
  for (let i = 0; i < newLabels.length; i++) {
    const oldLabel = oldLabels[i] ?? ''
    const newLabel = newLabels[i]
    if (oldLabel === '' || newLabel === '' || oldLabel === newLabel) continue
    if ((occurrences.get(oldLabel) ?? 0) > 1) continue
    if (occurrences.has(newLabel)) continue
    renames.set(oldLabel, newLabel)
  }
  return renames
}

/**
 * Replaces the renamed labels in one column of a sheet (A1 notation such as
 * `A2:A`). Returns the number of cells changed; the sheet is only written
 * when something changed.
 */
export function applyRenames (
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null | undefined,
  columnA1: string,
  renames: ReadonlyMap<string, string>
): number {
  if (!sheet || renames.size === 0) return 0
  const range = sheet.getRange(columnA1)
  const values = range.getValues()
  let changed = 0
  const output = values.map(([value]) => {
    const renamed = renames.get(String(value))
    if (renamed === undefined) return [value]
    changed++
    return [renamed]
  })
  if (changed > 0) range.setValues(output)
  return changed
}
