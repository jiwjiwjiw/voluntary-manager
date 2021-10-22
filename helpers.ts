function rowHasContent(row: Array<string>): boolean {
    return row.join("").length > 0
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