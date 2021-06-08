class EmailTemplate {
    private textEntries: Array<[string, GoogleAppsScript.Spreadsheet.RichTextValue]>

    constructor(private sheet: GoogleAppsScript.Spreadsheet.Sheet) {
        this.textEntries = new Array
    }
}