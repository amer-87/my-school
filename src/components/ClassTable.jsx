function ClassTable({ title, items, onEdit, onDelete, emptyMessage }) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div>
          <h3>{title}</h3>
          <p>إدارة البيانات المرتبطة بالصفوف والشعب بسهولة.</p>
        </div>
      </div>

      <div className="table-wrapper">
        {items.length === 0 ? (
          <div className="empty-state-card">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>رقم</th>
                <th>الاسم</th>
                <th>الصف/المرحلة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.level || item.gradeName || ''}</td>
                  <td>
                    <div className="action-group">
                      <button type="button" className="table-action edit" onClick={() => onEdit(item)}>
                        تعديل
                      </button>
                      <button type="button" className="table-action delete" onClick={() => onDelete(item.id)}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default ClassTable;
