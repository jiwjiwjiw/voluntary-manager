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

    update(modifiedRange: Range) : void {
        if(true)
        {
            const validatedSheet = SpreadsheetApp.getActive().getSheetByName(this.validatedSheetName)
            if(!validatedSheet) {
            SpreadsheetApp.getUi().alert(`Tentative d'accès à la feuille inexistante "${this.validatedSheetName}"`)
            return
            } 
            const validationSheet = SpreadsheetApp.getActive().getSheetByName(this.validatingSheetName)
            if(!validationSheet) {
            SpreadsheetApp.getUi().alert(`Tentative d'accès à la feuille inexistante "${this.validatingSheetName}"`)
            return
            } 
            let validatedRange = validatedSheet.getRange(this.validatedRangeName)
            const validatingRange = validationSheet.getRange(this.validatingRangeName)
            let rules = SpreadsheetApp.newDataValidation()
                .setAllowInvalid(false)
                .requireValueInRange(validatingRange)
                .build()
            validatedRange.setDataValidation(rules)
        }
    }
}