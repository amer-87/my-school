import React, { useMemo, useState } from 'react';
import { createFeePayment, updateGradeFee, applyGradeFeeToAll } from '../services/databaseApi';
import { buildReceiptData } from '../services/feeService';
import ReceiptPreview from './ReceiptPreview';

function FeesPage({ students, fees, grades, onRefresh, onViewStudent, currentUser, currentAcademicYear }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'late', or 'settings'
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [editingFees, setEditingFees] = useState({}); // gradeId -> { amount, currency }

  const lateStudentsCount = useMemo(() => fees.filter(f => f.remaining > 0).length, [fees]);

  const handleGradeFeeChange = (gradeId, field, value) => {
    setEditingFees(prev => ({
      ...prev,
      [gradeId]: {
        ...(prev[gradeId] || {
          amount: grades.find(g => g.id === gradeId)?.annual_fee || 0,
          currency: grades.find(g => g.id === gradeId)?.currency || 'عراقي'
        }),
        [field]: value
      }
    }));
  };

  const handleSaveAndApplyFee = async (gradeId) => {
    const editData = editingFees[gradeId] || {};
    const amount = Number(editData.amount !== undefined ? editData.amount : grades.find(g => g.id === gradeId)?.annual_fee);
    const currency = editData.currency || grades.find(g => g.id === gradeId)?.currency || 'عراقي';

    if (isNaN(amount) || amount < 0) return;

    if (!window.confirm('سيتم تحديث إجمالي القسط ونوع العملة لجميع الطلاب في هذا الصف. هل تود الاستمرار؟')) {
      return;
    }

    try {
      await updateGradeFee(gradeId, amount, currency, currentUser.id);
      await applyGradeFeeToAll(gradeId, amount, currentUser.id);

      setEditingFees(prev => {
        const next = { ...prev };
        delete next[gradeId];
        return next;
      });

      await onRefresh();
      alert('تم تحديث القسط وتطبيقه بنجاح.');
    } catch (err) {
      console.error(err);
      alert('فشل تحديث القسط.');
    }
  };

  const sendWhatsAppReminder = (phone, studentName, remaining, currency) => {
    if (!phone) {
      alert('رقم الهاتف غير متوفر لهذا الطالب.');
      return;
    }
    const formattedAmount = new Intl.NumberFormat('en-US').format(remaining);
    const message = `يرجى تسديد القسط الخاص بالطالب (${studentName}). المبلغ المتبقي: ${formattedAmount} ${currency === 'دولار' ? '$' : 'د.ع'}`;
    const url = `https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredFees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let baseList = fees;

    if (activeTab === 'late') {
      baseList = fees.filter(f => f.remaining > 0);
    }

    // Join with student phone numbers
    const enrichedList = baseList.map(fee => {
      const student = students.find(s => s.id === fee.studentId);
      return { ...fee, phone: student?.phone || 'غير متوفر' };
    });

    if (!term) return enrichedList;

    return enrichedList.filter(f =>
      f.studentName.toLowerCase().includes(term) ||
      f.grade.toLowerCase().includes(term)
    );
  }, [fees, activeTab, searchTerm, students]);

  const formatCurrency = (amount, currency = 'عراقي') => {
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return currency === 'دولار' ? `${formatted} $` : `${formatted} د.ع`;
  };

  const handlePayClick = (studentFee) => {
    setSelectedStudentForPay(studentFee);
    setPayAmount('');
    setIsPaying(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedStudentForPay || !payAmount || Number(payAmount) <= 0) return;

    try {
      const student = students.find(s => s.id === selectedStudentForPay.studentId);
      const paymentData = {
        amount: Number(payAmount),
        date: new Date().toISOString().slice(0, 10),
        method: 'نقدي',
        note: 'تسديد من واجهة الحسابات'
      };

      const result = await createFeePayment(selectedStudentForPay.studentId, paymentData, currentUser.id, currentAcademicYear);

      await onRefresh();
      setIsPaying(false);

      // Prepare receipt data and switch to preview mode
      const receipt = buildReceiptData(student, selectedStudentForPay, { ...paymentData, id: result.id });
      setViewingReceipt(receipt);
    } catch (error) {
      console.error('Payment failed', error);
      alert('فشل تسجيل الدفعة.');
    }
  };

  const handlePrintReceipt = (studentFee, payment) => {
    const student = students.find(s => s.id === studentFee.studentId);
    const receiptData = buildReceiptData(student, studentFee, payment);
    setViewingReceipt(receiptData);
  };

  if (viewingReceipt) {
    return <ReceiptPreview receiptData={viewingReceipt} onBack={() => setViewingReceipt(null)} />;
  }

  return (
    <div className="fees-page">
      <div className="fees-header">
        <div className="title-section">
          <h1>الحسابات والأقساط</h1>
          <p>إدارة الدفعات، الأقساط المتأخرة، وإصدار وصولات القبض</p>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            نظرة عامة والطلاب
          </button>
          <button
            className={`tab-btn ${activeTab === 'late' ? 'active' : ''}`}
            onClick={() => setActiveTab('late')}
          >
            المطالبات المتأخرة
            {lateStudentsCount > 0 && <span className="tab-badge">{lateStudentsCount}</span>}
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            إعدادات الرسوم
          </button>
        </div>
      </div>

      {activeTab !== 'settings' && (
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="ابحث عن طالب لاستعراض أقساطه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="fees-content-grid">
        {activeTab === 'settings' ? (
          <div className="table-card" style={{ background: 'white', color: '#1e293b' }}>
            <div className="table-toolbar">
              <h3>تحديد أقساط الصفوف</h3>
              <p>حدد قيمة القسط السنوي لكل صف دراسي ليتم اعتماده آلياً.</p>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>إجراءات</th>
                    <th style={{ textAlign: 'center' }}>العملة</th>
                    <th style={{ textAlign: 'center' }}>القسط السنوي</th>
                    <th>اسم الصف</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => {
                    const editData = editingFees[grade.id] || {};
                    const currentAmount = editData.amount !== undefined ? editData.amount : (grade.annual_fee || 0);
                    const currentCurrency = editData.currency || grade.currency || 'عراقي';

                    return (
                      <tr key={grade.id}>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleSaveAndApplyFee(grade.id)}
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                          >
                            حفظ وتطبيق للكل
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            value={currentCurrency}
                            onChange={(e) => handleGradeFeeChange(grade.id, 'currency', e.target.value)}
                            className="cell-input"
                          >
                            <option value="عراقي">دينار عراقي</option>
                            <option value="دولار">دولار أمريكي</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="cell-input"
                            value={currentAmount}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '');
                              handleGradeFeeChange(grade.id, 'amount', val);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td style={{ fontWeight: '600' }}>{grade.name} ({grade.level})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'late' ? (
          <div className="table-card late-payments-table">
            <div className="table-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <h3>الأقساط المتأخرة</h3>
              </div>
            </div>
            <div className="table-wrapper">
              {filteredFees.length === 0 ? (
                <div className="empty-state-card"><p>لا توجد مطالبات متأخرة حالياً.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>إجراءات</th>
                      <th>رقم هاتف ولي الأمر</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>المبلغ المستحق</th>
                      <th>اسم الطالب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((fee) => (
                      <tr key={fee.id}>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-group" style={{ justifyContent: 'center' }}>
                            <button className="btn-late-action remind" onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, fee.remaining, fee.currency)}>
                              💬 واتساب
                            </button>
                            <button className="btn-late-action pay" onClick={() => handlePayClick(fee)}>
                              ✓ تسديد
                            </button>
                          </div>
                        </td>
                        <td>{fee.phone}</td>
                        <td>{new Date().toISOString().slice(0, 10)}</td>
                        <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(fee.remaining, fee.currency)}</td>
                        <td
                          style={{ fontWeight: '600', cursor: 'pointer', color: '#2563eb' }}
                          onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}
                        >
                          {fee.studentName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          filteredFees.map((fee) => {
            const progress = fee.total > 0 ? (fee.paid / fee.total) * 100 : 0;

            return (
              <div key={fee.id} className="student-fee-card">
                <div className="card-header">
                  <div className="student-main-info">
                    <h3
                      style={{ cursor: 'pointer', color: '#2563eb' }}
                      onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}
                    >
                      {fee.studentName}
                    </h3>
                    <span className="student-sub-info">{fee.grade} - {fee.division}</span>
                    <button
                      className="btn-link"
                      style={{ fontSize: '12px', color: '#25d366', marginTop: '4px', display: 'block' }}
                      onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, fee.remaining, fee.currency)}
                    >
                      📱 تذكير واتساب
                    </button>
                  </div>
                  <div className="total-fee-info">
                    <span className="fee-label">إجمالي القسط السنوي</span>
                    <span className="fee-amount">{formatCurrency(fee.total, fee.currency)}</span>
                  </div>
                </div>

                <div className="payment-summary-bar">
                  <div className="summary-texts">
                    <span className="paid-text">المسدد: {formatCurrency(fee.paid, fee.currency)}</span>
                    <span className="remaining-text">المتبقي: {formatCurrency(fee.remaining, fee.currency)}</span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="installments-list">
                  {fee.payments.length === 0 ? (
                    <div className="no-payments">لا توجد دفعات مسجلة.</div>
                  ) : (
                    fee.payments.map((p, idx) => (
                      <div key={p.id} className="installment-item">
                        <div className="inst-status">
                          <span className="check-icon">✓</span>
                          <span className="status-text">مسدد</span>
                        </div>
                        <div className="inst-details">
                          <span className="inst-amount">{formatCurrency(p.amount, fee.currency)}</span>
                          <span className="inst-meta">تاريخ الاستحقاق: {p.date} | رقم الوصل: REC-{2000 + p.id}</span>
                        </div>
                        <button className="btn-icon" onClick={() => handlePrintReceipt(fee, p)} title="طباعة الوصل">🖨️</button>
                      </div>
                    ))
                  )}

                  {fee.remaining > 0 && (
                    <div className="installment-item pending">
                      <div className="inst-status">
                        <span className="circle-icon"></span>
                      </div>
                      <div className="inst-details">
                        <span className="inst-amount">{formatCurrency(fee.remaining, fee.currency)}</span>
                        <span className="inst-meta">تاريخ الاستحقاق القادم: {new Date().toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  <button
                    className="btn btn-primary-alt"
                    onClick={() => handlePayClick(fee)}
                    disabled={fee.remaining === 0}
                  >
                    تسديد وطباعة وصل
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isPaying && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: '400px', padding: '24px' }}>
            <h3>تسجيل دفعة جديدة</h3>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>للطالب: {selectedStudentForPay?.studentName}</p>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label style={{ color: '#cbd5e1' }}>
                المبلغ المراد تسديده
                <input
                  type="text"
                  inputMode="numeric"
                  value={payAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setPayAmount(val);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="أدخل المبلغ هنا..."
                  className="cell-input"
                  style={{ width: '100%', padding: '12px' }}
                  autoFocus
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={handleConfirmPayment}>تأكيد التسديد</button>
              <button className="btn btn-secondary" onClick={() => setIsPaying(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeesPage;
