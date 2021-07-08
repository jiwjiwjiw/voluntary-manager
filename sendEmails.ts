function selectEmailTemplate() {
  let templateList = new EmailTemplateList(SpreadsheetApp.getActive()).list
  if (templateList.length == 0) {
    SpreadsheetApp.getUi().alert("Aucun modèle de message défini!")
  }
  else {
    let htmlTemplate = HtmlService.createTemplateFromFile('SelectEmailTemplate')
    htmlTemplate.templateNames = templateList.map(x => x.getName())
    let html = htmlTemplate
      .evaluate()
      .setWidth(250)
      .setHeight(40)
    SpreadsheetApp.getUi().showModalDialog(html, 'Choisir un modèle de courriel')
  }
}

function generateEmailTemplate(sheet:string) {
  let template = new EmailTemplate(SpreadsheetApp.getActive().getSheetByName(sheet))
}

function sendEmails() {
  // get data from spreadsheet
  let classeur = SpreadsheetApp.getActive()
  let personnesSheet = classeur.getSheetByName('personnes')
  let engagementsSheet = classeur.getSheetByName('engagements')
  let contrepartiesSheet = classeur.getSheetByName('contreparties')
  let personnesRange = personnesSheet.getRange('A2:F')
  let statutsRange = personnesSheet.getRange('E2:E')
  let engagementsRange = engagementsSheet.getRange('A2:B')
  let contrepartiesRange = contrepartiesSheet.getRange('A2:B')
  let personnesData = personnesRange.getValues()
  let engagementsData = engagementsRange.getValues()
  let contrepartiesData = contrepartiesRange.getValues()
  let destinataires = personnesData.filter(rowHasValue(4, 'à envoyer'))
  let engagements = engagementsData.filter(rowHasContent)
  let contreparties = contrepartiesData.filter(rowHasContent)
  
  // check if there are mails to send
  if(destinataires.length === 0) {
    SpreadsheetApp.getUi().alert("Aucun mail à envoyer!")
    return
  }
  
  // check if mail quota is sufficient
  if(MailApp.getRemainingDailyQuota() < destinataires.length) {
    SpreadsheetApp.getUi().alert("Envoi impossible, quota d'envoi journalier dépassé!")
    return
  }
  
  // send emails
  let destinatairesSansEngagements = []
  let mailsEnvoyes = 0
  for(let d of destinataires) {
    let template = HtmlService.createTemplateFromFile('emailTemplate')
    let listeEngagements = engagements
    .filter(rowHasValue(0, d[2]))
    .map(getColumnAsRow(1))
    let listeContreparties = contreparties
    .filter(rowHasValue(0, d[2]))
    .map(getColumnAsRow(1))
    template.personne = {
      prenom: d[1],
      engagements: listeEngagements,
      codes: listeContreparties
    }
    if(listeEngagements.length > 0) {
      let message = template.evaluate().getContent()
      MailApp.sendEmail({
        to: d[3],
        subject: "Confirmation participation",
        htmlBody: message
      })   
      mailsEnvoyes++ 
    } else {
      destinatairesSansEngagements.push(d[2])
    }
  }
  
  // update mail delivery status in spreadsheet  
  for (let i in personnesData) {
    if (personnesData[i][4] === 'à envoyer') {
      let ignore = false
      for(let j in destinatairesSansEngagements) {
        if (personnesData[i][2] === destinatairesSansEngagements[j]) {
          ignore = true
        }
      }
      if (!ignore) {
        personnesData[i][4] = 'envoyé'        
      }
    }
  }
  let statuts = personnesData
  .map(getColumn(4))
  statutsRange.setValues(statuts)
  
  // confirm mails are sent
  var htmlOutput = HtmlService.createTemplateFromFile('emailReportTemplate')
  htmlOutput.report = {
    envoyes: mailsEnvoyes,
    nonEnvoyes: destinatairesSansEngagements
  }
  let emailReport = htmlOutput.evaluate()
  SpreadsheetApp.getUi().showModalDialog(emailReport, "Rapport d'envoi");
}
