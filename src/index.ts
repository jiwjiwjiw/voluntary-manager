import { ConfirmationEmailTemplateParams } from './ConfirmationEmailTemplateParams'
import { EmailTemplate } from './sheets-tools/EmailTemplate'
import { Validation } from './sheets-tools/Validation'
import { ValidationHandler } from './sheets-tools/ValidationHandler'
import { updatePersonnes } from './updatePersonnes'
import { updatePlages } from './updatePlages'
import { updatePlanning } from './updatePlanning'
import { testEmail, selectEmailTemplate } from './sendEmails'
;(global as any).onOpen = onOpen
;(global as any).onEdit = onEdit
;(global as any).testEmail = testEmail
;(global as any).selectEmailTemplate = selectEmailTemplate

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

function onEdit (e: any) {
  updatePersonnes()
  updatePlages()
  updatePlanning()
  updateValidation(e.range)
}

function onOpen () {
  updateValidation()
  let ui = SpreadsheetApp.getUi()
  ui.createMenu('Email')
    .addItem('Envoi emails', 'selectEmailTemplate')
    .addItem('Test email', 'testEmail')
    .addToUi()
}
