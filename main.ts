function onEdit() {
  updatePersonnes()
  updatePlages()
  updatePlanning()
  updateEngagements()
  updateContreparties()
}

function onOpen() {
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('Email')
    .addItem('Envoi emails', 'selectEmailTemplate')
    .addItem('Test email', 'testEmail')
    .addToUi();
}
