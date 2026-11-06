function DataTable({ title, subtitle, columns, rows, emptyMessage, renderRow, renderEmpty, actions }) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>

      <div className="table-wrapper">
        {rows.length === 0 ? (
          renderEmpty ? renderEmpty() : <div className="empty-state-card"><p>{emptyMessage}</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>{rows.map((row) => renderRow(row))}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default DataTable;
