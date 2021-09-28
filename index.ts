let validationHandler = new ValidationHandler
validationHandler.add(new Validation("Sujets", "B2:B", "Réunions", "A2:A"))
validationHandler.add(new Validation("Sujets", "C2:C", "Personnes", "A2:A"))
validationHandler.add(new Validation("Réunions", "D2:D", "Personnes", "A2:A"))

function onOpen() {
    let ui = SpreadsheetApp.getUi();
    ui.createMenu('Réunion')
      .addItem('Envoi ordre du jour', 'onSendAgenda')
      .addItem('Génération procès-verbal', 'onGenerateMeetingMinutes')
      .addToUi();
  }

function onEdit(e) {
    validationHandler.update(e.range)
}

function onGenerateMeetingMinutes() {
    
}

function onSendAgenda() {
    
}