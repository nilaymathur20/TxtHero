"use client";

function cellAddress(row, column) {
  let letters = "";
  let value = column;
  while (value > 0) {
    value -= 1;
    letters = String.fromCharCode(65 + (value % 26)) + letters;
    value = Math.floor(value / 26);
  }
  return `${letters}${row}`;
}

export default function SpreadsheetEditor({ model, onChange }) {
  const updateCell = (sheetIndex, address, value) => {
    const next = structuredClone(model);
    const sheet = next.data[sheetIndex];
    const cell = sheet.cells.find((item) => item.address === address);
    if (cell) cell.value = value;
    else sheet.cells.push({ address, value, formula: null });
    onChange(next);
  };

  return (
    <div className="sheet-editor">
      {model.data.map((sheet, sheetIndex) => {
        const values = new Map(sheet.cells.map((cell) => [cell.address, cell.value]));
        const rows = Math.max(sheet.rowCount, 20);
        const columns = Math.max(sheet.columnCount, 10);
        return (
          <section key={sheet.name}>
            <h3>{sheet.name}</h3>
            <table>
              <thead>
                <tr><th aria-label="Row" />{Array.from({ length: columns }, (_, index) => <th key={index}>{cellAddress(1, index + 1).replace("1", "")}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    <th>{rowIndex + 1}</th>
                    {Array.from({ length: columns }, (_, columnIndex) => {
                      const address = cellAddress(rowIndex + 1, columnIndex + 1);
                      return (
                        <td key={address}>
                          <input
                            aria-label={`${sheet.name} ${address}`}
                            value={values.get(address) ?? ""}
                            onChange={(event) => updateCell(sheetIndex, address, event.target.value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
