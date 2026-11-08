import React, { useState } from 'react';
import ModalLayout from './ModalLayout';
import DatePicker from './DatePicker';

function ExpenseModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'مشتريات',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: Number(formData.amount)
    });
    setFormData({
      title: '',
      category: 'مشتريات',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10)
    });
  };

  return (
    <ModalLayout title="تسجيل صرفية مباشرة" isOpen={isOpen} onClose={onClose}>
      <form className="modal-form" onSubmit={handleFormSubmit}>
        <div className="form-grid">
          <label>
            عنوان الصرفية
            <input name="title" value={formData.title} onChange={handleChange} placeholder="مثلاً: شراء أحبار طابعة" required />
          </label>
          <label>
            الفئة
            <select name="category" value={formData.category} onChange={handleChange}>
              <option value="مشتريات">مشتريات</option>
              <option value="رواتب">رواتب</option>
              <option value="صيانة">صيانة</option>
              <option value="فواتير">فواتير</option>
              <option value="أخرى">أخرى</option>
            </select>
          </label>
          <label>
            المبلغ (د.ع)
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} required />
          </label>
          <label>
            التاريخ
            <DatePicker name="date" value={formData.date} onChange={handleChange} required />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            الوصف / الملاحظات
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#f8fafc',
                minHeight: '80px',
                fontFamily: 'inherit'
              }}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary">تسجيل الصرف</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </ModalLayout>
  );
}

export default ExpenseModal;
