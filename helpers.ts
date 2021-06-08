function rowHasContent(row: Array<String>) {
    return row.join("").length > 0
}

function rowHasContentInColumn(index: number) {
  return (row: Array<String>) => row[index].length > 0
}

function compareRowsOnColumn(index: number) {
  return (a: Array<String>, b: Array<String>) => a[index] > b[index] ? 1 : -1
}

function rowHasValue(index: number, value: string) {
  return (row: Array<String>) => row[index] === value
}

function getColumnAsRow(index: number) {
  return (row: Array<String>) => row[index]
}

function getColumn(index: number) {
  return (row: Array<String>) => [row[index]]
}

function searchReplace(oldValue: String, newValue: String) {
  return (row: Array<String>) => row.map(x => (x === oldValue) ? newValue : x)
}