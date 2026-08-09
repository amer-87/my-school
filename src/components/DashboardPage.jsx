import React from 'react';

function DashboardPage({ students, teachers, fees, onViewStudent }) {
  // Calculate stats
  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  const totalCollected = fees.reduce((sum, record) => sum + (record.paid || 0), 0);
  const latePayments = fees
    .filter(record => record.remaining > 0)
    .slice(0, 5); // Show top 5 late payments

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon students-icon">👥</div>
          <div className="stat-content">
            <span className="stat-label">عدد الطلاب</span>
            <span className="stat-value">{totalStudents}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teachers-icon">👤</div>
          <div className="stat-content">
            <span className="stat-label">عدد الموظفين</span>
            <span className="stat-value">{totalTeachers}</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon revenue-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">الإيرادات المحصلة</span>
            <div className="stat-value-group">
              <span className="stat-value">{formatCurrency(totalCollected)}</span>
              <span className="stat-currency">د.ع</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-section late-payments">
          <div className="section-header">
            <span className="header-icon">⚠️</span>
            <h3>أقساط متأخرة</h3>
          </div>
          <div className="late-list">
            {latePayments.length === 0 ? (
              <div className="empty-notice">لا توجد أقساط متأخرة حالياً.</div>
            ) : (
              latePayments.map((item) => (
                <div key={item.id} className="late-item">
                  <div className="late-info">
                    <span
                      className="student-name"
                      style={{ cursor: 'pointer', color: '#2563eb' }}
                      onClick={() => onViewStudent(students.find(s => s.id === item.studentId))}
                    >
                      {item.studentName}
                    </span>
                    <span className="payment-details">القسط بقيمة {formatCurrency(item.remaining)} د.ع</span>
                  </div>
                  <span className="late-badge">متأخر</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-section updates">
          <div className="section-header">
            <h3>آخر التحديثات الإدارية</h3>
          </div>
          <div className="updates-content">
            <span className="placeholder-text">قريباً</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
