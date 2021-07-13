function onEdit() {
  updatePersonnes()
  updatePlages()
  updatePlanning()
}

function onOpen() {
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('Email')
    .addItem('Envoi emails', 'sendEmails')
    .addItem('Tester email', 'sendEmails')
    .addItem('Envoi emails (new)', 'selectEmailTemplate')
    .addToUi();
}
