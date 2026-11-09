import React, { useEffect, useState } from 'react';
import { getEnrichedAttendance } from '../services/databaseApi';

function DashboardPage({ students, teachers, fees, onViewStudent, currentAcademicYear, canViewFinancials = true }) {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const todayDate = today.toISOString().slice(0, 10);

  useEffect(() => {
    let isCurrentRequest = true;
    setAttendanceLoading(true);
    setAttendanceError('');

    getEnrichedAttendance(todayDate)
      .then((records) => {
        if (isCurrentRequest) setTodayAttendance(Array.isArray(records) ? records : []);
      })
      .catch((error) => {
        console.error('Failed to load dashboard attendance', error);
        if (isCurrentRequest) setAttendanceError('تعذر تحميل إحصائيات الحضور لهذا اليوم.');
      })
      .finally(() => {
        if (isCurrentRequest) setAttendanceLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [todayDate]);

  const attendanceCounts = todayAttendance.reduce((counts, record) => {
    if (record.status === 'حاضر') counts.present += 1;
    if (record.status === 'غائب') counts.absent += 1;
    if (record.status === 'إجازة') counts.leave += 1;
    return counts;
  }, { present: 0, absent: 0, leave: 0 });

  const formattedToday = new Intl.DateTimeFormat('ar-IQ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  // Calculate stats
  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  const totalCollected = canViewFinancials
    ? fees.reduce((sum, record) => sum + (record.paid || 0), 0)
    : 0;
  const latePayments = canViewFinancials ? fees
    .filter(record => record.remaining > 0)
    .slice(0, 5) : [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <div className="stat-card" style={{ borderRight: '4px solid #2563eb' }}>
          <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>📅</div>
          <div className="stat-content">
            <span className="stat-label">العام الدراسي</span>
            <span className="stat-value" style={{ fontSize: '24px' }}>{currentAcademicYear}</span>
          </div>
        </div>

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

        {canViewFinancials && <div className="stat-card highlight">
          <div className="stat-icon revenue-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">الإيرادات المحصلة</span>
            <div className="stat-value-group">
              <span className="stat-value">{formatCurrency(totalCollected)}</span>
              <span className="stat-currency">د.ع</span>
            </div>
          </div>
        </div>}
      </div>

      <section className="dashboard-attendance" aria-labelledby="dashboard-attendance-title">
        <div className="dashboard-attendance-header">
          <div>
            <h3 id="dashboard-attendance-title">ملخص الحضور اليومي</h3>
            <p>إحصائيات الحالات المسجلة لهذا اليوم{!attendanceLoading && ` · إجمالي السجلات: ${todayAttendance.length}`}</p>
          </div>
          <span className="dashboard-attendance-date">{formattedToday}</span>
        </div>
        {attendanceError ? (
          <p className="dashboard-attendance-error" role="alert">{attendanceError}</p>
        ) : (
          <div className="dashboard-attendance-grid" aria-busy={attendanceLoading}>
            <article className="dashboard-attendance-card present">
              <span className="dashboard-attendance-icon" aria-hidden="true">✓</span>
              <div>
                <span className="dashboard-attendance-label">الحاضرون</span>
                <strong>{attendanceLoading ? '—' : attendanceCounts.present}</strong>
                <span className="dashboard-attendance-caption">طالب مسجل حضوره</span>
              </div>
            </article>
            <article className="dashboard-attendance-card absent">
              <span className="dashboard-attendance-icon" aria-hidden="true">×</span>
              <div>
                <span className="dashboard-attendance-label">الغائبون</span>
                <strong>{attendanceLoading ? '—' : attendanceCounts.absent}</strong>
                <span className="dashboard-attendance-caption">طالب مسجل غيابه</span>
              </div>
            </article>
            <article className="dashboard-attendance-card leave">
              <span className="dashboard-attendance-icon" aria-hidden="true">◷</span>
              <div>
                <span className="dashboard-attendance-label">المجازون</span>
                <strong>{attendanceLoading ? '—' : attendanceCounts.leave}</strong>
                <span className="dashboard-attendance-caption">طالب بإجازة</span>
              </div>
            </article>
          </div>
        )}
      </section>

      <div className="dashboard-main-grid">
        {canViewFinancials && <div className="dashboard-section late-payments">
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
        </div>}

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
