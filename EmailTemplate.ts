class EmailTemplate {
    private textEntries: Array<{type: string, richText: GoogleAppsScript.Spreadsheet.RichTextValue, condition: string}>
    private subject : string = ''
    private html : string = ''

    constructor(private sheet: GoogleAppsScript.Spreadsheet.Sheet) {
        this.textEntries = new Array
        for (let index = 2; index < sheet.getLastRow(); index++) {
            this.textEntries.push({
                type: sheet.getRange(index, 1).getValue(),
                condition: sheet.getRange(index, 2).getValue(),
                richText:sheet.getRange(index, 3).getRichTextValue()
            })
        }
    }

    public constructHtml(data) {
        let html = ''
        let subject = ''
        let listContext = false
        for (const entry of this.textEntries) {
            const conditionOk = this.evaluateCondition(entry.condition, data)
            switch (entry.type) {
                case "sujet":
                    subject = entry.richText.getText() // no rich text handling for subject
                    break;
                case "aucun":
                    html += listContext ? '</ul>' : ''
                    listContext = false
                    html += entry.richText.getText()
                    break;
                case "paragraphe" :
                    html += listContext ? '</ul>' : ''
                    listContext = false
                    if (conditionOk) html += `<p>${this.richTextToHtml(entry.richText)}</p>`
                    break;
                case "titre" :
                    html += listContext ? '</ul>' : ''
                    listContext = false
                    if (conditionOk) html += `<h1>${this.richTextToHtml(entry.richText)}</h1>`
                    break;
                case "sous-titre" :
                    html += listContext ? '</ul>' : ''
                    listContext = false
                    if (conditionOk) html += `<h2>${this.richTextToHtml(entry.richText)}</h2>`
                    break;
                case "élément de liste" :
                    if (conditionOk) {
                        html += listContext ? '' : '<ul>'
                        listContext = true
                        html += `<li>${this.richTextToHtml(entry.richText)}</li>`                        
                    }
                    break;
                default:
                    break;
            }
        }
        return {subject, html}
    }

    public insertData(html: string, data) {
        html = html.replaceAll('%PRENOM%', data.personData.prenom)
        html = html.replaceAll('%NOM%', data.personData.nom)
        html = html.replaceAll('%EMAIL%', data.personData.email)
        html = html.replaceAll('%LISTE_ENGAGEMENTS%', `<ul>${data.listeEngagements.map(x => `<li>${x}</li>`).join('')}</ul>`)
        html = html.replaceAll('%LISTE_CODES%', `<ul>${data.listeContreparties.map(x => `<li>${x}</li>`).join('')}</ul>`)
        return html
    }

    private evaluateCondition(condition: string, data: any) {
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

    private richTextToHtml(richText: GoogleAppsScript.Spreadsheet.RichTextValue) : string {
        const getRunAsHtml = (richTextRun) => {
          const richText = richTextRun.getText();
      
          // Returns the rendered style of text in a cell.
          const style = richTextRun.getTextStyle();
      
          // Returns the link URL, or null if there is no link
          // or if there are multiple different links.
          const url = richTextRun.getLinkUrl();
      
          const styles = {
            color: style.getForegroundColor(),
            'font-family': style.getFontFamily(),
            'font-size': `${style.getFontSize()}pt`,
            'font-weight': style.isBold() ? 'bold' : '',
            'font-style': style.isItalic() ? 'italic' : '',
            'text-decoration': style.isUnderline() ? 'underline' : '',
          };
      
          // Gets whether or not the cell has strike-through.
          if (style.isStrikethrough()) {
            styles['text-decoration'] = `${styles['text-decoration']} line-through`;
          }
      
          const css = Object.keys(styles)
            .filter((attr) => styles[attr])
            .map((attr) => [attr, styles[attr]].join(':'))
            .join(';');
      
          const styledText = `<span style='${css}'>${richText}</span>`;
          return url ? `<a href='${url}'>${styledText}</a>` : styledText;
        };
      
        /* Returns the Rich Text string split into an array of runs,
        wherein each run is the longest possible
        substring having a consistent text style. */
        const runs = richText.getRuns();
      
        return runs.map((run) => getRunAsHtml(run)).join('');
      };
}