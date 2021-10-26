function updateValidation() {
  let validationHandler = new ValidationHandler
  validationHandler.add(new Validation('contreparties', 'A2:A', 'personnes', 'C2:C'))
  validationHandler.add(new Validation('plages', 'A2:A', 'dates', 'A2:A'))
  validationHandler.add(new Validation('plages', 'B2:B', 'fonctions', 'A2:A'))
  validationHandler.add(new Validation('engagements', 'A2:A', 'personnes', 'C2:C'))
  validationHandler.add(new Validation('engagements', 'B2:B', 'plages', 'F2:F'))
  validationHandler.update()
}

function onEdit(e) {
  updatePersonnes()
  updatePlages()
  updatePlanning()
  updateValidation()
}

function onOpen() {
  updateValidation()
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('Email')
    .addItem('Envoi emails', 'selectEmailTemplate')
    .addItem('Test email', 'testEmail')
    .addToUi();
}
