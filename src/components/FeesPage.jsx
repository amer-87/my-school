import React, { useMemo, useState, useEffect } from 'react';
import {
  createFeePayment,
  createTuitionExpense,
  generateTuitionInstallments,
  getTuitionExpenses,
  updateGradeFee,
  applyGradeFeeToAll,
} from '../services/databaseApi';
import { buildReceiptData } from '../services/feeService';
import { getIraqiWhatsAppNumber, getSchoolWhatsAppSignature } from '../services/studentService';
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
const getLocalDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
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

function FeesPage({ students, fees, grades, divisions, schoolSettings, onRefresh, onViewStudent, currentUser, currentAcademicYear, viewState, setViewState }) {
  const [activeTab, setActiveTab] = useState(viewState?.activeTab || 'overview');
  const [searchTerm, setSearchTerm] = useState(viewState?.searchTerm || '');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalDate);
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [firstDueDate, setFirstDueDate] = useState(getLocalDate);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'رواتب',
    amount: '',
    currency: 'عراقي',
    date: getLocalDate(),
    paymentMethod: 'نقدي',
    note: '',
  });

  useEffect(() => {
    return () => {
      if (setViewState) {
        setViewState({ activeTab, searchTerm, allEdits: {} });
      }
    };
  }, [activeTab, searchTerm, setViewState]);

  const loadExpenses = async () => {
    setExpensesLoading(true);
    setExpensesError('');
    try {
      setExpenses(await getTuitionExpenses(currentAcademicYear));
    } catch (error) {
      console.error('Failed to load tuition expenses', error);
      setExpensesError('تعذر تحميل سجل المصروفات.');
    } finally {
      setExpensesLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [currentAcademicYear]);

  const sortedGrades = useMemo(() =>
    [...grades].sort((a, b) => getGradeWeight(a.name) - getGradeWeight(b.name)),
    [grades]
  );

  const gradeDivisions = useMemo(() =>
    divisions.filter((division) => String(division.gradeId) === selectedGradeId),
    [divisions, selectedGradeId]
  );

  const selectedDivisionStudents = useMemo(() => {
    if (!selectedGradeId || !selectedDivisionId) return [];
    const selectedGrade = grades.find((grade) => String(grade.id) === selectedGradeId);
    const selectedDivision = divisions.find((division) => String(division.id) === selectedDivisionId);
    if (!selectedGrade || !selectedDivision) return [];

    return students
      .filter((student) =>
        (String(student.gradeId) === selectedGradeId || student.grade === selectedGrade.name)
        && (String(student.divisionId) === selectedDivisionId || student.division === selectedDivision.name)
      )
      .filter((student) => {
        const term = searchTerm.trim().toLowerCase();
        return !term
          || student.fullName.toLowerCase().includes(term);
      })
      .sort((first, second) => first.fullName.localeCompare(second.fullName, 'ar'));
  }, [divisions, grades, searchTerm, selectedDivisionId, selectedGradeId, students]);

  const getStudentFeeAccount = (student) => {
    const existingAccount = fees.find((fee) => fee.studentId === student.id);
    if (existingAccount) return existingAccount;
    const grade = grades.find((item) => item.id === student.gradeId || item.name === student.grade);
    const total = Number(grade?.annual_fee || 0);
    return {
      id: null,
      studentId: student.id,
      studentName: student.fullName,
      grade: student.grade,
      division: student.division,
      phone: student.phone || '',
      total,
      paid: 0,
      remaining: total,
      currency: grade?.currency || 'عراقي',
      installments: [],
      planCreated: false,
      payments: [],
    };
  };

  const today = getLocalDate();
  const lateInstallments = useMemo(() =>
    fees.flatMap((fee) => fee.installments
      .filter((installment) => installment.remaining > 0 && installment.dueDate < today)
      .map((installment) => ({ ...installment, fee }))),
  [fees, today]);

  const unscheduledBalances = useMemo(() =>
    fees.filter((fee) => fee.remaining > 0 && !fee.planCreated),
  [fees]);

  const studentsWithoutFeeRecords = useMemo(() =>
    students.filter((student) => {
      const hasFeeRecord = fees.some((fee) => fee.studentId === student.id);
      const grade = grades.find((item) => item.id === student.gradeId || item.name === student.grade);
      return !hasFeeRecord && Number(grade?.annual_fee || 0) > 0;
    }),
  [fees, grades, students]);
  const accountsNeedingSchedule = unscheduledBalances.length + studentsWithoutFeeRecords.length;

  const totalsByCurrency = useMemo(() => {
    const totals = new Map();
    for (const fee of fees) {
      const currency = fee.currency || 'عراقي';
      const row = totals.get(currency) || { tuition: 0, collected: 0, debt: 0, expenses: 0 };
      row.tuition += Number(fee.total || 0);
      row.collected += Number(fee.paid || 0);
      row.debt += Number(fee.remaining || 0);
      totals.set(currency, row);
    }
    for (const expense of expenses) {
      const currency = expense.currency || 'عراقي';
      const row = totals.get(currency) || { tuition: 0, collected: 0, debt: 0, expenses: 0 };
      row.expenses += Number(expense.amount || 0);
      totals.set(currency, row);
    }
    return [...totals.entries()].map(([currency, row]) => ({
      currency,
      ...row,
      net: row.collected - row.expenses,
    }));
  }, [fees, expenses]);

  const filteredFees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const enriched = fees.map(fee => ({
      ...fee,
      phone: students.find(s => s.id === fee.studentId)?.phone || 'غير متوفر'
    }));
    if (!term) return enriched;
    return enriched.filter(f =>
      f.studentName.toLowerCase().includes(term) ||
      f.grade.toLowerCase().includes(term) ||
      f.division.toLowerCase().includes(term)
    );
  }, [fees, searchTerm, students]);

  const handleConfirmPayment = async () => {
    if (!selectedStudentForPay || !payAmount || Number(payAmount) <= 0) return;
    try {
      const student = students.find(s => s.id === selectedStudentForPay.studentId);
      const payData = { amount: Number(payAmount), date: paymentDate, method: paymentMethod, note: paymentNote };
      const res = await createFeePayment(selectedStudentForPay.studentId, payData, currentUser.id, currentAcademicYear);
      if (!res?.id) {
        setPaymentError(res?.message || 'تعذر تسجيل الدفعة.');
        return;
      }
      if (onRefresh) await onRefresh();
      setSelectedStudentForPay(null);
      setPaymentError('');
      setViewingReceipt(buildReceiptData(student, selectedStudentForPay, {
        ...payData,
        id: res.id,
        receivedBy: res.receivedBy || currentUser.full_name,
      }));
    } catch (error) {
      console.error('Failed to record tuition payment', error);
      setPaymentError(error.message || 'فشل تسجيل الدفعة.');
    }
  };

  const openPaymentForm = (fee) => {
    setSelectedStudentForPay(fee);
    setPayAmount('');
    setPaymentDate(getLocalDate());
    setPaymentMethod('نقدي');
    setPaymentNote('');
    setPaymentError('');
  };

  const handleGeneratePlan = async (event) => {
    event.preventDefault();
    setIsGeneratingPlan(true);
    setPlanMessage('');
    try {
      const result = await generateTuitionInstallments(firstDueDate, currentAcademicYear, currentUser.id);
      if (!result.ok) {
        setPlanMessage(result.message || 'تعذر إنشاء جداول الأقساط.');
        return;
      }
      await onRefresh?.();
      setPlanMessage(`تم إنشاء جداول لـ ${result.created} طالب، وتجاوز ${result.skipped} طالب لديهم جداول مسبقًا.`);
    } catch (error) {
      console.error('Failed to generate tuition installments', error);
      setPlanMessage('حدث خطأ أثناء إنشاء جداول الأقساط.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSaveExpense = async (event) => {
    event.preventDefault();
    setIsSavingExpense(true);
    setExpenseError('');
    try {
      const result = await createTuitionExpense(expenseForm, currentUser.id, currentAcademicYear);
      if (!result.ok) {
        setExpenseError(result.message || 'تعذر تسجيل المصروف.');
        return;
      }
      setExpenseForm({
        title: '',
        category: 'رواتب',
        amount: '',
        currency: 'عراقي',
        date: getLocalDate(),
        paymentMethod: 'نقدي',
        note: '',
      });
      setIsExpenseModalOpen(false);
      await loadExpenses();
    } catch (error) {
      console.error('Failed to save tuition expense', error);
      setExpenseError('حدث خطأ أثناء تسجيل المصروف.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const sendWhatsAppReminder = (phone, studentName, remaining, currency) => {
    if (!phone) return alert('رقم الهاتف غير متوفر.');
    const msg = `يرجى تسديد القسط الخاص بالطالب (${studentName}). المبلغ المتبقي: ${formatCurrency(remaining, currency)}${getSchoolWhatsAppSignature(schoolSettings)}`;
    const whatsappNumber = getIraqiWhatsAppNumber(phone);
    if (!whatsappNumber) return alert('رقم الهاتف غير صالح.');
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (viewingReceipt) return <ReceiptPreview receiptData={viewingReceipt} onBack={() => setViewingReceipt(null)} />;

  const feeCurrency = (fee) => fee.currency || 'عراقي';
  const installmentRows = filteredFees.flatMap((fee) => fee.installments.map((installment) => ({ ...installment, fee })));

  return (
    <div className="fees-page">
      <div className="fees-header">
        <div className="title-section">
          <h1>النظام المالي والأقساط</h1>
          <p>متابعة الحسابات الفردية، مواعيد الاستحقاق، الإيرادات والمصروفات للعام {currentAcademicYear}</p>
        </div>
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 الحسابات</button>
          <button className={`tab-btn ${activeTab === 'installments' ? 'active' : ''}`} onClick={() => setActiveTab('installments')}>📅 جدول الأقساط</button>
          <button className={`tab-btn ${activeTab === 'late' ? 'active' : ''}`} onClick={() => setActiveTab('late')}>⚠️ المتأخرات {lateInstallments.length > 0 && <span className="tab-badge">{lateInstallments.length}</span>}</button>
          <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>💸 المصروفات</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ إعدادات الرسوم</button>
        </div>
      </div>

      {totalsByCurrency.length > 0 && (
        <div className="cards" style={{ marginBottom: '20px' }}>
          {totalsByCurrency.map((totals) => (
            <article className="card" key={totals.currency}>
              <h3>الملخص المالي — {totals.currency}</h3>
              <div className="form-grid" style={{ marginTop: '12px' }}>
                <div><span className="detail-label">الإيراد المستحق</span><strong className="detail-value">{formatCurrency(totals.tuition, totals.currency)}</strong></div>
                <div><span className="detail-label">المبالغ المحصلة</span><strong className="detail-value" style={{ color: '#10b981' }}>{formatCurrency(totals.collected, totals.currency)}</strong></div>
                <div><span className="detail-label">الديون المتبقية</span><strong className="detail-value" style={{ color: '#f87171' }}>{formatCurrency(totals.debt, totals.currency)}</strong></div>
                <div><span className="detail-label">المصروفات المدفوعة</span><strong className="detail-value">{formatCurrency(totals.expenses, totals.currency)}</strong></div>
                <div><span className="detail-label">صافي النقد المحصل</span><strong className="detail-value">{formatCurrency(totals.net, totals.currency)}</strong></div>
              </div>
            </article>
          ))}
          <article className="card">
            <h3>مؤشرات التحصيل</h3>
            <p>حسابات الطلاب: <strong>{fees.length}</strong></p>
            <p>أقساط متأخرة: <strong style={{ color: '#f87171' }}>{lateInstallments.length}</strong></p>
            <p>أرصدة دون جدول استحقاق: <strong>{accountsNeedingSchedule}</strong></p>
            <p>دفعات مسجلة هذا العام: <strong>{fees.reduce((count, fee) => count + fee.payments.length, 0)}</strong></p>
          </article>
        </div>
      )}

      {activeTab !== 'settings' && activeTab !== 'expenses' && activeTab !== 'overview' && (
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="ابحث عن طالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" style={{ maxWidth: '100%' }} />
          </div>
        </div>
      )}

      <div className="fees-content-grid" style={{ display: 'block' }}>
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
        ) : activeTab === 'installments' ? (
          <div className="table-card">
            <div className="table-toolbar" style={{ padding: '20px' }}>
              <h3>إنشاء مواعيد الأقساط للعام {currentAcademicYear}</h3>
              <p>تقسيم الرصيد المتبقي إلى أربعة أقساط ربع سنوية. تُحفظ الدفعات السابقة كما هي، وتُخصّص الدفعات الجديدة لأقدم قسط مستحق.</p>
              <form onSubmit={handleGeneratePlan} className="module-actions" style={{ marginTop: '12px', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  تاريخ استحقاق القسط الأول
                  <input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} required />
                </label>
                <button className="btn btn-primary" type="submit" disabled={isGeneratingPlan || !accountsNeedingSchedule}>
                  {isGeneratingPlan ? 'جاري إنشاء الجداول...' : 'إنشاء جداول الأقساط'}
                </button>
                <span>الحسابات دون جدول: {accountsNeedingSchedule}</span>
              </form>
              {planMessage && <p role="status">{planMessage}</p>}
            </div>
            <div className="table-wrapper">
              {installmentRows.length === 0 ? <div className="empty-state-card"><p>لم تُنشأ جداول أقساط بعد. أدخل تاريخ القسط الأول لإنشاء الجداول.</p></div> : (
                <table>
                  <thead><tr><th>الإجراءات</th><th>الحالة</th><th>المتبقي</th><th>المبلغ</th><th>الاستحقاق</th><th>القسط</th><th>الطالب</th></tr></thead>
                  <tbody>
                    {installmentRows.map(({ fee, ...installment }) => (
                      <tr key={installment.id}>
                        <td>{installment.remaining > 0 && <button className="btn-late-action pay" onClick={() => openPaymentForm(fee)}>تسديد</button>}</td>
                        <td style={{ color: installment.status === 'متأخر' ? '#f87171' : installment.status === 'مسدد' ? '#10b981' : '#fbbf24' }}>{installment.status}</td>
                        <td>{formatCurrency(installment.remaining, feeCurrency(fee))}</td>
                        <td>{formatCurrency(installment.amount, feeCurrency(fee))}</td>
                        <td>{installment.dueDate}</td>
                        <td>القسط {installment.number}</td>
                        <td style={{ cursor: 'pointer', color: '#60a5fa' }} onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}>{fee.studentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === 'late' ? (
          <div className="table-card late-payments-table">
            <div className="table-toolbar" style={{ padding: '20px' }}>
              <h3>الأقساط التي تجاوزت موعد الاستحقاق</h3>
              {unscheduledBalances.length > 0 && <p>هناك {unscheduledBalances.length} حسابًا برصيد دون جدول استحقاق. أنشئ جدول الأقساط لعرض تواريخ التأخر بدقة.</p>}
            </div>
            <div className="table-wrapper">
              {lateInstallments.length === 0 ? <div className="empty-state-card"><p>لا توجد أقساط متأخرة حسب مواعيد الاستحقاق المسجلة.</p></div> : (
                <table>
                  <thead><tr><th>الإجراءات</th><th>المتبقي</th><th>الاستحقاق</th><th>القسط</th><th>الصف والشعبة</th><th>الطالب</th></tr></thead>
                  <tbody>
                    {lateInstallments.filter(({ fee }) => filteredFees.some((item) => item.id === fee.id)).map(({ fee, ...installment }) => (
                      <tr key={installment.id}>
                        <td><div className="action-group"><button className="btn-late-action remind" onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, installment.remaining, feeCurrency(fee))}>واتساب</button><button className="btn-late-action pay" onClick={() => openPaymentForm(fee)}>تسديد</button></div></td>
                        <td style={{ color: '#f87171', fontWeight: 'bold' }}>{formatCurrency(installment.remaining, feeCurrency(fee))}</td>
                        <td>{installment.dueDate}</td><td>القسط {installment.number}</td>
                        <td>{fee.grade} - {fee.division}</td><td>{fee.studentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === 'expenses' ? (
          <div className="table-card">
            <div className="table-toolbar" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>المصروفات الفعلية المرتبطة بالرسوم الدراسية</h3>
                <p>تُسجّل هنا المصروفات المدفوعة فقط، وتظهر ضمن صافي النقد للعام الدراسي.</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setExpenseError(''); setIsExpenseModalOpen(true); }}>إضافة مصروف مدفوع</button>
            </div>
            {expensesError && <p className="form-error" role="alert">{expensesError}</p>}
            <div className="table-wrapper">
              {expensesLoading ? <div className="empty-state-card"><p>جاري تحميل المصروفات...</p></div> : expenses.length === 0 ? <div className="empty-state-card"><p>لا توجد مصروفات مسجلة لهذا العام.</p></div> : (
                <table>
                  <thead><tr><th>التاريخ</th><th>طريقة الدفع</th><th>العملة</th><th>المبلغ</th><th>التصنيف</th><th>البيان</th></tr></thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.expense_date}</td><td>{expense.payment_method}</td><td>{expense.currency}</td>
                        <td>{formatCurrency(expense.amount, expense.currency)}</td><td>{expense.category}</td>
                        <td>{expense.title}{expense.note ? ` — ${expense.note}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === 'overview' ? (
          <div className="table-card">
            <div className="table-toolbar" style={{ padding: '20px' }}>
              <h3>تسديد أقساط الطلاب حسب الصف والشعبة</h3>
              <p>اختر الصف ثم الشعبة لعرض الحسابات الفردية والدفعات لكل طالب.</p>
              <div className="form-grid" style={{ marginTop: '16px' }}>
                <label>
                  الصف
                  <select
                    value={selectedGradeId}
                    onChange={(event) => {
                      setSelectedGradeId(event.target.value);
                      setSelectedDivisionId('');
                      setSearchTerm('');
                    }}
                  >
                    <option value="">اختر الصف</option>
                    {sortedGrades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                  </select>
                </label>
                <label>
                  الشعبة
                  <select
                    value={selectedDivisionId}
                    onChange={(event) => {
                      setSelectedDivisionId(event.target.value);
                      setSearchTerm('');
                    }}
                    disabled={!selectedGradeId}
                  >
                    <option value="">اختر الشعبة</option>
                    {gradeDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
                  </select>
                </label>
                <label>
                  بحث باسم الطالب
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="اكتب اسم الطالب..." disabled={!selectedDivisionId} />
                </label>
              </div>
            </div>
            {!selectedGradeId || !selectedDivisionId ? (
              <div className="empty-state-card"><p>اختر الصف والشعبة لعرض أسماء الطلاب وحساباتهم.</p></div>
            ) : selectedDivisionStudents.length === 0 ? (
              <div className="empty-state-card"><p>لا يوجد طلاب في الشعبة المحددة.</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>إجراء</th><th>المتبقي</th><th>المسدد</th><th>القسط السنوي</th><th>اسم الطالب</th></tr>
                  </thead>
                  <tbody>
                    {selectedDivisionStudents.map((student) => {
                      const fee = getStudentFeeAccount(student);
                      return (
                        <tr key={student.id}>
                          <td>
                            <button
                              className="btn-late-action pay"
                              onClick={() => openPaymentForm(fee)}
                              disabled={fee.remaining <= 0}
                            >
                              {fee.remaining > 0 ? 'تسديد' : 'مسدد بالكامل'}
                            </button>
                          </td>
                          <td style={{ color: fee.remaining > 0 ? '#f87171' : '#10b981', fontWeight: '700' }}>
                            {formatCurrency(fee.remaining, fee.currency)}
                          </td>
                          <td style={{ color: '#10b981' }}>{formatCurrency(fee.paid, fee.currency)}</td>
                          <td>{formatCurrency(fee.total, fee.currency)}</td>
                          <td style={{ cursor: 'pointer', color: '#60a5fa' }} onClick={() => onViewStudent(student)}>{student.fullName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          filteredFees.map((fee) => {
            const prog = fee.total > 0 ? Math.min((fee.paid / fee.total) * 100, 100) : 0;
            return (
              <div key={fee.id} className="student-fee-card">
                <div className="card-header">
                  <div className="student-main-info"><h3 style={{ cursor: 'pointer', color: '#2563eb' }} onClick={() => onViewStudent(students.find(s => s.id === fee.studentId))}>{fee.studentName}</h3><span className="student-sub-info">{fee.grade} - {fee.division}</span>{fee.remaining > 0 && <button className="btn-link" style={{ fontSize: '12px', color: '#25d366', marginTop: '4px', display: 'block' }} onClick={() => sendWhatsAppReminder(fee.phone, fee.studentName, fee.remaining, fee.currency)}>📱 تذكير واتساب</button>}</div>
                  <div className="total-fee-info"><span className="fee-label">إجمالي القسط السنوي</span><span className="fee-amount">{formatCurrency(fee.total, fee.currency)}</span></div>
                </div>
                <div className="payment-summary-bar"><div className="summary-texts"><span className="paid-text">المسدد: {formatCurrency(fee.paid, fee.currency)}</span><span className="remaining-text">المتبقي: {formatCurrency(fee.remaining, fee.currency)}</span></div><div className="progress-container"><div className="progress-bar" style={{ width: `${prog}%` }}></div></div></div>
                <div className="installments-list">
                  {fee.planCreated && fee.installments.map((installment) => (
                    <div className={`installment-item ${installment.status === 'متأخر' ? 'pending' : ''}`} key={installment.id}>
                      <div className="inst-status"><span className={installment.status === 'مسدد' ? 'check-icon' : 'circle-icon'}>{installment.status === 'مسدد' ? '✓' : ''}</span><span className="status-text">{installment.status}</span></div>
                      <div className="inst-details"><span className="inst-amount">{formatCurrency(installment.amount, fee.currency)}{installment.remaining > 0 ? ` — متبقٍ ${formatCurrency(installment.remaining, fee.currency)}` : ''}</span><span className="inst-meta">القسط {installment.number} | الاستحقاق: {installment.dueDate}</span></div>
                      {installment.remaining > 0 && <button className="btn-icon" onClick={() => openPaymentForm(fee)} title="تسجيل دفعة">✓</button>}
                    </div>
                  ))}
                  {!fee.planCreated && fee.remaining > 0 && <div className="no-payments">الرصيد لا يملك جدول استحقاق بعد. أنشئ جدول الأقساط من تبويب جدول الأقساط.</div>}
                  {fee.payments.length === 0 ? <div className="no-payments">لا توجد دفعات مسجلة.</div> : fee.payments.map((p) => (
                    <div key={p.id} className="installment-item"><div className="inst-status"><span className="check-icon">✓</span><span className="status-text">مسدد</span></div><div className="inst-details"><span className="inst-amount">{formatCurrency(p.amount, fee.currency)}</span><span className="inst-meta">التاريخ: {p.date} | المستلم: {p.receivedBy || 'غير مسجل'} | رقم الوصل: REC-{2000 + p.id}</span></div><button className="btn-icon" onClick={() => { const student = students.find(s => s.id === fee.studentId); setViewingReceipt(buildReceiptData(student, fee, p)); }}>🖨️</button></div>
                  ))}
                </div>
                {fee.remaining > 0 && <div className="card-actions"><button className="btn btn-primary-alt" onClick={() => openPaymentForm(fee)}>تسجيل دفعة وطباعة وصل</button></div>}
              </div>
            );
          })
        )}
      </div>

      {selectedStudentForPay && (
        <div className="modal-backdrop">
          <form className="modal-card" style={{ width: 'min(520px, 94vw)', padding: '24px' }} onSubmit={(event) => { event.preventDefault(); handleConfirmPayment(); }}>
            <h3>تسجيل دفعة دراسية</h3>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              الطالب: {selectedStudentForPay.studentName} | المتبقي: {formatCurrency(selectedStudentForPay.remaining, feeCurrency(selectedStudentForPay))}
              <br />الموظف المستلم: {currentUser.full_name}
            </p>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label style={{ color: '#cbd5e1' }}>
                مبلغ الدفعة
                <input type="number" min="0.01" max={selectedStudentForPay.remaining} step="0.01" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} required autoFocus />
              </label>
              <label style={{ color: '#cbd5e1' }}>
                تاريخ الدفع
                <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
              </label>
              <label style={{ color: '#cbd5e1' }}>
                طريقة الدفع
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="نقدي">نقدي</option><option value="تحويل مصرفي">تحويل مصرفي</option><option value="بطاقة">بطاقة</option><option value="أخرى">أخرى</option>
                </select>
              </label>
              <label style={{ color: '#cbd5e1' }}>
                ملاحظات / رقم التحويل
                <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
              </label>
            </div>
            {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary">تأكيد التسديد</button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedStudentForPay(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="modal-backdrop">
          <form className="modal-card" style={{ width: 'min(560px, 94vw)', padding: '24px' }} onSubmit={handleSaveExpense}>
            <h3>تسجيل مصروف مدفوع</h3>
            <div className="form-grid" style={{ marginTop: '20px' }}>
              <label style={{ color: '#cbd5e1' }}>البيان<input value={expenseForm.title} onChange={(event) => setExpenseForm((form) => ({ ...form, title: event.target.value }))} required /></label>
              <label style={{ color: '#cbd5e1' }}>التصنيف
                <select value={expenseForm.category} onChange={(event) => setExpenseForm((form) => ({ ...form, category: event.target.value }))}>
                  <option>رواتب</option><option>قرطاسية</option><option>صيانة</option><option>نقل</option><option>رسوم مصرفية</option><option>أخرى</option>
                </select>
              </label>
              <label style={{ color: '#cbd5e1' }}>المبلغ<input type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((form) => ({ ...form, amount: event.target.value }))} required /></label>
              <label style={{ color: '#cbd5e1' }}>العملة
                <select value={expenseForm.currency} onChange={(event) => setExpenseForm((form) => ({ ...form, currency: event.target.value }))}><option>عراقي</option><option>دولار</option></select>
              </label>
              <label style={{ color: '#cbd5e1' }}>تاريخ الدفع<input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((form) => ({ ...form, date: event.target.value }))} required /></label>
              <label style={{ color: '#cbd5e1' }}>طريقة الدفع
                <select value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm((form) => ({ ...form, paymentMethod: event.target.value }))}><option>نقدي</option><option>تحويل مصرفي</option><option>بطاقة</option><option>أخرى</option></select>
              </label>
              <label style={{ color: '#cbd5e1', gridColumn: '1 / -1' }}>ملاحظات<input value={expenseForm.note} onChange={(event) => setExpenseForm((form) => ({ ...form, note: event.target.value }))} /></label>
            </div>
            {expenseError && <p className="form-error" role="alert">{expenseError}</p>}
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={isSavingExpense}>{isSavingExpense ? 'جاري الحفظ...' : 'حفظ المصروف'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default FeesPage;
