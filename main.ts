function updateSheets() {
  updatePersonnes()
  updatePlages()
  updatePlanning()
}

function loadMenu() 
{
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('Email')
    .addItem('Envoi emails', 'sendEmails')
    .addItem('Tester email', 'sendEmails')
    .addItem('Envoi emails (new)', 'selectEmailTemplate')
    .addToUi();
}

function test(){
  let templateList = new EmailTemplateList(SpreadsheetApp.getActive()).list
  for (const template of templateList) {
    console.log(template.getName())
  }
}