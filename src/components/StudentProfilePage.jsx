import React, { useMemo } from 'react';
import { getLogs } from '../services/databaseApi';

function StudentProfilePage({ student, feeRecord, attendanceRecords, onBack, onEdit, canViewFinancials = true }) {
  const [logs, setLogs] = React.useState([]);

  React.useEffect(() => {
    const loadLogs = async () => {
      if (!student) return;
      try {
        const allLogs = await getLogs();
        // Filter logs related to this student
        const studentLogs = allLogs.filter(l =>
          l.description.includes(student.fullName) ||
          l.description.includes(`الطالب رقم ${student.id}`)
        );
        setLogs(studentLogs);
      } catch (e) {
        console.error(e);
      }
    };
    loadLogs();
  }, [student]);

  if (!student) return null;

  const formatCurrency = (amount, currency = 'عراقي') => {
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return currency === 'دولار' ? `${formatted} $` : `${formatted} د.ع`;
  };

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const stats = { present: 0, absent: 0, late: 0 };
    attendanceRecords.forEach(rec => {
      if (rec.status === 'حاضر') stats.present++;
      else if (rec.status === 'غائب') stats.absent++;
      else if (rec.status === 'متأخر') stats.late++;
    });
    return stats;
  }, [attendanceRecords]);

  const progress = feeRecord && feeRecord.total > 0
    ? (feeRecord.paid / feeRecord.total) * 100
    : 0;

  return (
    <div className="student-profile-container">
      {/* Header Section */}
      <div className="profile-header-card">
        <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="back-link" onClick={onBack}>
            <span>‹</span> عودة
          </button>
          {onEdit && (
            <button className="btn btn-primary" onClick={() => onEdit(student)}>
              📝 تعديل البيانات
            </button>
          )}
        </div>
        <div className="profile-main-info">
          <div className="profile-avatar">
            <div className="avatar-placeholder">👤</div>
          </div>
          <div className="profile-text">
            <h1>{student.fullName}</h1>
            <div className="profile-badges">
              <span className="badge school-tag">📍 مدرسة المستقبل</span>
              <span className="badge grade-tag">{student.grade}</span>
              <span className="badge division-tag">شعبة {student.division}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column */}
        <div className="profile-col main-col">
          {canViewFinancials && <div className="profile-section card">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>📑</span>
              <h3 style={{ margin: 0 }}>الأقساط الدراسية</h3>
            </div>

            <div className="fees-overview">
              <div className="fee-stat-box highlight">
                <span className="stat-label">المسدد</span>
                <span className="stat-value" style={{ color: '#16a34a' }}>{formatCurrency(feeRecord?.paid || 0, feeRecord?.currency)}</span>
              </div>
              <div className="fee-stat-box">
                <span className="stat-label">المتبقي</span>
                <span className="stat-value" style={{ color: '#64748b' }}>{formatCurrency(feeRecord?.remaining || 0, feeRecord?.currency)}</span>
              </div>
              <div className="fee-stat-box">
                <span className="stat-label">متأخر</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>0</span>
              </div>
            </div>

            <div className="progress-container profile-progress">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="installments-list mini">
              {(feeRecord?.payments || []).map(p => (
                <div key={p.id} className="installment-item compact" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px auto', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div className="inst-status"><span className="check-icon mini">✓</span> <span className="status-text">مسدد</span></div>
                  <span className="inst-date" style={{ color: '#64748b' }}>{p.date}</span>
                  <span className="inst-amount" style={{ fontWeight: '700' }}>{formatCurrency(p.amount, feeRecord?.currency)}</span>
                  <span className="inst-check" title={`استلمها: ${p.receivedBy || 'غير مسجل'}`}>{p.receivedBy ? `استلمها: ${p.receivedBy}` : '🟢'}</span>
                </div>
              ))}
              {feeRecord?.remaining > 0 && (
                <div className="installment-item compact pending" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px auto', alignItems: 'center', padding: '12px', opacity: 0.7 }}>
                  <div className="inst-status"><span className="circle-icon mini"></span> <span className="status-text grey">قادم</span></div>
                  <span className="inst-date" style={{ color: '#94a3b8' }}>{new Date().toISOString().slice(0, 10)}</span>
                  <span className="inst-amount" style={{ fontWeight: '700' }}>{formatCurrency(feeRecord.remaining, feeRecord.currency)}</span>
                  <span className="inst-check">⚪</span>
                </div>
              )}
            </div>
          </div>}

          <div className="bottom-grid">
             {/* Transport Section */}
            <div className="profile-section card half">
              <div className="section-header" style={{ marginBottom: '15px' }}>
                <span className="header-icon">🚌</span>
                <h3 style={{ display: 'inline', marginRight: '8px' }}>النقل المدرسي</h3>
              </div>
              <div className="info-list">
                <div className="info-row"><span className="info-label">الحالة</span> <span className="info-val">مشترك</span></div>
                <div className="info-row"><span className="info-label">السائق</span> <span className="info-val">متاح في النسخة الكاملة</span></div>
              </div>
            </div>

            {/* Results Section */}
            <div className="profile-section card half">
              <div className="section-header" style={{ marginBottom: '15px' }}>
                <span className="header-icon">🎓</span>
                <h3 style={{ display: 'inline', marginRight: '8px' }}>النتائج</h3>
              </div>
              <div className="results-summary">
                <div className="average-circle">
                  <span className="avg-num" style={{ color: '#0071e3' }}>—</span>
                  <span className="avg-label">المعدل العام</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="profile-col side-col">
          {/* Guardians Section */}
          <div className="profile-section card">
            <div className="section-header" style={{ marginBottom: '15px' }}>
              <span className="header-icon">📞</span>
              <h3 style={{ display: 'inline', marginRight: '8px' }}>أولياء الأمور</h3>
            </div>
            <div className="guardian-box">
              <div className="guardian-name">{student.fullName.split(' ').slice(1).join(' ')} <span className="relation">(ولي الأمر)</span></div>
              <div className="guardian-phone" style={{ color: '#0071e3', fontWeight: '700' }}>{student.phone}</div>
            </div>
          </div>

          {/* Attendance Section */}
          <div className="profile-section card">
            <div className="section-header" style={{ marginBottom: '15px' }}>
              <span className="header-icon">🗓️</span>
              <h3 style={{ display: 'inline', marginRight: '8px' }}>الحضور</h3>
            </div>
            <div className="attendance-profile-grid">
              <div className="att-box present">
                <span className="att-num">{attendanceStats.present}</span>
                <span className="att-label">حضور</span>
              </div>
              <div className="att-box late" style={{ background: '#fffbeb', color: '#b45309' }}>
                <span className="att-num">{attendanceStats.late}</span>
                <span className="att-label">تأخير</span>
              </div>
              <div className="att-box absent">
                <span className="att-num">{attendanceStats.absent}</span>
                <span className="att-label">غياب</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfilePage;
