class Validation {
    readonly validatedSheetName: string = ""
    readonly validatedRangeName: string = ""
    readonly validatingSheetName: string = ""
    readonly validatingRangeName: string = ""

    constructor(validatedSheetName: string, validatedRangeName: string, validatingSheetName: string, validatingRangeName: string) {
        this.validatedSheetName = validatedSheetName
        this.validatedRangeName = validatedRangeName
        this.validatingSheetName = validatingSheetName
        this.validatingRangeName = validatingRangeName
    }

    update(modifiedRange: GoogleAppsScript.Spreadsheet.Range): void {
        const validatedSheet = SpreadsheetApp.getActive().getSheetByName(this.validatedSheetName)
        if (!validatedSheet) {
            SpreadsheetApp.getUi().alert(`Tentative d'accès à la feuille inexistante "${this.validatedSheetName}"`)
            return
        }
        const validatingSheet = SpreadsheetApp.getActive().getSheetByName(this.validatingSheetName)
        if (!validatingSheet) {
            SpreadsheetApp.getUi().alert(`Tentative d'accès à la feuille inexistante "${this.validatingSheetName}"`)
            return
        }
        const validatedRange = validatedSheet.getRange(this.validatedRangeName)
        const validatingRange = validatingSheet.getRange(this.validatingRangeName)
        if (rangeIntersect(modifiedRange, validatingRange)) {
            const rules = SpreadsheetApp.newDataValidation()
                .setAllowInvalid(false)
                .requireValueInRange(validatingRange)
                .build()
            validatedRange.setDataValidation(rules)
        }
    }
}