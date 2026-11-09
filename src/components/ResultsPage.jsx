import React, { useState, useEffect, useMemo } from 'react';
import { getFinalResults } from '../services/databaseApi';
import { compareArabicNames, getIraqiWhatsAppNumber, getSchoolWhatsAppSignature } from '../services/studentService';
import { calculateYearEndSubjects, getGradeRule, normalizeResultText as normalize } from '../services/resultCalculation';

function ResultsPage({ grades, divisions, schoolSettings, currentAcademicYear, viewState, setViewState, onViewStudent }) {
  const [results, setResults] = useState([]);

  // Destructure persistent state from props
  const { view: activeSubView, divisionId: selectedDivisionId, course: selectedCourse } = viewState;

  // Helper setters that update the global state in App.jsx
  const setActiveSubView = (val) => setViewState(prev => ({ ...prev, view: val }));
  const setSelectedDivisionId = (val) => setViewState(prev => ({ ...prev, divisionId: val }));
  const setSelectedCourse = (val) => setViewState(prev => ({ ...prev, course: val }));

  const handleSelectDivision = (divId) => {
    setViewState(prev => ({ ...prev, divisionId: divId, view: 'list' }));
  };

  const [loading, setLoading] = useState(true);

  const selectedDivision = useMemo(() =>
    divisions.find(d => String(d.id) === String(selectedDivisionId)),
    [divisions, selectedDivisionId]
  );

  const selectedGrade = useMemo(() =>
    grades.find(g => g.id === selectedDivision?.gradeId),
    [grades, selectedDivision]
  );
  const gradeRule = useMemo(() => getGradeRule(selectedGrade), [selectedGrade]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await getFinalResults(currentAcademicYear);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [currentAcademicYear]);

  const filteredResults = useMemo(() => {
    if (!selectedDivisionId) return [];
    const divId = String(selectedDivisionId);
    const targetCourse = normalize(selectedCourse);

    return results
      .filter(r => String(r.divisionId) === divId)
      .map(s => {
        const yearEndSubjects = calculateYearEndSubjects(s, selectedGrade);
        const isFinalCourse = targetCourse === normalize('النهائي');
        const yearEndBySubject = new Map(yearEndSubjects.map((subject) => [subject.key, subject]));
        const courseSubjects = s.subjects
          .filter(sub => normalize(sub.course) === targetCourse)
          .map((subject) => {
            const yearEndSubject = isFinalCourse
              ? yearEndBySubject.get(normalize(subject.name))
              : null;
            if (yearEndSubject?.secondRoundScore === null || yearEndSubject?.secondRoundScore === undefined) {
              return subject;
            }
            return {
              ...subject,
              firstRoundScore: subject.score,
              score: yearEndSubject.secondRoundScore,
              isSecondRound: true,
            };
          });
        const validSubjects = courseSubjects.filter(sub => sub.score !== null);
        const totalScore = validSubjects.reduce((sum, sub) => sum + sub.score, 0);
        const maxPossible = validSubjects.reduce((sum, sub) => sum + sub.total, 0);
        const hasFirstRoundFailure = yearEndSubjects.some((sub) => sub.failedInFirstRound);
        const allSubjectsPassed = yearEndSubjects.length > 0
          && yearEndSubjects.every((sub) => sub.complete && sub.calculatedScore >= 50);
        const average = validSubjects.length
          ? totalScore / validSubjects.length
          : 0;

        let status = allSubjectsPassed
          ? 'ناجح'
          : hasFirstRoundFailure ? 'مكمل' : 'غير مكتمل';

        // If student is already promoted or graduated in the DB, show that status
        if (s.studentStatus === 'ناجح ومرحل' || s.studentStatus === 'خريج') {
          status = s.studentStatus;
        }

        return {
          ...s,
          courseSubjects,
          yearEndSubjects,
          totalScore,
          maxPossible,
          average: average.toFixed(1),
          status
        };
      })
      .sort((first, second) => compareArabicNames(first.fullName, second.fullName));
  }, [results, selectedDivisionId, selectedCourse, selectedGrade]);

  const sendWhatsAppResult = (student) => {
    if (!student.guardianPhone) {
      alert('رقم هاتف ولي الأمر غير متوفر لهذا الطالب.');
      return;
    }

    let message = `*نتائج الطالب:* ${student.fullName}\n`;
    message += `*العام الدراسي:* ${currentAcademicYear}\n`;
    message += `*الفترة:* ${selectedCourse}\n\n`;

    student.courseSubjects.forEach(sub => {
      const scoreStr = sub.score !== null ? `${sub.score}` : '—';
      const roundLabel = sub.isSecondRound
        ? ` (الدور الثاني، درجة الدور الأول: ${sub.firstRoundScore ?? '—'})`
        : '';
      message += `- ${sub.name}: ${scoreStr} / ${sub.total}${roundLabel}\n`;
    });

    message += `\n*المجموع:* ${student.totalScore} / ${student.maxPossible}\n`;
    student.yearEndSubjects.forEach((subject) => {
      const score = subject.calculatedScore;
      message += `- النتيجة السنوية لمادة ${subject.name}: ${score === null ? 'غير مكتملة' : `${score.toFixed(1)}%`}\n`;
    });
    message += `*المعدل:* ${student.average}\n`;
    message += `*النتيجة النهائية:* ${student.status}`;
    message += getSchoolWhatsAppSignature(schoolSettings);

    const phone = getIraqiWhatsAppNumber(student.guardianPhone);
    if (!phone) {
      alert('رقم هاتف ولي الأمر غير صالح.');
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getScoreColor = (score, total) => {
    const percent = (score / total) * 100;
    if (percent >= 90) return '#10b981'; // الممتاز
    if (percent >= 50) return '#3b82f6'; // ناجح
    return '#ef4444'; // راسب
  };

  // Extract unique subjects and their dates for columns
  const subjectsColumns = useMemo(() => {
    const subs = {};
    filteredResults.forEach(r => {
      r.courseSubjects.forEach(s => {
        if (!subs[s.name]) {
          subs[s.name] = s.date || '—';
        }
      });
    });
    return Object.entries(subs).map(([name, date]) => ({ name, date }));
  }, [filteredResults]);

  if (activeSubView === 'selection') {
    return (
      <div className="exams-selection-view">
        <div className="selection-grid-header">
          <h3>النتائج: اختر الصف</h3>
          <p>حدد الشعبة لاستعراض نتائج طلابها.</p>
        </div>

        <div className="grades-columns-container">
          {grades.map(grade => {
            const gradeDivisions = divisions.filter(d => d.gradeId === grade.id);
            return (
              <div key={grade.id} className="grade-column-card">
                <div className="grade-column-header">
                  <h4>الصف {grade.name}</h4>
                  <span>{gradeDivisions.length} شعبة</span>
                </div>
                <div className="divisions-list">
                  {gradeDivisions.map(div => (
                    <button
                      key={div.id}
                      className="division-selection-btn"
                      onClick={() => handleSelectDivision(div.id)}
                    >
                      <span className="div-name">شعبة {div.name}</span>
                      <span className="div-arrow">←</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <div className="title-section">
          <button className="back-link" onClick={() => setActiveSubView('selection')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', marginBottom: '10px', color: '#64748b' }}>
            <span>‹</span> عودة للاختيار
          </button>
          <h1>نتائج {selectedGrade?.name} - شعبة {selectedDivision?.name}</h1>
          <p>
            {gradeRule === 'final-only'
              ? 'يُحدد النجاح بحسب درجة الامتحان النهائي لكل مادة، والمعدل هو مجموع درجات المواد مقسوماً على عددها.'
              : gradeRule === 'annual-and-final'
                ? 'تُحتسب نتيجة المادة من معدل السعي السنوي ودرجة النهائي، ثم يُحسب النجاح لكل مادة.'
                : 'تُعرض نتائج المواد المسجلة لهذا الصف.'}
          </p>
        </div>

        <div className="module-actions">
           <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="search-input"
              style={{ minWidth: '180px', padding: '10px 16px' }}
           >
              <option value="الشهر الأول">الشهر الأول</option>
              <option value="الشهر الثاني">الشهر الثاني</option>
              <option value="الشهر الثالث">الشهر الثالث</option>
              <option value="الشهر الرابع">الشهر الرابع</option>
              <option value="الشهر الخامس">الشهر الخامس</option>
              <option value="نصف السنة">نصف السنة</option>
              <option value="النهائي">النهائي</option>
           </select>
        </div>

      </div>

      <div className="table-card results-table">
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">جاري تحميل النتائج...</div>
          ) : filteredResults.length === 0 ? (
            <div className="empty-state">لا توجد بيانات درجات للطلاب المختارين.</div>
          ) : (
            <table className="results-data-table">
              <thead>
                <tr>
                  <th className="results-student-column">اسم الطالب</th>
                  {subjectsColumns.map((sub, i) => (
                    <th key={i} className="results-subject-column" style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{sub.date}</div>
                      <div>{sub.name}</div>
                    </th>
                  ))}
                  <th className="results-summary-column" style={{ textAlign: 'center' }}>المعدل</th>
                  <th className="results-status-column" style={{ textAlign: 'center' }}>النتيجة النهائية</th>
                  <th className="results-send-column" style={{ textAlign: 'center' }}>إرسال</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => (
                  <tr key={row.id}>
                    <td className="results-student-column">
                      <button
                        type="button"
                        className="results-student-name"
                        onClick={() => onViewStudent?.(row)}
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'right', font: 'inherit' }}
                        title="عرض ملف الطالب ودرجاته"
                      >
                        {row.fullName}
                      </button>
                      <span className="results-student-id">رقم الطالب: {row.id}</span>
                    </td>
                    {subjectsColumns.map((col, i) => {
                      const sub = row.courseSubjects.find(s => s.name === col.name);
                      return (
                        <td key={i} className="results-subject-column" style={{ textAlign: 'center' }}>
                          {sub && sub.score !== null ? (
                            <div>
                              <span style={{
                                color: getScoreColor(sub.score, sub.total),
                                fontWeight: '700',
                                fontSize: '16px'
                              }}>
                                {sub.score}
                              </span>
                              {sub.isSecondRound && (
                                <span style={{ color: '#94a3b8', fontSize: '10px', marginRight: '4px' }} title={`درجة الدور الأول: ${sub.firstRoundScore ?? '—'}`}>
                                  (د2)
                                </span>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td className="results-summary-column" style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {row.average}
                    </td>
                    <td className="results-status-column" style={{ textAlign: 'center' }}>
                      <span className={`status-pill ${
                        row.status === 'ناجح' ? 'active' :
                        row.status === 'مكمل' ? 'absent' :
                        (row.status === 'ناجح ومرحل' || row.status === 'خريج') ? 'promoted' : ''
                      }`} style={
                        (row.status === 'ناجح ومرحل' || row.status === 'خريج')
                        ? { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981' }
                        : {}
                      }>
                        {row.status === 'ناجح' ? '✓ ناجح' :
                         row.status === 'مكمل' ? '✕ مكمل' :
                         row.status === 'ناجح ومرحل' ? '📦 تم الترحيل' :
                         row.status === 'خريج' ? '🎓 خريج' : row.status}
                      </span>
                    </td>
                    <td className="results-send-column" style={{ textAlign: 'center' }}>
                      <button
                        className="btn-icon"
                        onClick={() => sendWhatsAppResult(row)}
                        title="إرسال عبر واتساب"
                        style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid rgba(37, 211, 102, 0.2)' }}
                      >
                        📱
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
