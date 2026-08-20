import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createFeePayment, updateGradeFee, applyGradeFeeToAll } from '../services/databaseApi';
import { buildReceiptData } from '../services/feeService';
import ReceiptPreview from './ReceiptPreview';

const gradeOrder = {
  'اول': 1, '1': 1,
  'ثاني': 2, '2': 2,
  'ثالث': 3, '3': 3,
  'رابع': 4, '4': 4,
  'خامس': 5, '5': 5,
  'سادس': 6, '6': 6,
  'سابع': 7, '7': 7,
  'ثامن': 8, '8': 8,
  'تاسع': 9, '9': 9,
  'عاشر': 10, '10': 10,
  'حادي عشر': 11, '11': 11,
  'ثاني عشر': 12, '12': 12,
};

const getGradeWeight = (name) => {
  if (!name) return 999;
  let clean = name.toLowerCase().replace(/[أإآ]/g, 'ا');
  for (const [key, weight] of Object.entries(gradeOrder)) {
    if (clean.includes(key)) return weight;
  }
  return 999;
};

const formatCurrency = (amount, currency = 'عراقي') => {
  const formatted = new Intl.NumberFormat('en-US').format(amount);
  return currency === 'دولار' ? `${formatted} $` : `${formatted} د.ع`;
};

/**
 * GradeFeeRow: Autonomous component with Auto-Save capability.
 * This is the STABLE version confirmed by the user.
 */
const GradeFeeRow = React.memo(({ grade, currentUser, onRefresh }) => {
  const [amt, setAmt] = useState(String(grade.annual_fee || 0));
  const [cur, setCur] = useState(grade.currency || 'عراقي');
  const [status, setStatus] = useState(''); // '', 'saving', 'saved', 'error'

  useEffect(() => {
    setAmt(String(grade.annual_fee || 0));
    setCur(grade.currency || 'عراقي');
  }, [grade.annual_fee, grade.currency]);

  const saveRow = async (newAmt, newCur) => {
    const numericAmt = Number(newAmt);
    if (numericAmt === grade.annual_fee && newCur === grade.currency) return;

    setStatus('saving');
    try {
      await updateGradeFee(grade.id, numericAmt, newCur, currentUser.id);
      await applyGradeFeeToAll(grade.id, numericAmt, currentUser.id);
      setStatus('saved');
      setTimeout(() => setStatus(''), 2500);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleAmtChange = (e) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    const finalVal = (val.length > 1) ? val.replace(/^0+/, '') : val;
    setAmt(finalVal);
  };

  const handleCurChange = (e) => {
    const val = e.target.value;
    setCur(val);
    saveRow(amt, val);
  };

  return (
    <tr>
      <td style={{ textAlign: 'center', width: '130px' }}>
        {status === 'saving' && <span style={{ color: '#60a5fa', fontSize: '13px' }}>جاري الحفظ...</span>}
        {status === 'saved' && <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>✅ تم الحفظ</span>}
        {status === 'error' && <span style={{ color: '#ef4444', fontSize: '13px' }}>❌ خطأ</span>}
      </td>
      <td style={{ textAlign: 'center' }}>
        <select
          value={cur}
          onChange={handleCurChange}
          className="cell-input"
          style={{ width: '150px', height: '45px', background: '#ffffff', color: '#000000', border: '2px solid #cbd5e1', cursor: 'pointer' }}
        >
          <option value="عراقي">دينار عراقي</option>
          <option value="دولار">دولار أمريكي</option>
        </select>
      </td>
      <td style={{ textAlign: 'center' }}>
        <input
          type="text"
          className="cell-input"
          value={amt ? new Intl.NumberFormat('en-US').format(amt) : ''}
          onChange={handleAmtChange}
          onBlur={() => saveRow(amt, cur)}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          style={{
            width: '200px',
            height: '45px',
            fontSize: '18px',
            fontWeight: '900',
            background: '#ffffff',
            color: '#000000',
            border: '2px solid #2563eb'
          }}
        />
      </td>
      <td style={{ fontWeight: '800', color: '#ffffff', fontSize: '18px', textAlign: 'right', paddingRight: '20px' }}>
        الصف {grade.name} <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '400' }}>({grade.level})</span>
      </td>
    </tr>
  );
});

function FeesPage({ students, fees, grades, onRefresh, onViewStudent, currentUser, currentAcademicYear, viewState, setViewState }) {
  const [activeTab, setActiveTab] = useState(viewState?.activeTab || 'overview');
  const [searchTerm, setSearchTerm] = useState(viewState?.searchTerm || '');
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    return () => {
      if (setViewState) {
        setViewState({ activeTab, searchTerm, allEdits: {} });
      }
    };
  }, [activeTab, searchTerm, setViewState]);

  const sortedGrades = useMemo(() =>
    [...grades].sort((a, b) => getGradeWeight(a.name) - getGradeWeight(b.name)),
    [grades]
  );

  const lateStudentsCount = useMemo(() => fees.filter(f => f.remaining > 0).length, [fees]);

  const filteredFees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let baseList = activeTab === 'late' ? fees.filter(f => f.remaining > 0) : fees;
    const enriched = baseList.map(fee => ({
      ...fee,
      phone: students.find(s => s.id === fee.studentId)?.phone || 'غير متوفر'
    }));
    if (!term) return enriched;
    return enriched.filter(f =>
      f.studentName.toLowerCase().includes(term) ||
      f.grade.toLowerCase().includes(term)
    );
  }, [fees, activeTab, searchTerm, students]);

  // Payment UI
  const [isPaying, setIsPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);

  const handleConfirmPayment = async () => {
    if (!selectedStudentForPay || !payAmount || Number(payAmount) <= 0) return;
    try {
      const student = students.find(s => s.id === selectedStudentForPay.studentId);
      const payData = { amount: Number(payAmount), date: new Date().toISOString().slice(0, 10), method: 'نقدي', note: 'تسديد من واجهة الحسابات' };
      const res = await createFeePayment(selectedStudentForPay.studentId, payData, currentUser.id, currentAcademicYear);
      if (onRefresh) await onRefresh();
      setIsPaying(false);
      setViewingReceipt(buildReceiptData(student, selectedStudentForPay, { ...payData, id: res.id }));
    } catch (e) { alert('فشل تسجيل الدفعة.'); }
  };

  const sendWhatsAppReminder = (phone, studentName, remaining, currency) => {
    if (!phone) return alert('رقم الهاتف غير متوفر.');
    const msg = `يرجى تسديد القسط الخاص بالطالب (${studentName}). المبلغ المتبقي: ${formatCurrency(remaining, currency)}`;
    window.open(`https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (viewingReceipt) return <ReceiptPreview receiptData={viewingReceipt} onBack={() => setViewingReceipt(null)} />;

  return (
    <div className="fees-page">
      <div className="fees-header">
        <div className="title-section">
          <h1>الحسابات والأقساط</h1>
          <p>إدارة الدفعات، الأقساط المتأخرة، وإصدار وصولات القبض</p>
        </div>
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 نظرة عامة والطلاب</button>
          <button className={`tab-btn ${activeTab === 'late' ? 'active' : ''}`} onClick={() => setActiveTab('late')}>⚠️ المطالبات المتأخرة {lateStudentsCount > 0 && <span className="tab-badge">{lateStudentsCount}</span>}</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ إعدادات الرسوم</button>
        </div>
      </div>

      {activeTab !== 'settings' && (
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="ابحث عن طالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" style={{ maxWidth: '100%' }} />
          </div>
        </div>
      )}

      <div className="fees-content-grid">
        {activeTab === 'settings' ? (
          <div className="table-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
            <div className="table-toolbar" style={{ padding: '20px', textAlign: 'right' }}>
              <h3 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800' }}>تحديد أقساط الصفوف</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>يتم حفظ وتطبيق التعديل تلقائياً عند الانتقال لخانة أخرى (Auto-Save).</p>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', color: '#94a3b8' }}>الحالة</th>
                    <th style={{ textAlign: 'center', color: '#94a3b8' }}>العملة</th>
                    <th style={{ textAlign: 'center', color: '#94a3b8' }}>مبلغ القسط السنوي</th>
                    <th style={{ textAlign: 'right', color: '#94a3b8', paddingRight: '20px' }}>اسم الصف الدراسي</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGrades.map((grade) => (
                    <GradeFeeRow key={`${grade.id}-${grade.annual_fee}`} grade={grade} currentUser={currentUser} onRefresh={onRefresh} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'late' ? (
           <div className="table-card late-payments-table">
            <div className="table-toolbar"><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '20px' }}>⚠️</span><h3>الأقساط المتأخرة</h3></div></div>
            <div className="table-wrapper">
              {filteredFees.length === 0 ? <div className="empty-state-card"><p>لا توجد مطالبات متأخرة حالياً.</p></div> : (
                <table>
                  <thead><tr><th style={{ textAlign: 'center' }}>إجراءات</th><th>هاتف ولي الأمر</th><th>تاريخ الاستحقاق</th><th>المبلغ المستحق</th><th>اسم الطالب</th></tr></thead>
                  <tbody>
                    {filteredFees.map((fee) => (
                      <tr key={fee.id}>
                        <td style={{ textAlign: 'center' }}><div className="action-group" style={{ justifyContent: 'center' }}><button className="btn-late-action remind" onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, fee.remaining, fee.currency)}>💬 واتساب</button><button className="btn-late-action pay" onClick={() => { setSelectedStudentForPay(fee); setIsPaying(true); setPayAmount(''); }}>✓ تسديد</button></div></td>
                        <td>{fee.phone}</td><td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(fee.remaining, fee.currency)}</td><td style={{ fontWeight: '600', cursor: 'pointer', color: '#2563eb' }} onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}>{fee.studentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          filteredFees.map((fee) => {
            const prog = fee.total > 0 ? (fee.paid / fee.total) * 100 : 0;
            return (
              <div key={fee.id} className="student-fee-card">
                <div className="card-header">
                  <div className="student-main-info"><h3 style={{ cursor: 'pointer', color: '#2563eb' }} onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}>{fee.studentName}</h3><span className="student-sub-info">{fee.grade} - {fee.division}</span><button className="btn-link" style={{ fontSize: '12px', color: '#25d366', marginTop: '4px', display: 'block' }} onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, fee.remaining, fee.currency)}>📱 تذكير واتساب</button></div>
                  <div className="total-fee-info"><span className="fee-label">إجمالي القسط السنوي</span><span className="fee-amount">{formatCurrency(fee.total, fee.currency)}</span></div>
                </div>
                <div className="payment-summary-bar"><div className="summary-texts"><span className="paid-text">المسدد: {formatCurrency(fee.paid, fee.currency)}</span><span className="remaining-text">المتبقي: {formatCurrency(fee.remaining, fee.currency)}</span></div><div className="progress-container"><div className="progress-bar" style={{ width: `${prog}%` }}></div></div></div>
                <div className="installments-list">
                  {fee.payments.length === 0 ? <div className="no-payments">لا توجد دفعات مسجلة.</div> : fee.payments.map((p) => (
                    <div key={p.id} className="installment-item"><div className="inst-status"><span className="check-icon">✓</span><span className="status-text">مسدد</span></div><div className="inst-details"><span className="inst-amount">{formatCurrency(p.amount, fee.currency)}</span><span className="inst-meta">التاريخ: {p.date} | رقم الوصل: REC-{2000 + p.id}</span></div><button className="btn-icon" onClick={() => { const student = students.find(s => s.id === fee.studentId); setViewingReceipt(buildReceiptData(student, fee, p)); }}>🖨️</button></div>
                  ))}
                  {fee.remaining > 0 && <div className="installment-item pending"><div className="inst-status"><span className="circle-icon"></span></div><div className="inst-details"><span className="inst-amount">{formatCurrency(fee.remaining, fee.currency)}</span><span className="inst-meta">تاريخ الاستحقاق: {new Date().toLocaleDateString('en-GB')}</span></div></div>}
                </div>
                <div className="card-actions"><button className="btn btn-primary-alt" onClick={() => { setSelectedStudentForPay(fee); setIsPaying(true); setPayAmount(''); }}>تسديد وطباعة وصل</button></div>
              </div>
            );
          })
        )}
      </div>

      {isPaying && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: '400px', padding: '24px' }}>
            <h3>تسجيل دفعة جديدة</h3><p style={{ color: '#64748b', marginBottom: '20px' }}>للطالب: {selectedStudentForPay?.studentName}</p>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label style={{ color: '#cbd5e1' }}>
                المبلغ المراد تسديده
                <input
                  type="text"
                  value={payAmount ? new Intl.NumberFormat('en-US').format(payAmount) : ''}
                  onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="cell-input"
                  style={{ width: '100%', padding: '12px' }}
                  autoFocus
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: '24px' }}><button className="btn btn-primary" onClick={handleConfirmPayment}>تأكيد التسديد</button><button className="btn btn-secondary" onClick={() => setIsPaying(false)}>إلغاء</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeesPage;
