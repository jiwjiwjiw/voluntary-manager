import { ConfirmationEmailTemplateParams } from './ConfirmationEmailTemplateParams'
import { EmailTemplate } from './sheets-tools/EmailTemplate'
import { Validation } from './sheets-tools/Validation'
import { ValidationHandler } from './sheets-tools/ValidationHandler'
import { updatePersonnes } from './updatePersonnes'
import { updatePlages } from './updatePlages'
import { updatePlanning } from './updatePlanning'
import { testEmail, selectEmailTemplate } from './sendEmails'
;(global as any).onOpen = onOpen
;(global as any).testEmail = testEmail
;(global as any).selectEmailTemplate = selectEmailTemplate
;(global as any).onAuthorizeScript = onAuthorizeScript
;(global as any).updateModels = updateModels

function updateValidation (
  modifiedRange: GoogleAppsScript.Spreadsheet.Range | undefined = undefined
) {
  let validationHandler = ValidationHandler.getInstance()
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
    new Validation('personnes', 'E2:E', '', '', false, [
      'à envoyer',
      'envoyé',
      'réception confirmée'
    ])
  )
  new EmailTemplate(new ConfirmationEmailTemplateParams()).addValidation()
  validationHandler.update(modifiedRange)
}

function onOpen () {
  let ui = SpreadsheetApp.getUi()
  ui.createMenu('Actions')
    .addItem('Autoriser le script', 'onAuthorizeScript')
    .addItem('Envoyer les emails', 'selectEmailTemplate')
    .addItem('Tester les emails', 'testEmail')
    .addToUi()
}

function updateModels () {
  updatePersonnes()
  updatePlages()
  updatePlanning()
  updateValidation()
}

function onAuthorizeScript () {
  installOnOpenTriggerIfInexisting()
  installOnEditTriggerIfInexisting()
  installOnChangeTriggerIfInexisting()
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
  const triggers = ScriptApp.getProjectTriggers()
  let triggerExists = false
  triggers.forEach(function (trigger) {
    if (
      trigger.getEventType() === eventType &&
      trigger.getHandlerFunction() === handlerFunction
    )
      triggerExists = true
  })
  return triggerExists
}
