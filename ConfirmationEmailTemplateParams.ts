class ConfirmationEmailTemplateParams implements EmailTemplateParams {
    sheetName = 'modèle courriel'
    conditions = [
        'a au moins un code',
        'est artiste',
        'est bénévole',
        'est artiste et a au moins un code',
        'est bénévole et a au moins un code'
    ]
    
    insertData(html: string, data: any): string {
        html = html.replaceAll('%PRENOM%', data.personData.prenom)
        html = html.replaceAll('%NOM%', data.personData.nom)
        html = html.replaceAll('%EMAIL%', data.personData.email)
        html = html.replaceAll('%LISTE_ENGAGEMENTS%', `<ul>${data.listeEngagements.map(x => `<li>${x}</li>`).join('')}</ul>`)
        html = html.replaceAll('%LISTE_CONTREPARTIES%', `<ul>${data.listeContreparties.map(x => `<li>${x}</li>`).join('')}</ul>`)
        return html
    }

    evaluateCondition(condition: string, data: any): boolean {
        let conditionOk = true
        switch (condition) {
            case 'a au moins un code':
                conditionOk = data.listeContreparties.length > 0
                break
            case 'est artiste':
                conditionOk = data.estArtiste
                break
            case 'est bénévole':
                conditionOk = data.estBenevole
                break
            case 'est artiste et a au moins un code':
                conditionOk = data.estArtiste && data.listeContreparties.length > 0
                break
            case 'est bénévole et a au moins un code':
                conditionOk = data.estBenevole && data.listeContreparties.length > 0
                break
            default:
                break
        }
        return conditionOk
    }
}