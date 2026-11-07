function ClassTable({ title, items, onEdit, onDelete, onSelect, onView, selectedId, emptyMessage }) {
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
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect && onSelect(item.id)}
                  className={selectedId === item.id ? 'selected-row clickable-row' : 'clickable-row'}
                >
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.level || item.gradeName || ''}</td>
                  <td>
                    <div className="action-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                          {item.studentCount || 0} طالب
                        </span>
                        {onView && (
                          <button
                            type="button"
                            className="table-action view"
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(item);
                            }}
                          >
                            عرض
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className="table-action edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="table-action delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                      >
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
