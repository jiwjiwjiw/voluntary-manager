class ValidationHandler {
    validations: Array<Validation>

    add(validation: Validation) {
        this.validations.push(validation)
    }

    update(modifiedRange: Range) : void {
        for(let validation in this.validations) {
            validation.update(modifiedRange)
        }
    }
}