const TEMPLATE_HEADERS = ['type', 'condition', 'texte']

const normalise = (value: unknown) => String(value).trim().toLowerCase()

/** The sheets of the workbook that hold an email template. */
export class EmailTemplateList {
  public list: Array<GoogleAppsScript.Spreadsheet.Sheet> = []

  constructor (private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.createList()
  }

  private createList () {
    this.spreadsheet.getSheets().forEach(sheet => {
      if (EmailTemplateList.isTemplate(sheet)) {
        this.list.push(sheet)
      }
    })
  }

  /**
   * A template sheet is recognised by its three headers « Type »,
   * « Condition », « Texte » (case and surrounding spaces ignored). The
   * number of columns does not matter: a sheet created from scratch has
   * 26 of them.
   */
  static isTemplate (sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
    if (sheet.getMaxColumns() < TEMPLATE_HEADERS.length) return false
    const headers = sheet.getRange(1, 1, 1, TEMPLATE_HEADERS.length).getValues()[0]
    return TEMPLATE_HEADERS.every(
      (header, index) => normalise(headers[index]) === header
    )
  }
}
