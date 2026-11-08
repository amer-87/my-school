import React, { useState, useEffect, useMemo } from 'react';
import { getExpenses, createExpense } from '../services/databaseApi';
import ExpenseModal from './ExpenseModal';
import DatePicker from './DatePicker';

function ExpensesPage({ currentUser, currentAcademicYear }) {
  const [expenses, setExpenses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddExpense = async (payload) => {
    try {
      await createExpense(payload, currentUser.id, currentAcademicYear);
      await loadExpenses();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('فشل إضافة الصرفية.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-IQ').format(amount);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.expense_date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="expenses-page">
      <div className="expenses-header-actions">
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <span style={{ marginLeft: '8px' }}>➕</span> تسجيل صرفية مباشرة
        </button>
      </div>

      <div className="expenses-layout">
        {/* Main List */}
        <div className="expenses-list-container card">
          <div className="section-header">
            <h3>سجل صرفيات ({selectedMonth})</h3>
          </div>

          <div className="expenses-scroll-list">
            {loading ? (
              <div className="empty-state">جاري التحميل...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="empty-state">لا توجد صرفيات مسجلة لهذا الشهر.</div>
            ) : (
              filteredExpenses.map(exp => (
                <div key={exp.id} className="expense-item-card">
                  <div className="exp-left">
                    <div className="exp-amount-group">
                      <span className="exp-amount">{formatCurrency(exp.amount)} د.ع</span>
                    </div>
                    <span className="exp-date">{exp.expense_date}</span>
                  </div>

                  <div className="exp-right">
                    <div className="exp-info">
                      <h4>{exp.title}</h4>
                      <span className="exp-category-tag">{exp.category}</span>
                      <p className="exp-desc">{exp.description || 'لا يوجد وصف إضافي'}</p>
                    </div>
                    <div className="exp-icon">📄</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="expenses-summary-card card">
          <div className="summary-header">
            <span className="summary-icon">📅</span>
            <h3>إجمالي مصروفات الشهر</h3>
          </div>
          <div className="summary-amount-box">
            <span className="summary-amount">{formatCurrency(monthlyTotal)} د.ع</span>
          </div>
          <div className="month-picker-container">
            <DatePicker
              mode="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="month-input"
            />
          </div>
        </div>
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpense}
      />
    </div>
  );
}

export default ExpensesPage;
