import ModalLayout from './ModalLayout';
import { studentStatusOptions } from '../services/studentService';
import DatePicker from './DatePicker';

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
            <DatePicker name="dob" value={formData.dob} onChange={onChange} required />
          </label>
          <label>
            الصف
            <select name="gradeId" value={formData.gradeId} onChange={onChange} required>
              <option value="">اختر الصف</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الشعبة
            <select name="divisionId" value={formData.divisionId} onChange={onChange} required disabled={!formData.gradeId || availableDivisions.length === 0}>
              {availableDivisions.length === 0 ? (
                <option value="">{formData.gradeId ? 'لا توجد شعب لهذا الصف' : 'اختر الصف أولاً'}</option>
              ) : (
                <>
                  <option value="">اختر الشعبة</option>
                  {availableDivisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <label>
            هاتف ولي الأمر
            <span style={{ display: 'flex', direction: 'ltr', alignItems: 'stretch' }}>
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRight: 0,
                  borderRadius: '10px 0 0 10px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                }}
              >
                +964
              </span>
              <input
                aria-label="رقم هاتف ولي الأمر داخل العراق"
                name="phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder="7XXXXXXXXX"
                value={formData.phone}
                onChange={onChange}
                required
                style={{ flex: 1, minWidth: 0, borderRadius: '0 10px 10px 0' }}
              />
            </span>
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
