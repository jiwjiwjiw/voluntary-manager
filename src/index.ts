import { updateModels } from './updateModels'
import {
  previewEmailDialog,
  renderEmail,
  selectEmailTemplate,
  sendEmails,
  testEmail
} from './sendEmails'
import { verifierClasseur } from './checkWorkbook'
;(global as any).onOpen = onOpen
;(global as any).verifierClasseur = verifierClasseur
;(global as any).testEmail = testEmail
;(global as any).selectEmailTemplate = selectEmailTemplate
// Called by the SelectEmailTemplate dialog through google.script.run.
;(global as any).sendEmails = sendEmails
;(global as any).previewEmailDialog = previewEmailDialog
// Called by the PreviewEmail dialog through google.script.run.
;(global as any).renderEmail = renderEmail
;(global as any).onAuthorizeScript = onAuthorizeScript
;(global as any).updateModels = updateModels

function onOpen () {
  const ui = SpreadsheetApp.getUi()
  ui.createMenu('Actions')
    .addItem('Autoriser le script', 'onAuthorizeScript')
    .addItem('Recalculer', 'updateModels')
    .addItem('Vérifier le classeur', 'verifierClasseur')
    .addItem('Envoyer les emails', 'selectEmailTemplate')
    .addItem("Aperçu d'un courriel", 'previewEmailDialog')
    .addItem('Tester les emails', 'testEmail')
    .addToUi()
}

/**
 * Installs the triggers for the current user and recomputes everything so
 * that the derived columns and dropdowns are right away in place.
 *
 * ScriptApp.getProjectTriggers() only lists the triggers of the user who
 * runs the script, so a second user clicking here installs a second set.
 * One person should authorise the script.
 */
function onAuthorizeScript () {
  installOnOpenTriggerIfInexisting()
  installOnEditTriggerIfInexisting()
  installOnChangeTriggerIfInexisting()
  updateModels()
}

function installOnEditTriggerIfInexisting () {
  if (!checkIfTriggerExists(ScriptApp.EventType.ON_EDIT, 'updateModels')) {
    ScriptApp.newTrigger('updateModels')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit()
      .create()
  }
}

function installOnOpenTriggerIfInexisting () {
  if (!checkIfTriggerExists(ScriptApp.EventType.ON_OPEN, 'updateModels')) {
    ScriptApp.newTrigger('updateModels')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onOpen()
      .create()
  }
}

function installOnChangeTriggerIfInexisting () {
  if (!checkIfTriggerExists(ScriptApp.EventType.ON_CHANGE, 'updateModels')) {
    ScriptApp.newTrigger('updateModels')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onChange()
      .create()
  }
}

function checkIfTriggerExists (
  eventType: GoogleAppsScript.Script.EventType,
  handlerFunction: string
) {
  return ScriptApp.getProjectTriggers().some(
    trigger =>
      trigger.getEventType() === eventType &&
      trigger.getHandlerFunction() === handlerFunction
  )
}
