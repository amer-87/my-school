import ModalLayout from './ModalLayout';
import { studentStatusOptions } from '../services/studentService';

function StudentModal({ isOpen, mode, formData, onChange, onClose, onSubmit, errorMessage, grades, divisions }) {
  const availableDivisions = divisions.filter((division) => division.gradeId === Number(formData.gradeId));

  return (
    <ModalLayout title={mode === 'edit' ? 'تعديل طالب' : 'إضافة طالب'} isOpen={isOpen} onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="form-grid">
          <label>
            الاسم الرباعي
            <input name="fullName" value={formData.fullName} onChange={onChange} required />
          </label>
          <label>
            الجنس
            <select name="gender" value={formData.gender} onChange={onChange}>
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
          </label>
          <label>
            تاريخ الميلاد
            <input type="date" name="dob" value={formData.dob} onChange={onChange} required />
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
            الهاتف
            <input name="phone" value={formData.phone} onChange={onChange} required />
          </label>
          <label>
            اسم ولي الأمر
            <input name="guardianName" value={formData.guardianName} onChange={onChange} required />
          </label>
          <label>
            العنوان
            <input name="address" value={formData.address} onChange={onChange} required />
          </label>
          <label>
            حالة الطالب
            <select name="status" value={formData.status} onChange={onChange}>
              {studentStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
    </ModalLayout>
  );
}

export default StudentModal;
