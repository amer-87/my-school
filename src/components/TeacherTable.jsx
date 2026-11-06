import DataTable from './DataTable';

function TeacherTable({ teachers, onView, onEdit, onDelete, searchTerm, onSearchChange }) {
  const columns = [
    { key: 'id', label: 'رقم' },
    { key: 'fullName', label: 'اسم المعلم' },
    { key: 'specialty', label: 'التخصص' },
    { key: 'subject', label: 'المادة' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'status', label: 'الحالة' },
    { key: 'actions', label: 'إجراءات' },
  ];

  return (
    <DataTable
      title="قائمة المعلمين"
      subtitle="يمكنك البحث والاطلاع على بيانات كل معلم بسهولة."
      columns={columns}
      rows={teachers}
      emptyMessage="لا توجد بيانات للمعلمين حتى الآن."
      actions={
        <input
          type="search"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="البحث باسم المعلم أو التخصص..."
          className="search-input"
        />
      }
      renderEmpty={() => (
        <div className="empty-state-card">
          <p>لا توجد بيانات للمعلمين حتى الآن.</p>
          <span>استخدم زر إضافة معلم لإدخال أول سجل.</span>
        </div>
      )}
      renderRow={(teacher) => (
        <tr key={teacher.id}>
          <td>{teacher.id}</td>
          <td>{teacher.fullName}</td>
          <td>{teacher.specialty}</td>
          <td>{teacher.subject}</td>
          <td>{teacher.phone}</td>
          <td>
            <span className={`status-badge ${teacher.status === 'نشط' ? 'active' : 'inactive'}`}>
              {teacher.status}
            </span>
          </td>
          <td>
            <div className="action-group">
              <button type="button" className="table-action view" onClick={() => onView(teacher)}>
                عرض
              </button>
              <button type="button" className="table-action edit" onClick={() => onEdit(teacher)}>
                تعديل
              </button>
              <button type="button" className="table-action delete" onClick={() => onDelete(teacher.id)}>
                حذف
              </button>
            </div>
          </td>
        </tr>
      )}
    />
  );
}

export default TeacherTable;
