import ModalLayout from './ModalLayout';
import { teacherSpecialties, teacherStatusOptions, teacherSubjects } from '../services/teacherService';

function TeacherModal({ isOpen, mode, formData, onChange, onClose, onSubmit, errorMessage }) {
  return (
    <ModalLayout title={mode === 'edit' ? 'تعديل معلم' : 'إضافة معلم'} isOpen={isOpen} onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="form-grid">
          <label>
            الاسم الكامل
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
            التخصص
            <select name="specialty" value={formData.specialty} onChange={onChange} required>
              {teacherSpecialties.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            المادة
            <select name="subject" value={formData.subject} onChange={onChange} required>
              {teacherSubjects.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            الهاتف
            <input name="phone" value={formData.phone} onChange={onChange} required />
          </label>
          <label>
            البريد الإلكتروني
            <input type="email" name="email" value={formData.email} onChange={onChange} required />
          </label>
          <label>
            العنوان
            <input name="address" value={formData.address} onChange={onChange} required />
          </label>
          <label>
            الحالة
            <select name="status" value={formData.status} onChange={onChange}>
              {teacherStatusOptions.map((option) => (
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

export default TeacherModal;
