import { examSubjects } from '../services/examService';
import DatePicker from './DatePicker';

function ExamModal({ isOpen, mode, formData, onChange, onClose, onSubmit, errorMessage, grades, divisions, isLocked }) {
  if (!isOpen) return null;

  const availableDivisions = divisions.filter((division) => division.gradeId === Number(formData.gradeId));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{mode === 'edit' ? 'تعديل بيانات الامتحان' : 'إضافة امتحان جديد'}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <div className="form-grid">
            <label>
              المادة الدراسية
              <select name="subject" value={formData.subject} onChange={onChange} required>
                {examSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الصف الدراسي
              <select name="gradeId" value={formData.gradeId} onChange={onChange} required disabled={isLocked}>
                <option value="">اختر الصف...</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الشعبة
              <select name="divisionId" value={formData.divisionId} onChange={onChange} required disabled={isLocked}>
                <option value="">اختر الشعبة...</option>
                {availableDivisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الفترة (الشهر / الامتحان)
              <select name="course" value={formData.course || 'الشهر الأول'} onChange={onChange} required>
                <option value="الشهر الأول">الشهر الأول</option>
                <option value="الشهر الثاني">الشهر الثاني</option>
                <option value="الشهر الثالث">الشهر الثالث</option>
                <option value="الشهر الرابع">الشهر الرابع</option>
                <option value="الشهر الخامس">الشهر الخامس</option>
                <option value="نصف السنة">نصف السنة</option>
                <option value="النهائي">النهائي</option>
                <option value="الدور الثاني">الدور الثاني</option>
              </select>
            </label>
            <label>
              تاريخ الامتحان
              <DatePicker name="examDate" value={formData.examDate} onChange={onChange} required />
            </label>
            <label>
              الدرجة النهائية (مثلاً 100)
              <input type="number" name="totalScore" value={formData.totalScore} onChange={onChange} required min="1" />
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              حفظ البيانات
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
