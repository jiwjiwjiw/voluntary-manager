class EmailTemplateList {
    public list: Array<GoogleAppsScript.Spreadsheet.Sheet> = new Array

    constructor(private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {
        this.createList()
    }

    private createList() {
        this.spreadsheet.getSheets().forEach(sheet => {
            if (this.isTemplate(sheet)) {
                this.list.push(sheet)
            }
        });
    }
    
    private isTemplate(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
        const maxColumnsOk = sheet.getMaxColumns() === 2
        const firstColumnNameOk = sheet.getRange(1, 1).getValue() === "Type"
        const secondColumnNameOk = sheet.getRange(1, 2).getValue() === "Condition"
        const thirdColumnNameOk = sheet.getRange(1, 3).getValue() === "Texte"
        return maxColumnsOk && firstColumnNameOk && secondColumnNameOk
    }
}