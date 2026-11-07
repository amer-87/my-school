import DataTable from './DataTable';

function StudentTable({ students, onView, onEdit, onDelete, onTransfer, searchTerm, onSearchChange }) {
  const columns = [
    { key: 'id', label: 'رقم' },
    { key: 'fullName', label: 'اسم الطالب' },
    { key: 'grade', label: 'الصف' },
    { key: 'division', label: 'الشعبة' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'status', label: 'الحالة' },
    { key: 'whatsapp', label: 'إرسال' },
    { key: 'actions', label: 'إجراءات' },
  ];

  const sendWhatsAppMsg = (student) => {
    if (!student.phone) {
      alert('رقم الهاتف غير متوفر.');
      return;
    }
    const message = `السلام عليكم، بخصوص الطالب (${student.fullName}). يرجى المتابعة معنا.`;
    const url = `https://wa.me/${student.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <DataTable
      title="قائمة الطلاب"
      subtitle="يمكنك البحث والاطلاع على بيانات كل طالب بشكل مباشر."
      columns={columns}
      rows={students}
      emptyMessage="لا توجد بيانات للطلاب حتى الآن."
      actions={
        <div style={{ position: 'relative', minWidth: '300px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            onFocus={(e) => e.target.select()}
            placeholder="🔍 البحث باسم الطالب، الصف، أو الهاتف..."
            className="search-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #2563eb',
              background: '#ffffff',
              color: '#000000',
              fontWeight: '700',
              fontSize: '15px',
              outline: 'none',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          />
        </div>
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
            <span className={`status-badge ${student.status === 'نشط' ? 'active' : (student.status === 'خريج' ? 'active' : 'inactive')}`}>
              {student.status}
            </span>
          </td>
          <td>
             <button
                type="button"
                className="btn-icon"
                onClick={() => sendWhatsAppMsg(student)}
                title="إرسال واتساب"
                style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid rgba(37, 211, 102, 0.2)' }}
              >
                📱
              </button>
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
