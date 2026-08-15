import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createFeePayment, updateGradeFee, applyGradeFeeToAll } from '../services/databaseApi';
import { buildReceiptData } from '../services/feeService';
import ReceiptPreview from './ReceiptPreview';

// Enhanced Row: Manages its own local state to ensure ZERO typing lag
const GradeFeeRow = React.memo(({ grade, initialAmount, initialCurrency, onChange }) => {
  const [localAmt, setLocalAmt] = useState(initialAmount);
  const [localCur, setLocalCur] = useState(initialCurrency);

  // Sync internal state when parent forces a change (e.g. after a global Save or Tab Switch)
  useEffect(() => {
    setLocalAmt(initialAmount);
    setLocalCur(initialCurrency);
  }, [grade.id, initialAmount, initialCurrency]);

  const handleAmtChange = (val) => {
    const clean = val.replace(/[^\d]/g, '');
    const final = clean.length > 1 ? clean.replace(/^0+/, '') : clean;
    setLocalAmt(final);
    onChange(grade.id, 'amount', final);
  };

  const handleCurChange = (val) => {
    setLocalCur(val);
    onChange(grade.id, 'currency', val);
  };

  return (
    <tr>
      <td style={{ textAlign: 'center' }}>
        <select
          value={localCur}
          onChange={(e) => handleCurChange(e.target.value)}
          className="cell-input"
          style={{ width: '160px', height: '45px' }}
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
          value={localAmt}
          onChange={(e) => handleAmtChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={{ width: '220px', height: '45px', fontSize: '18px', fontWeight: '900' }}
        />
      </td>
      <td style={{ fontWeight: '700', color: '#f8fafc', fontSize: '17px', textAlign: 'right', paddingRight: '20px' }}>
        {grade.name} <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '400' }}>({grade.level})</span>
      </td>
    </tr>
  );
});

function FeesPage({ students, fees, grades, onRefresh, onViewStudent, currentUser, currentAcademicYear, viewState, setViewState }) {
  // 1. Local page states
  const [activeTab, setActiveTab] = useState(viewState.activeTab || 'overview');
  const [searchTerm, setSearchTerm] = useState(viewState.searchTerm || '');
  const [allEdits, setAllEdits] = useState(viewState.allEdits || {});

  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Sync to parent ONCE on unmount to prevent re-render "locks"
  const stateRef = useRef({ activeTab, searchTerm, allEdits });
  useEffect(() => {
    stateRef.current = { activeTab, searchTerm, allEdits };
  }, [activeTab, searchTerm, allEdits]);

  useEffect(() => {
    return () => {
      setViewState(stateRef.current);
    };
  }, [setViewState]);

  const lateStudentsCount = useMemo(() => fees.filter(f => f.remaining > 0).length, [fees]);

  const handleEditChange = useCallback((gradeId, field, value) => {
    setAllEdits(prev => ({
      ...prev,
      [gradeId]: {
        ...(prev[gradeId] || {
          amount: String(grades.find(g => g.id === gradeId)?.annual_fee || 0),
          currency: grades.find(g => g.id === gradeId)?.currency || 'عراقي'
        }),
        [field]: value
      }
    }));
  }, [grades]);

  const handleSaveAll = async () => {
    const modifiedIds = Object.keys(allEdits);
    if (modifiedIds.length === 0) {
      alert('لم يتم إجراء أي تغييرات جديدة لحفظها.');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من اعتماد التعديلات وتطبيقها على كافة الطلاب؟`)) return;

    setIsSavingAll(true);
    try {
      for (const gradeId of modifiedIds) {
        const data = allEdits[gradeId];
        await updateGradeFee(Number(gradeId), Number(data.amount), data.currency, currentUser.id);
        await applyGradeFeeToAll(Number(gradeId), Number(data.amount), currentUser.id);
      }
      setAllEdits({});
      await onRefresh();
      alert('تم حفظ واعتماد كافة التعديلات بنجاح ✅');
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ ❌');
    } finally {
      setIsSavingAll(false);
    }
  };

  const sendWhatsAppReminder = (phone, studentName, remaining, currency) => {
    if (!phone) return alert('رقم الهاتف غير متوفر.');
    const msg = `يرجى تسديد القسط الخاص بالطالب (${studentName}). المبلغ المتبقي: ${new Intl.NumberFormat('en-US').format(remaining)} ${currency === 'دولار' ? '$' : 'د.ع'}`;
    window.open(`https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredFees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let baseList = activeTab === 'late' ? fees.filter(f => f.remaining > 0) : fees;
    const enriched = baseList.map(fee => ({ ...fee, phone: students.find(s => s.id === fee.studentId)?.phone || 'غير متوفر' }));
    if (!term) return enriched;
    return enriched.filter(f => f.studentName.toLowerCase().includes(term) || f.grade.toLowerCase().includes(term));
  }, [fees, activeTab, searchTerm, students]);

  const handleConfirmPayment = async () => {
    if (!selectedStudentForPay || !payAmount || Number(payAmount) <= 0) return;
    try {
      const student = students.find(s => s.id === selectedStudentForPay.studentId);
      const payData = { amount: Number(payAmount), date: new Date().toISOString().slice(0, 10), method: 'نقدي', note: 'تسديد من واجهة الحسابات' };
      const res = await createFeePayment(selectedStudentForPay.studentId, payData, currentUser.id, currentAcademicYear);
      await onRefresh();
      setIsPaying(false);
      setViewingReceipt(buildReceiptData(student, selectedStudentForPay, { ...payData, id: res.id }));
    } catch (e) { alert('فشل تسجيل الدفعة.'); }
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
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>نظرة عامة والطلاب</button>
          <button className={`tab-btn ${activeTab === 'late' ? 'active' : ''}`} onClick={() => setActiveTab('late')}>المطالبات المتأخرة {lateStudentsCount > 0 && <span className="tab-badge">{lateStudentsCount}</span>}</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>إعدادات الرسوم</button>
        </div>
      </div>

      {activeTab !== 'settings' && (
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="ابحث عن طالب لاستعراض أقساطه..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" style={{ maxWidth: '100%' }} />
          </div>
        </div>
      )}

      <div className="fees-content-grid">
        {activeTab === 'settings' ? (
          <div className="table-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
            <div className="table-toolbar" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#fff', fontSize: '20px' }}>تحديد مبالغ الأقساط السنوية</h3>
                <p style={{ color: '#94a3b8' }}>سيتم تطبيق التعديلات على كافة طلاب الصف المختار فور الحفظ.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveAll}
                disabled={isSavingAll || Object.keys(allEdits).length === 0}
                style={{ padding: '14px 40px', fontSize: '16px', borderRadius: '14px', fontWeight: '900', background: '#2563eb', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)' }}
              >
                {isSavingAll ? 'جاري الحفظ...' : '💾 حفظ واعتماد كافة التعديلات'}
              </button>
            </div>

            <div className="table-wrapper">
              <table style={{ borderSpacing: '0 10px', borderCollapse: 'separate' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', color: '#94a3b8', paddingBottom: '15px' }}>العملة</th>
                    <th style={{ textAlign: 'center', color: '#94a3b8', paddingBottom: '15px' }}>القسط السنوي</th>
                    <th style={{ textAlign: 'right', color: '#94a3b8', paddingBottom: '15px', paddingRight: '20px' }}>اسم الصف الدراسي</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => {
                    const edit = allEdits[grade.id];
                    return (
                      <GradeFeeRow
                        key={grade.id}
                        grade={grade}
                        initialAmount={edit?.amount !== undefined ? edit.amount : String(grade.annual_fee || 0)}
                        initialCurrency={edit?.currency || grade.currency || 'عراقي'}
                        onChange={handleEditChange}
                      />
                    );
                  })}
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
                        <td style={{ textAlign: 'center' }}><div className="action-group" style={{ justifyContent: 'center' }}><button className="btn-late-action remind" onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, fee.remaining, fee.currency)}>💬 واتساب</button><button className="btn-late-action pay" onClick={() => { setSelectedStudentForPay(fee); setIsPaying(true); }}>✓ تسديد</button></div></td>
                        <td>{fee.phone}</td><td>{new Date().toISOString().slice(0, 10)}</td><td style={{ color: '#dc2626', fontWeight: 'bold' }}>{new Intl.NumberFormat('en-US').format(fee.remaining)} {fee.currency === 'دولار' ? '$' : 'د.ع'}</td><td style={{ fontWeight: '600', cursor: 'pointer', color: '#2563eb' }} onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}>{fee.studentName}</td>
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
                  <div className="total-fee-info"><span className="fee-label">إجمالي القسط السنوي</span><span className="fee-amount">{new Intl.NumberFormat('en-US').format(fee.total)} {fee.currency === 'دولار' ? '$' : 'د.ع'}</span></div>
                </div>
                <div className="payment-summary-bar"><div className="summary-texts"><span className="paid-text">المسدد: {new Intl.NumberFormat('en-US').format(fee.paid)} {fee.currency === 'دولار' ? '$' : 'د.ع'}</span><span className="remaining-text">المتبقي: {new Intl.NumberFormat('en-US').format(fee.remaining)} {fee.currency === 'دولار' ? '$' : 'د.ع'}</span></div><div className="progress-container"><div className="progress-bar" style={{ width: `${prog}%` }}></div></div></div>
                <div className="installments-list">
                  {fee.payments.length === 0 ? <div className="no-payments">لا توجد دفعات مسجلة.</div> : fee.payments.map((p) => (
                    <div key={p.id} className="installment-item"><div className="inst-status"><span className="check-icon">✓</span><span className="status-text">مسدد</span></div><div className="inst-details"><span className="inst-amount">{new Intl.NumberFormat('en-US').format(p.amount)} {fee.currency === 'دولار' ? '$' : 'د.ع'}</span><span className="inst-meta">التاريخ: {p.date} | رقم الوصل: REC-{2000 + p.id}</span></div><button className="btn-icon" onClick={() => { const student = students.find(s => s.id === fee.studentId); setViewingReceipt(buildReceiptData(student, fee, p)); }}>🖨️</button></div>
                  ))}
                  {fee.remaining > 0 && <div className="installment-item pending"><div className="inst-status"><span className="circle-icon"></span></div><div className="inst-details"><span className="inst-amount">{new Intl.NumberFormat('en-US').format(fee.remaining)} {fee.currency === 'دولار' ? '$' : 'د.ع'}</span><span className="inst-meta">تاريخ الاستحقاق: {new Date().toLocaleDateString('en-GB')}</span></div></div>}
                </div>
                <div className="card-actions"><button className="btn btn-primary-alt" onClick={() => { setSelectedStudentForPay(fee); setIsPaying(true); }}>تسديد وطباعة وصل</button></div>
              </div>
            );
          })
        )}
      </div>

      {isPaying && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: '400px', padding: '24px' }}>
            <h3>تسجيل دفعة جديدة</h3><p style={{ color: '#64748b', marginBottom: '20px' }}>للطالب: {selectedStudentForPay?.studentName}</p>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}><label style={{ color: '#cbd5e1' }}>المبلغ المراد تسديده<input type="text" inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ''))} onFocus={(e) => e.target.select()} placeholder="0" className="cell-input" style={{ width: '100%', padding: '12px' }} autoFocus /></label></div>
            <div className="modal-actions" style={{ marginTop: '24px' }}><button className="btn btn-primary" onClick={handleConfirmPayment}>تأكيد التسديد</button><button className="btn btn-secondary" onClick={() => setIsPaying(false)}>إلغاء</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeesPage;
