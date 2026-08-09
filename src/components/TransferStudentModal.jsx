import React, { useState, useMemo } from 'react';
import ModalLayout from './ModalLayout';

function TransferStudentModal({ isOpen, student, grades, divisions, onClose, onConfirm }) {
  const [selectedGradeId, setSelectedGradeId] = useState(student?.gradeId || '');
  const [selectedDivisionId, setSelectedDivisionId] = useState(student?.divisionId || '');

  const availableDivisions = useMemo(() => {
    return divisions.filter(d => d.gradeId === Number(selectedGradeId));
  }, [divisions, selectedGradeId]);

  if (!isOpen || !student) return null;

  const handleConfirm = () => {
    const grade = grades.find(g => g.id === Number(selectedGradeId));
    const division = divisions.find(d => d.id === Number(selectedDivisionId));

    if (!grade || !division) {
      alert('يرجى اختيار الصف والشعبة بشكل صحيح');
      return;
    }

    onConfirm(student.id, {
      gradeId: grade.id,
      grade: grade.name,
      divisionId: division.id,
      division: division.name
    });
  };

  return (
    <ModalLayout title="نقل الطالب" isOpen={isOpen} onClose={onClose}>
      <div className="transfer-modal-body">
        <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0', color: '#64748b', fontSize: '13px' }}>الطالب المراد نقله:</p>
          <h3 style={{ margin: '4px 0 0', color: '#1e293b' }}>{student.fullName}</h3>
          <p style={{ margin: '4px 0 0', fontSize: '14px' }}>
            الشعبة الحالية: <span style={{ fontWeight: '600' }}>{student.grade} - {student.division}</span>
          </p>
        </div>

        <div className="form-grid">
          <label>
            الصف الجديد
            <select
              value={selectedGradeId}
              onChange={(e) => {
                setSelectedGradeId(e.target.value);
                setSelectedDivisionId('');
              }}
            >
              <option value="">اختر الصف...</option>
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>

          <label>
            الشعبة الجديدة
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              disabled={!selectedGradeId}
            >
              <option value="">اختر الشعبة...</option>
              {availableDivisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn btn-primary" onClick={handleConfirm} style={{ background: '#8b5cf6' }}>
            تأكيد النقل
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </ModalLayout>
  );
}

export default TransferStudentModal;
