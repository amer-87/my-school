import ModalLayout from './ModalLayout';
import { gradeLevels } from '../services/classService';

function GradeModal({ isOpen, mode, formData, onChange, onClose, onSubmit, errorMessage }) {
  return (
    <ModalLayout title={mode === 'edit' ? 'تعديل صف' : 'إضافة صف'} isOpen={isOpen} onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <div className="form-grid single-column">
          <label>
            اسم الصف
            <input name="name" value={formData.name} onChange={onChange} required />
          </label>
          <label>
            المرحلة
            <select name="level" value={formData.level} onChange={onChange}>
              {gradeLevels.map((option) => (
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

export default GradeModal;
