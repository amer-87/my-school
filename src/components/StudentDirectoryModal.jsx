import { useState, useMemo } from 'react';
import ModalLayout from './ModalLayout';
import StudentTable from './StudentTable';

function StudentDirectoryModal({ isOpen, students, title = "دليل الطلاب الشامل", onClose, onView, onEdit, onDelete, onTransfer }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter(s => {
      const haystack = `${s.fullName} ${s.grade} ${s.division} ${s.phone}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [students, searchTerm]);

  if (!isOpen) return null;

  return (
    <ModalLayout title={title} isOpen={isOpen} onClose={onClose} className="large">
      <div className="directory-modal-content">
        <StudentTable
          students={filtered}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onTransfer={onTransfer}
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
        />

        <div style={{ marginTop: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '14px' }}>
          إجمالي النتائج: {filtered.length} من {students.length} طالب
        </div>
      </div>
    </ModalLayout>
  );
}

export default StudentDirectoryModal;
