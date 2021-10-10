class Validation {

    constructor(
        readonly validatedSheetName: string,
        readonly validatedRangeName: string,
        readonly validatingSheetName: string, 
        readonly validatingRangeName: string,
        readonly additionalValidationValues: string[] = []
    ) {}

    update(modifiedRange: GoogleAppsScript.Spreadsheet.Range = undefined): void {
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
        if (!modifiedRange || rangeIntersect(modifiedRange, validatingRange)) {
            let validationValues = [].concat(...validatingRange.getDisplayValues(), ...this.additionalValidationValues)
            const rules = SpreadsheetApp.newDataValidation()
                .setAllowInvalid(false)
                .requireValueInList(validationValues)
                .build()
            validatedRange.setDataValidation(rules)
        }
    }
}