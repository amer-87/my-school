import React, { useState, useEffect, useMemo } from 'react';
import { getFinalResults, promoteStudents } from '../services/databaseApi';

function ResultsPage({ grades, divisions, currentUser, currentAcademicYear, viewState, setViewState }) {
  const [results, setResults] = useState([]);

  // Destructure persistent state from props
  const { view: activeSubView, divisionId: selectedDivisionId, course: selectedCourse } = viewState;

  // Helper setters that update the global state in App.jsx
  const setActiveSubView = (val) => setViewState(prev => ({ ...prev, view: val }));
  const setSelectedDivisionId = (val) => setViewState(prev => ({ ...prev, divisionId: val }));
  const setSelectedCourse = (val) => setViewState(prev => ({ ...prev, course: val }));

  const [loading, setLoading] = useState(true);

  const selectedDivision = useMemo(() =>
    divisions.find(d => d.id === selectedDivisionId),
    [divisions, selectedDivisionId]
  );

  const selectedGrade = useMemo(() =>
    grades.find(g => g.id === selectedDivision?.gradeId),
    [grades, selectedDivision]
  );

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
    const crs = String(selectedCourse || '').trim();

    return results
      .filter(r => String(r.divisionId) === divId)
      .map(s => {
        const courseSubjects = s.subjects.filter(sub => String(sub.course || '').trim() === crs);
        const validSubjects = courseSubjects.filter(sub => sub.score !== null);
        const totalScore = validSubjects.reduce((sum, sub) => sum + sub.score, 0);
        const maxPossible = validSubjects.reduce((sum, sub) => sum + sub.total, 0);
        const average = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
        const isFailed = validSubjects.some(sub => sub.score < (sub.total / 2));

        return {
          ...s,
          courseSubjects,
          totalScore,
          maxPossible,
          average: average.toFixed(1),
          status: validSubjects.length === 0 ? 'غير مكتمل' : (isFailed ? 'مكمل' : 'ناجح')
        };
      });
  }, [results, selectedDivisionId, selectedCourse]);

  const handleSelectDivision = (divId) => {
    setSelectedDivisionId(divId);
    setActiveSubView('list');
  };

  const handlePromote = async () => {
    const graduates = filteredResults.filter(r => r.status === 'ناجح');
    if (graduates.length === 0) {
      alert('لا يوجد طلاب ناجحون للترحيل في القائمة الحالية.');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من ترحيل ${graduates.length} طالب ناجح للعام القادم؟`)) {
      return;
    }

    try {
      await promoteStudents(graduates.map(g => g.id), currentUser.id, currentAcademicYear);
      alert('تم ترحيل الطلاب بنجاح للعام القادم.');
      await loadResults();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الترحيل.');
    }
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
          <h3>النتائج والترحيل: اختر الصف</h3>
          <p>حدد الشعبة لاستعراض نتائج طلابها أو ترحيلهم للعام القادم.</p>
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
          <p>عرض الدرجات النهائية وترحيل الطلاب الناجحين</p>
        </div>

        <div className="module-actions">
           <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="search-input"
              style={{ minWidth: '180px', padding: '10px 16px' }}
           >
              <option value="الكورس الأول">الكورس الأول</option>
              <option value="الكورس الثاني">الكورس الثاني</option>
              <option value="الكورس الثالث">الكورس الثالث</option>
              <option value="الكورس الرابع">الكورس الرابع</option>
           </select>
        </div>

        <button className="btn btn-secondary promote-btn" onClick={handlePromote}>
          <span style={{ marginLeft: '8px' }}>🔄</span> ترحيل الناجحين للعام القادم
        </button>
      </div>

      <div className="table-card results-table">
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">جاري تحميل النتائج...</div>
          ) : filteredResults.length === 0 ? (
            <div className="empty-state">لا توجد بيانات درجات للطلاب المختارين.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>النتيجة النهائية</th>
                  <th style={{ textAlign: 'center' }}>المجموع</th>
                  <th style={{ textAlign: 'center' }}>المعدل %</th>
                  {subjectsColumns.map((sub, i) => (
                    <th key={i} style={{ textAlign: 'center', minWidth: '100px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{sub.date}</div>
                      <div>{sub.name}</div>
                    </th>
                  ))}
                  <th style={{ textAlign: 'right' }}>اسم الطالب</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-pill ${row.status === 'ناجح' ? 'active' : (row.status === 'مكمل' ? 'absent' : '')}`}>
                        {row.status === 'ناجح' ? '✓ ناجح' : (row.status === 'مكمل' ? '✕ مكمل' : row.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {row.totalScore} / {row.maxPossible}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {row.average}%
                    </td>
                    {subjectsColumns.map((col, i) => {
                      const sub = row.courseSubjects.find(s => s.name === col.name);
                      return (
                        <td key={i} style={{ textAlign: 'center' }}>
                          {sub && sub.score !== null ? (
                            <span style={{
                              color: getScoreColor(sub.score, sub.total),
                              fontWeight: '700',
                              fontSize: '16px'
                            }}>
                              {sub.score}
                            </span>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: '600' }}>{row.fullName} ({row.id})</td>
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
