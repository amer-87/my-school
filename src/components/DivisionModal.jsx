import ModalLayout from './ModalLayout';

function DivisionModal({ isOpen, mode, formData, onChange, onClose, onSubmit, errorMessage, grades }) {
  return (
    <ModalLayout title={mode === 'edit' ? 'تعديل شعبة' : 'إضافة شعبة'} isOpen={isOpen} onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <div className="form-grid single-column">
          <label>
            اسم الشعبة
            <input name="name" value={formData.name} onChange={onChange} required />
          </label>
          <label>
            الصف المرتبط
            <select name="gradeId" value={formData.gradeId} onChange={onChange}>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
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

export default DivisionModal;
