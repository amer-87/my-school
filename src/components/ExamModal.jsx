import { examSubjects } from '../services/examService';

function ExamModal({ isOpen, mode, formData, onChange, onClose, onSubmit, errorMessage, grades, divisions }) {
  if (!isOpen) return null;

  const availableDivisions = divisions.filter((division) => division.gradeId === Number(formData.gradeId));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{mode === 'edit' ? 'تعديل امتحان' : 'إضافة امتحان'}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <div className="form-grid">
            <label>
              اسم الامتحان
              <input name="name" value={formData.name} onChange={onChange} required />
            </label>
            <label>
              المادة
              <select name="subject" value={formData.subject} onChange={onChange} required>
                {examSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الصف
              <select name="gradeId" value={formData.gradeId} onChange={onChange} required>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الشعبة
              <select name="divisionId" value={formData.divisionId} onChange={onChange} required>
                {availableDivisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              التاريخ
              <input type="date" name="examDate" value={formData.examDate} onChange={onChange} required />
            </label>
            <label>
              الدرجة النهائية
              <input type="number" name="totalScore" value={formData.totalScore} onChange={onChange} required min="1" />
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              حفظ
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExamModal;
