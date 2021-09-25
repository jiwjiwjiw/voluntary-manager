function rangeIntersect(r1: Range, r2: Range): boolean {
    return (r1.getLastRow() >= r2.getRow()) && (r2.getLastRow() >= r1.getRow()) && (r1.getLastColumn() >= r2.getColumn()) && (r2.getLastColumn() >= r1.getColumn());
}