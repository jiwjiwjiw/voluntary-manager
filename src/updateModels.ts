import { ConfirmationEmailTemplateParams } from './ConfirmationEmailTemplateParams'
import { EmailTemplateList } from './EmailTemplateList'
import { EmailTemplate } from './sheets-tools/EmailTemplate'
import { Validation } from './sheets-tools/Validation'
import { ValidationHandler } from './sheets-tools/ValidationHandler'
import { STATUTS_ENVOI } from './statuts'
import { updatePersonnes } from './updatePersonnes'
import { updatePlages } from './updatePlages'
import { updatePlanning } from './updatePlanning'
import { updateStatuts } from './updateStatuts'

/**
 * Installs every dropdown of the workbook. The rules that reference a
 * range follow the sheet on their own, so this only needs to run on open,
 * on authorisation and after a structural change.
 */
export function updateValidation () {
  const validationHandler = ValidationHandler.getInstance()
  validationHandler.add(
    new Validation('contreparties', 'A2:A', 'personnes', 'C2:C')
  )
  validationHandler.add(new Validation('plages', 'A2:A', 'dates', 'A2:A'))
  validationHandler.add(new Validation('plages', 'B2:B', 'fonctions', 'A2:A'))
  validationHandler.add(
    new Validation('engagements', 'A2:A', 'personnes', 'C2:C')
  )
  validationHandler.add(new Validation('engagements', 'B2:B', 'plages', 'F2:F'))
  validationHandler.add(
    new Validation('fonctions', 'B2:B', '', '', false, ['artiste', 'bénévole'])
  )
  validationHandler.add(
    new Validation('personnes', 'E2:E', '', '', false, STATUTS_ENVOI)
  )
  // Every template sheet, not only the default one.
  for (const sheet of new EmailTemplateList(SpreadsheetApp.getActive()).list) {
    EmailTemplate.addValidation(
      new ConfirmationEmailTemplateParams(sheet.getName())
    )
  }
  validationHandler.update()
}

export type UpdateStep =
  | 'personnes'
  | 'plages'
  | 'planning'
  | 'statuts'
  | 'validation'

const ALL_STEPS: UpdateStep[] = [
  'personnes',
  'plages',
  'planning',
  'statuts',
  'validation'
]

/**
 * The recomputations an edit on the given sheet calls for:
 * - `personnes` feeds its own column C;
 * - `plages` feeds its own column F, the planning and, through the labels,
 *   what people were told;
 * - `engagements` feeds the planning and what people were told;
 * - `contreparties` feeds what people were told;
 * - `dates` feeds the dropdown of `plages!A`, a list of display values since
 *   a rule referencing a range of dates rejects the picked date;
 * - the other sheets feed nothing (dropdowns reference their ranges).
 */
export function stepsForSheet (sheetName: string): UpdateStep[] {
  switch (sheetName) {
    case 'personnes':
      return ['personnes']
    case 'plages':
      return ['plages', 'planning', 'statuts']
    case 'engagements':
      return ['planning', 'statuts']
    case 'contreparties':
      return ['statuts']
    case 'dates':
      return ['validation']
    default:
      return []
  }
}

type TriggerEvent =
  | GoogleAppsScript.Events.SheetsOnEdit
  | GoogleAppsScript.Events.SheetsOnChange
  | GoogleAppsScript.Events.SheetsOnOpen

/**
 * Recomputes the derived data. Without an event (manual run, onOpen),
 * everything is recomputed. For an edit, only what the edited sheet feeds.
 * An onChange of type EDIT is skipped, since the onEdit trigger already
 * handles it; other change types (rows inserted or removed…) run everything.
 *
 * Runs under the document lock: two overlapping runs would otherwise race
 * on the planning sheet (clearContent + setValues).
 */
export function updateModels (e?: TriggerEvent) {
  let steps: UpdateStep[] = ALL_STEPS
  if (e && 'changeType' in e) {
    if (e.changeType === 'EDIT' || e.changeType === 'FORMAT') return
  } else if (e && 'range' in e) {
    steps = stepsForSheet(e.range.getSheet().getName())
  }
  if (steps.length === 0) return

  const lock = LockService.getDocumentLock()
  if (!lock.tryLock(30000)) {
    console.warn('updateModels: lock not acquired within 30 s, skipping')
    return
  }
  try {
    if (steps.includes('personnes')) updatePersonnes()
    if (steps.includes('plages')) updatePlages()
    if (steps.includes('planning')) updatePlanning()
    if (steps.includes('statuts')) updateStatuts()
    if (steps.includes('validation')) updateValidation()
  } finally {
    lock.releaseLock()
  }
}
