let validationHandler = new ValidationHandler
validationHandler.add(new Validation('Sujets', 'B2:B', 'Réunions', 'A2:A', ['à planifier']))
validationHandler.add(new Validation('Sujets', 'C2:C', 'Personnes', 'A2:A'))
validationHandler.add(new Validation('Réunions', 'D2:D', 'Personnes', 'A2:A'))

function onOpen() {
    let ui = SpreadsheetApp.getUi();
    ui.createMenu('Réunion')
      .addItem('Envoi ordre du jour', 'onSendMeetingAgenda')
      .addItem('Génération procès-verbal', 'onGenerateMeetingMinutes')
      .addToUi();
    validationHandler.update()
    }

function onEdit(e) {
    validationHandler.update(e.range)
}

function onGenerateMeetingMinutes() {
    
}

function onSendMeetingAgenda() {
  const sheetName = SpreadsheetApp.getActiveSheet().getSheetName()
  const currentRow = SpreadsheetApp.getCurrentCell().getRow()
  let date = ''
  if(sheetName === 'Réunions') {
    date = SpreadsheetApp.getActiveSheet().getRange('A' + currentRow).getValue()
  } else if(sheetName === 'Sujets') {
    date = SpreadsheetApp.getActiveSheet().getRange('B' + currentRow).getValue()
  } else{
      SpreadsheetApp.getUi().alert('Pour envoyer un ordre du jour, une ligne contenant la date de la réunion concernée doit être sélectionnée!')
      return
  }

}

function test() {
  const parser = new Parser
  parser.parse()
  console.log(parser)
}