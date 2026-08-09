import DataTable from './DataTable';

function StudentTable({ students, onView, onEdit, onDelete, onTransfer, searchTerm, onSearchChange }) {
  const columns = [
    { key: 'id', label: 'رقم' },
    { key: 'fullName', label: 'اسم الطالب' },
    { key: 'grade', label: 'الصف' },
    { key: 'division', label: 'الشعبة' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'status', label: 'الحالة' },
    { key: 'actions', label: 'إجراءات' },
  ];

  return (
    <DataTable
      title="قائمة الطلاب"
      subtitle="يمكنك البحث والاطلاع على بيانات كل طالب بشكل مباشر."
      columns={columns}
      rows={students}
      emptyMessage="لا توجد بيانات للطلاب حتى الآن."
      actions={
        <input
          type="search"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="البحث باسم الطالب أو الصف..."
          className="search-input"
        />
      }
      renderEmpty={() => (
        <div className="empty-state-card">
          <p>لا توجد بيانات للطلاب حتى الآن.</p>
          <span>استخدم زر إضافة طالب لإدخال أول سجل.</span>
        </div>
      )}
      renderRow={(student, index) => (
        <tr key={student.id}>
          <td>{index + 1}</td>
          <td
            style={{ fontWeight: '600', cursor: 'pointer', color: '#2563eb' }}
            onClick={() => onView(student)}
          >
            {student.fullName}
          </td>
          <td>{student.grade}</td>
          <td>{student.division}</td>
          <td>{student.phone}</td>
          <td>
            <span className={`status-badge ${student.status === 'نشط' ? 'active' : 'inactive'}`}>
              {student.status}
            </span>
          </td>
          <td>
            <div className="action-group">
              <button type="button" className="table-action view" onClick={() => onView(student)}>
                عرض
              </button>
              <button type="button" className="table-action edit" style={{ background: '#8b5cf6', color: 'white' }} onClick={() => onTransfer(student)}>
                نقل
              </button>
              <button type="button" className="table-action edit" onClick={() => onEdit(student)}>
                تعديل
              </button>
              <button type="button" className="table-action delete" onClick={() => onDelete(student.id)}>
                حذف
              </button>
            </div>
          </td>
        </tr>
      )}
    />
  );
}

export default StudentTable;
