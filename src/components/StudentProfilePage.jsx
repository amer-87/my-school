import React, { useMemo } from 'react';
import { getFinalResults, getLogs } from '../services/databaseApi';
import { calculateYearEndSubjects, getGradeRule, normalizeResultText } from '../services/resultCalculation';

function StudentProfilePage({ student, feeRecord, attendanceRecords, grades = [], currentAcademicYear, onBack, onEdit, canViewFinancials = true }) {
  const [logs, setLogs] = React.useState([]);
  const [gradeResults, setGradeResults] = React.useState(null);
  const [gradesLoading, setGradesLoading] = React.useState(true);
  const [gradesError, setGradesError] = React.useState('');

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

  React.useEffect(() => {
    let active = true;
    const loadGradeResults = async () => {
      if (!student || !currentAcademicYear) return;
      setGradesLoading(true);
      setGradesError('');
      setGradeResults(null);
      try {
        const allResults = await getFinalResults(currentAcademicYear);
        if (active) {
          setGradeResults(allResults.find((result) => String(result.id) === String(student.id)) || null);
        }
      } catch (error) {
        console.error('Failed to load student grade details', error);
        if (active) setGradesError('تعذر تحميل درجات الطالب.');
      } finally {
        if (active) setGradesLoading(false);
      }
    };
    loadGradeResults();
    return () => { active = false; };
  }, [student, currentAcademicYear]);

  const studentGrade = student
    ? grades.find((grade) => String(grade.id) === String(student.gradeId))
    : null;
  const resultRule = getGradeRule(studentGrade);
  const yearEndSubjects = gradeResults
    ? calculateYearEndSubjects(gradeResults, studentGrade)
    : [];
  const subjectRows = useMemo(() => {
    if (!gradeResults) return [];
    const bySubject = new Map();
    gradeResults.subjects.forEach((subject) => {
      const key = normalizeResultText(subject.name);
      if (!bySubject.has(key)) bySubject.set(key, { key, name: subject.name, exams: [] });
      bySubject.get(key).exams.push(subject);
    });
    const secondRoundBySubject = new Map(
      (gradeResults.secondRoundResults || []).map((result) => [normalizeResultText(result.subjectName), result]),
    );
    return [...bySubject.values()].map((subject) => ({
      ...subject,
      secondRound: secondRoundBySubject.get(subject.key) || null,
      yearEnd: yearEndSubjects.find((result) => result.key === subject.key) || null,
    }));
  }, [gradeResults, yearEndSubjects]);
  const gradeCourses = useMemo(() => {
    const courses = new Map();
    subjectRows.forEach((subject) => subject.exams.forEach((exam) => {
      const key = normalizeResultText(exam.course);
      const hasRecordedScore = exam.score !== null && exam.score !== undefined;
      const hasSecondRoundFinal = key === normalizeResultText('النهائي') && subject.secondRound;
      if (key !== normalizeResultText('الدور الثاني')
        && (hasRecordedScore || hasSecondRoundFinal)
        && !courses.has(key)) {
        courses.set(key, exam.course);
      }
    }));
    return [...courses.entries()]
      .sort((first, second) => {
        const order = ['الشهر الأول', 'الشهر الثاني', 'الشهر الثالث', 'الشهر الرابع', 'الشهر الخامس', 'نصف السنة', 'النهائي'];
        const firstIndex = order.findIndex((course) => normalizeResultText(course) === first[0]);
        const secondIndex = order.findIndex((course) => normalizeResultText(course) === second[0]);
        return (firstIndex === -1 ? order.length : firstIndex) - (secondIndex === -1 ? order.length : secondIndex);
      });
  }, [subjectRows]);

  const formatCurrency = (amount, currency = 'عراقي') => {
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return currency === 'دولار' ? `${formatted} $` : `${formatted} د.ع`;
  };

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const stats = { present: 0, absent: 0, late: 0 };
    (attendanceRecords || []).forEach(rec => {
      if (rec.status === 'حاضر') stats.present++;
      else if (rec.status === 'غائب') stats.absent++;
      else if (rec.status === 'متأخر') stats.late++;
    });
    return stats;
  }, [attendanceRecords]);

  const progress = feeRecord && feeRecord.total > 0
    ? (feeRecord.paid / feeRecord.total) * 100
    : 0;

  if (!student) return null;

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

      <section className="profile-section card student-grade-history">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <span className="header-icon">🎓</span>
          <h3 style={{ display: 'inline', marginRight: '8px' }}>درجات المواد - {currentAcademicYear}</h3>
        </div>
        {gradesLoading ? (
          <div className="empty-state">جاري تحميل درجات الطالب...</div>
        ) : gradesError ? (
          <div className="empty-state">{gradesError}</div>
        ) : subjectRows.length === 0 ? (
          <div className="empty-state">لا توجد درجات مسجلة لهذا الطالب في العام الدراسي المحدد.</div>
        ) : (
          <div className="table-wrapper">
            <table className="results-data-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  {gradeCourses.map(([key, course]) => <th key={key} style={{ textAlign: 'center' }}>{course}</th>)}
                  <th style={{ textAlign: 'center' }}>الدور الثاني</th>
                  <th style={{ textAlign: 'center' }}>محصلة المادة</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((subject) => (
                  <tr key={subject.key}>
                    <td>{subject.name}</td>
                    {gradeCourses.map(([key]) => {
                      const exam = subject.exams.find((item) => normalizeResultText(item.course) === key);
                      const isFinal = key === normalizeResultText('النهائي');
                      const displayedScore = isFinal && subject.secondRound
                        ? subject.secondRound.score
                        : exam?.score;
                      return (
                        <td key={key} style={{ textAlign: 'center' }}>
                          {displayedScore === null || displayedScore === undefined
                            ? '—'
                            : (
                              <span>
                                {displayedScore} / {exam?.total || subject.secondRound?.total || 100}
                                {isFinal && subject.secondRound && (
                                  <small style={{ display: 'block', color: '#94a3b8' }}>
                                    دور ثانٍ (درجة الأول: {exam?.score ?? '—'})
                                  </small>
                                )}
                              </span>
                            )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center' }}>
                      {subject.secondRound
                        ? `${subject.secondRound.score} / ${subject.secondRound.total}`
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {subject.yearEnd?.calculatedScore === null || !subject.yearEnd?.complete
                        ? 'غير مكتملة'
                        : `${subject.yearEnd.calculatedScore.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resultRule === null && subjectRows.length > 0 && (
          <p style={{ color: '#94a3b8', marginBottom: 0 }}>
            لا توجد قاعدة محصلة سنوية معرفة لهذا الصف؛ تعرض درجات الامتحانات المسجلة فقط.
          </p>
        )}
      </section>
    </div>
  );
}

export default StudentProfilePage;
