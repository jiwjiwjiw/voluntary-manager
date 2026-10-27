/**
 * A deliberately small in-memory stand-in for the parts of the Google Sheets
 * API that the project uses, so that the sheet-bound functions can run under
 * vitest. Only the methods the code under test calls are implemented; they
 * follow the Apps Script semantics that matter here:
 *
 * - a sheet has `maxRows` rows, which is more than the rows holding data, so
 *   open-ended ranges such as `A2:F` include trailing empty rows;
 * - `getLastRow()` is the last row that has content;
 * - `setValues()` throws when the dimensions do not match the range.
 */
import { vi } from 'vitest'

export type Cell = string | number | boolean | Date | FakeRichText

export interface FakeTextStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  color?: string | null
  fontFamily?: string | null
  fontSize?: number | null
}

/** Mimics RichTextValue: a text made of runs that each carry a style and a link. */
export class FakeRichText {
  constructor (
    private text: string,
    private style: FakeTextStyle = {},
    private url: string | null = null,
    private runs: FakeRichText[] | null = null
  ) {}

  static runs (...runs: FakeRichText[]): FakeRichText {
    return new FakeRichText(runs.map(r => r.getText()).join(''), {}, null, runs)
  }

  getText () {
    return this.text
  }

  getRuns (): FakeRichText[] {
    return this.runs ?? [this]
  }

  getLinkUrl () {
    return this.url
  }

  getTextStyle () {
    const s = this.style
    return {
      isBold: () => s.bold ?? false,
      isItalic: () => s.italic ?? false,
      isUnderline: () => s.underline ?? false,
      isStrikethrough: () => s.strikethrough ?? false,
      getForegroundColor: () => s.color ?? null,
      getFontFamily: () => s.fontFamily ?? null,
      getFontSize: () => s.fontSize ?? null
    }
  }
}

function columnIndex (letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * What getDisplayValues() returns for a cell: the text shown in the sheet.
 * Dates follow the fr-CH formats a Europe/Zurich spreadsheet shows; a
 * time-only cell is a Date on 1899-12-30, as in Apps Script.
 */
function cellToString (v: Cell | undefined): string {
  if (v === undefined || v === null) return ''
  if (v instanceof FakeRichText) return v.getText()
  if (v instanceof Date) {
    if (v.getFullYear() === 1899) return `${pad(v.getHours())}:${pad(v.getMinutes())}`
    return `${pad(v.getDate())}.${pad(v.getMonth() + 1)}.${v.getFullYear()}`
  }
  return String(v)
}

export class FakeRange {
  constructor (
    private sheet: FakeSheet,
    private row: number,
    private column: number,
    private numRows: number,
    private numColumns: number
  ) {}

  getSheet () {
    return this.sheet
  }
  getRow () {
    return this.row
  }
  getColumn () {
    return this.column
  }
  getLastRow () {
    return this.row + this.numRows - 1
  }
  getLastColumn () {
    return this.column + this.numColumns - 1
  }
  getNumRows () {
    return this.numRows
  }
  getNumColumns () {
    return this.numColumns
  }

  private cell (r: number, c: number): Cell | undefined {
    return this.sheet.cells[this.row - 1 + r]?.[this.column - 1 + c]
  }

  getValues (): any[][] {
    const out: any[][] = []
    for (let r = 0; r < this.numRows; r++) {
      const line: any[] = []
      for (let c = 0; c < this.numColumns; c++) {
        const v = this.cell(r, c)
        line.push(v instanceof FakeRichText ? v.getText() : v ?? '')
      }
      out.push(line)
    }
    return out
  }

  getDisplayValues (): string[][] {
    return this.getValues().map(line => line.map(cellToString))
  }

  getValue (): any {
    return this.getValues()[0][0]
  }

  getRichTextValues (): (FakeRichText | null)[][] {
    const out: (FakeRichText | null)[][] = []
    for (let r = 0; r < this.numRows; r++) {
      const line: (FakeRichText | null)[] = []
      for (let c = 0; c < this.numColumns; c++) {
        const v = this.cell(r, c)
        line.push(
          v instanceof FakeRichText ? v : new FakeRichText(cellToString(v))
        )
      }
      out.push(line)
    }
    return out
  }

  getRichTextValue (): FakeRichText | null {
    return this.getRichTextValues()[0][0]
  }

  setValues (values: any[][]) {
    if (
      values.length !== this.numRows ||
      values.some(line => line.length !== this.numColumns)
    ) {
      throw new Error(
        `The number of rows or columns in the data does not match the range ` +
          `(${values.length}x${values[0]?.length} vs ${this.numRows}x${this.numColumns}).`
      )
    }
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) {
        this.sheet.write(this.row + r, this.column + c, values[r][c])
      }
    }
    return this
  }

  setValue (value: any) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) {
        this.sheet.write(this.row + r, this.column + c, value)
      }
    }
    return this
  }

  clearContent () {
    return this.setValue('')
  }

  setDataValidation (rule: any) {
    this.sheet.validations.push({
      row: this.row,
      column: this.column,
      numRows: this.numRows,
      numColumns: this.numColumns,
      rule
    })
    return this
  }
}

export class FakeSheet {
  /** Rows of the sheet, header included (row 1 is `cells[0]`). */
  cells: Cell[][]
  validations: Array<{
    row: number
    column: number
    numRows: number
    numColumns: number
    rule: any
  }> = []
  private maxRows: number
  private maxColumns: number

  constructor (
    private name: string,
    rows: Cell[][],
    options: { maxRows?: number; maxColumns?: number } = {}
  ) {
    this.cells = rows.map(r => [...r])
    const widest = Math.max(1, ...rows.map(r => r.length))
    // Like a real sheet, keep spare empty rows below the data.
    this.maxRows = options.maxRows ?? rows.length + 3
    this.maxColumns = options.maxColumns ?? widest
  }

  getName () {
    return this.name
  }
  getMaxRows () {
    return this.maxRows
  }
  getMaxColumns () {
    return this.maxColumns
  }

  getLastRow () {
    for (let r = this.cells.length - 1; r >= 0; r--) {
      if (this.cells[r].some(v => cellToString(v) !== '')) return r + 1
    }
    return 0
  }

  write (row: number, column: number, value: Cell) {
    while (this.cells.length < row) this.cells.push([])
    this.cells[row - 1][column - 1] = value
  }

  /** Values of one column (1-based), header excluded, trailing empties removed. */
  column (column: number): any[] {
    const out = this.getRange(2, column, this.maxRows - 1, 1)
      .getValues()
      .map(r => r[0])
    while (out.length && out[out.length - 1] === '') out.pop()
    return out
  }

  getRange (a1: string): FakeRange
  getRange (
    row: number,
    column: number,
    numRows?: number,
    numColumns?: number
  ): FakeRange
  getRange (
    a1OrRow: string | number,
    column?: number,
    numRows: number = 1,
    numColumns: number = 1
  ): FakeRange {
    if (typeof a1OrRow === 'number') {
      return new FakeRange(this, a1OrRow, column!, numRows, numColumns)
    }
    const m = /^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/.exec(a1OrRow)
    if (!m) throw new Error(`Unsupported A1 notation "${a1OrRow}"`)
    const c1 = columnIndex(m[1])
    const r1 = m[2] ? Number(m[2]) : 1
    const c2 = m[3] ? columnIndex(m[3]) : c1
    const r2 = m[4] ? Number(m[4]) : m[3] ? this.maxRows : r1
    return new FakeRange(this, r1, c1, r2 - r1 + 1, c2 - c1 + 1)
  }
}

export class FakeSpreadsheet {
  constructor (private sheets: FakeSheet[]) {}

  getSheets () {
    return this.sheets
  }

  getSheetByName (name: string): FakeSheet | null {
    return this.sheets.find(s => s.getName() === name) ?? null
  }
}

/** The `Ui` stub records alerts instead of showing them. */
export interface FakeUi {
  alerts: string[]
  alert: (message: string) => void
  showModalDialog: ReturnType<typeof vi.fn>
  createMenu: ReturnType<typeof vi.fn>
}

/**
 * Installs `SpreadsheetApp` as a global bound to the given sheets and returns
 * the pieces a test may want to inspect. Call it in every test that touches
 * the sheets; `vi.unstubAllGlobals()` in an `afterEach` keeps tests isolated.
 */
export function installSpreadsheetApp (sheets: FakeSheet[]) {
  const spreadsheet = new FakeSpreadsheet(sheets)
  const ui: FakeUi = {
    alerts: [],
    alert (message: string) {
      this.alerts.push(message)
    },
    showModalDialog: vi.fn(),
    createMenu: vi.fn()
  }
  const newDataValidation = () => {
    const rule: any = { allowInvalid: true, values: [] as string[] }
    const builder = {
      setAllowInvalid (b: boolean) {
        rule.allowInvalid = b
        return builder
      },
      requireValueInList (values: string[]) {
        rule.values = values
        return builder
      },
      build () {
        return rule
      }
    }
    return builder
  }
  vi.stubGlobal('SpreadsheetApp', {
    getActive: () => spreadsheet,
    getActiveSpreadsheet: () => spreadsheet,
    getUi: () => ui,
    newDataValidation
  })
  return { spreadsheet, ui }
}

/** Stubs MailApp: records sent mails, reports the given remaining quota. */
export function installMailApp (remainingQuota = 100) {
  const sent: any[] = []
  vi.stubGlobal('MailApp', {
    getRemainingDailyQuota: () => remainingQuota,
    sendEmail: (message: any) => {
      sent.push(message)
    }
  })
  return { sent }
}

/**
 * Stubs HtmlService: createTemplateFromFile() returns a template object whose
 * evaluate() yields a chainable output; the templates created are returned so
 * that a test can inspect the data assigned to them.
 */
export function installHtmlService () {
  const templates: Array<{ file: string; template: any }> = []
  vi.stubGlobal('HtmlService', {
    createTemplateFromFile: (file: string) => {
      const output: any = {
        setWidth: () => output,
        setHeight: () => output
      }
      const template: any = { evaluate: () => output }
      templates.push({ file, template })
      return template
    }
  })
  return { templates }
}
