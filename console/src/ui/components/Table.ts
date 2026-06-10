export function printTable(headers: string[], rows: string[][]): void {
  const columnWidths = headers.map((header, index) => {
    const rowValues = rows.map((row) => row[index] ?? '');
    return Math.max(header.length, ...rowValues.map((value) => value.length));
  });

  const headerLine = headers
    .map((header, index) => padRight(header, columnWidths[index]))
    .join('  ');
  console.log(headerLine);
  console.log(columnWidths.map((width) => '─'.repeat(width)).join('  '));

  for (const row of rows) {
    console.log(row.map((cell, index) => padRight(cell ?? '', columnWidths[index])).join('  '));
  }
}

function padRight(value: string, width: number): string {
  return value.padEnd(width, ' ');
}
