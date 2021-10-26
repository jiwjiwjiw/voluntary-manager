<<<<<<< HEAD
function rangeIntersect(r1: GoogleAppsScript.Spreadsheet.Range, r2: GoogleAppsScript.Spreadsheet.Range): boolean {
  let sheetMatches = r1.getSheet().getName() == r2.getSheet().getName()
  let rangeIntersects = (r1.getLastRow() >= r2.getRow()) && (r2.getLastRow() >= r1.getRow()) && (r1.getLastColumn() >= r2.getColumn()) && (r2.getLastColumn() >= r1.getColumn());
  return sheetMatches && rangeIntersects
}

function rowHasContent(row: Array<string>) {
  return row.join("").length > 0
=======
function rowHasContent(row: Array<string>): boolean {
    return row.join("").length > 0
>>>>>>> e2465dcfaeef62b48decadfc9349827ed3fbcc1c
}

function rowHasContentInColumn(index: number) {
  return (row: Array<string>) => row[index].length > 0
}

function compareRowsOnColumn(index: number) {
  return (a: Array<string>, b: Array<string>) => a[index] > b[index] ? 1 : -1
}

function rowHasValue(index: number, value: string) {
  return (row: Array<string>) => row[index] === value
}

function getColumnAsRow(index: number) {
  return (row: Array<string>) => row[index]
}

function getColumn(index: number) {
  return (row: Array<string>) => [row[index]]
}

function searchReplace(oldValue: string, newValue: string) {
  return (row: Array<string>) => row.map(x => (x === oldValue) ? newValue : x)
}