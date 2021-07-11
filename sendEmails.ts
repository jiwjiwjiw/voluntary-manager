function selectEmailTemplate() {
  let templateList = new EmailTemplateList(SpreadsheetApp.getActive()).list
  if (templateList.length == 0) {
    SpreadsheetApp.getUi().alert("Aucun modèle de message défini!")
  }
  else if(templateList.length == 1) { 
    sendEmails(templateList[0].getName())
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

function sendEmails(sheet:string) {
  const data = collectData()
  // check if there are mails to send
  if(data.length === 0) {
    SpreadsheetApp.getUi().alert("Aucun mail à envoyer!")
    return
  }
  
  // check if mail quota is sufficient
  if(MailApp.getRemainingDailyQuota() < data.length) {
    SpreadsheetApp.getUi().alert("Envoi impossible, quota d'envoi journalier dépassé!")
    return
  }

  const template = new EmailTemplate(SpreadsheetApp.getActive().getSheetByName(sheet))
  let destinatairesSansEngagements = []
  let mailsEnvoyes = 0
  for (const d of data) {
    const {subject, html} = template.constructHtml(d)
    const html2 = template.insertData(html, d)

      if (d.listeEngagements.length > 0) {
      MailApp.sendEmail({
        to: d.personData.email,
        subject: subject,
        htmlBody: html2
      })
      mailsEnvoyes++
      UpdateSendStatus(d.personData.nom, d.personData.prenom, 'envoyé')
    }
    else {
      destinatairesSansEngagements.push(d)
    }
  }

  // confirm mails are sent
  var htmlOutput = HtmlService.createTemplateFromFile('emailReportTemplate')
  htmlOutput.report = {
    envoyes: mailsEnvoyes,
    nonEnvoyes: destinatairesSansEngagements
  }
  let emailReport = htmlOutput.evaluate()
  SpreadsheetApp.getUi().showModalDialog(emailReport, "Rapport d'envoi");
}

function collectData() {
  // get data from spreadsheet
  const classeur = SpreadsheetApp.getActive()
  const personnesSheet = classeur.getSheetByName('personnes')
  const personnesRange = personnesSheet.getRange('A2:F')
  const personnesData = personnesRange.getValues()
  const destinataires = personnesData.filter(rowHasValue(4, 'à envoyer'))
  const engagementsSheet = classeur.getSheetByName('engagements')
  const engagementsRange = engagementsSheet.getRange('A2:B')
  const engagementsData = engagementsRange.getValues()
  const engagements = engagementsData.filter(rowHasContent)
  const contrepartiesSheet = classeur.getSheetByName('contreparties')
  const contrepartiesRange = contrepartiesSheet.getRange('A2:B')
  const contrepartiesData = contrepartiesRange.getValues()
  const contreparties = contrepartiesData.filter(rowHasContent)
  const fonctionsSheet = classeur.getSheetByName('fonctions')
  const fonctionsRange = fonctionsSheet.getRange('A2:B')
  const fonctionsData = fonctionsRange.getValues()
  const fonctions = fonctionsData.filter(rowHasContent)
  const fonctionsArtiste = fonctions.filter(rowHasValue(1, 'artiste')).map(getColumnAsRow(0))
  const fonctionsBenevole = fonctions.filter(rowHasValue(1, 'bénévole')).map(getColumnAsRow(0))
  const statutsRange = personnesSheet.getRange('E2:E')

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
      estArtiste: fonctionsArtiste.some(x => listeEngagements.join(',').includes(x)),
      estBenevole: fonctionsBenevole.some(x => listeEngagements.join(',').includes(x))
    })
  }
  return data
}

function UpdateSendStatus(nom: string, prenom: string, status: string) {
  // get data from spreadsheet
  const personnesSheet = SpreadsheetApp
    .getActive()
    .getSheetByName('personnes')
  const personnesRange = personnesSheet
    .getRange('A2:F')
  const index = personnesRange
    .getValues()
    .findIndex(x => x[0] === nom && x[1] === prenom)
  personnesSheet
    .getRange(index + 2 , 5 ,1 ,1) // increment index by 2, to take into account the different indexing (0-based for findIndex, 1-based for getRange) and the headings not included in personneRange
    .setValue(status)
}

