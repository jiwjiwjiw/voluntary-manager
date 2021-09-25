let validationHandler: ValidationHandler

function onOpen(){

}

function onEdit(e){
    validationHandler.update(e.range)
}