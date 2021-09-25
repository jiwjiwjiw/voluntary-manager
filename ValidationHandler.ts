class ValidationHandler {
    validations: Validation[]

    add(validation: Validation) {
        this.validations.push(validation)
    }

    update(modifiedRange: GoogleAppsScript.Spreadsheet.Range) : void {
        for(let validation of this.validations) {
            validation.update(modifiedRange)
        }
    }
}