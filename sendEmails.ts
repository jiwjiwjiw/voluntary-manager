function selectEmailTemplate() {
  let templateList = new EmailTemplateList(SpreadsheetApp.getActive()).list
  if (templateList.length == 0) {
    SpreadsheetApp.getUi().alert("Aucun modèle de message défini!")
  }
  else if(templateList.length == 1) { 
    generateEmailTemplate(templateList[0].getName())
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
  const template = new EmailTemplate(SpreadsheetApp.getActive().getSheetByName(sheet))
  const data = collectData()
  for (const d of data) {
    const {subject, html} = template.constructHtml(d)
    console.log(html)
    const html2 = template.insertData(html, d)
    console.log(html2)
  }
}

function collectData() {
  // get data from spreadsheet
  const classeur = SpreadsheetApp.getActive()
  const personnesSheet = classeur.getSheetByName('personnes')
  const engagementsSheet = classeur.getSheetByName('engagements')
  const contrepartiesSheet = classeur.getSheetByName('contreparties')
  const fonctionsSheet = classeur.getSheetByName('fonctions')
  const personnesRange = personnesSheet.getRange('A2:F')
  const statutsRange = personnesSheet.getRange('E2:E')
  const engagementsRange = engagementsSheet.getRange('A2:B')
  const contrepartiesRange = contrepartiesSheet.getRange('A2:B')
  const fonctionsRange = fonctionsSheet.getRange('A2:B')
  const personnesData = personnesRange.getValues()
  const engagementsData = engagementsRange.getValues()
  const contrepartiesData = contrepartiesRange.getValues()
  const fonctionsData = fonctionsRange.getValues()
  const destinataires = personnesData.filter(rowHasValue(4, 'à envoyer'))
  const engagements = engagementsData.filter(rowHasContent)
  const contreparties = contrepartiesData.filter(rowHasContent)
  const fonctions = fonctionsData.filter(rowHasContent)
  const fonctionsArtiste = fonctions.filter(rowHasValue(1, 'artiste')).map(getColumnAsRow(0))
  const fonctionsBenevole = fonctions.filter(rowHasValue(1, 'bénévole')).map(getColumnAsRow(0))

  let data = []
  for (const d of destinataires) {
    const listeEngagements = engagements.filter(rowHasValue(0, d[2])).map(getColumnAsRow(1))
    const listeContreparties = contreparties.filter(rowHasValue(0, d[2])).map(getColumnAsRow(1))
    data.push({
      personData: {
        nom: d[0],
        prenom: d[1],
        email: d[3]
      },
      listeEngagements: listeEngagements,
      listeContreparties: listeContreparties,
      estArtiste: fonctionsArtiste.some(x => listeEngagements.join(',').includes(`| ${x} |`)),
      estBenevole: fonctionsBenevole.some(x => listeEngagements.join(',').includes(`| ${x} |`))
    })
  }
  return data
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
