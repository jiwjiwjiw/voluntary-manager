class EmailTemplate {
    private textEntries: Array<{type: string, richText: GoogleAppsScript.Spreadsheet.RichTextValue}>
    private subject : string = ''
    private html : string = ''

    constructor(private sheet: GoogleAppsScript.Spreadsheet.Sheet) {
        this.textEntries = new Array
        for (let index = 1; index < sheet.getLastRow(); index++) {
            this.textEntries.push({type:sheet.getRange(index, 1).getValue(), richText:sheet.getRange(index, 2).getRichTextValue()})
        }
        this.constructHtml()
        console.log(this.subject)
        console.log(this.html)
    }

    private constructHtml() {
        let listContext = false
        for (const entry of this.textEntries) {
            switch (entry.type) {
                case "sujet":
                    this.subject = entry.richText.getText() // no rich text handling for subject
                    break;
                case "paragraphe" :
                    this.html += listContext ? '</ul>' : ''
                    listContext = false
                    this.html += `<p>${this.richTextToHtml(entry.richText)}</p>`
                    break;
                case "titre" :
                    this.html += listContext ? '</ul>' : ''
                    listContext = false
                    this.html += `<h1>${this.richTextToHtml(entry.richText)}</h1>`
                    break;
                case "sous-titre" :
                    this.html += listContext ? '</ul>' : ''
                    listContext = false
                    this.html += `<h2>${this.richTextToHtml(entry.richText)}</h2>`
                    break;
                case "élément de liste" :
                    this.html += listContext ? '' : '<ul>'
                    listContext = true
                    this.html += `<li>${this.richTextToHtml(entry.richText)}</li>`
                    break;
                default:
                    break;
            }
        }
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