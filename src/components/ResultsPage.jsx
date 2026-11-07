import React, { useState, useEffect, useMemo } from 'react';
import { getFinalResults, promoteStudents } from '../services/databaseApi';
import { getIraqiWhatsAppNumber, getSchoolWhatsAppSignature } from '../services/studentService';

function ResultsPage({ grades, divisions, schoolSettings, currentUser, currentAcademicYear, viewState, setViewState, onRefresh }) {
  const [results, setResults] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Normalization helper for Arabic strings
  const normalize = (str) => {
    if (!str) return '';
    return str
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ');
  };

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
        const courseSubjects = s.subjects.filter(sub => normalize(sub.course) === targetCourse);
        const validSubjects = courseSubjects.filter(sub => sub.score !== null);
        const totalScore = validSubjects.reduce((sum, sub) => sum + sub.score, 0);
        const maxPossible = validSubjects.reduce((sum, sub) => sum + sub.total, 0);
        const average = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
        const isFailed = validSubjects.some(sub => sub.score < (sub.total / 2));

        let status = validSubjects.length === 0 ? 'غير مكتمل' : (isFailed ? 'مكمل' : 'ناجح');

        // If student is already promoted or graduated in the DB, show that status
        if (s.studentStatus === 'ناجح ومرحل' || s.studentStatus === 'خريج') {
          status = s.studentStatus;
        }

        return {
          ...s,
          courseSubjects,
          totalScore,
          maxPossible,
          average: average.toFixed(1),
          status
        };
      });
  }, [results, selectedDivisionId, selectedCourse]);

  const handlePromote = async () => {
    // Only students who are "Pass" based on scores AND still have "Active" status in DB
    const graduates = filteredResults.filter(r => r.status === 'ناجح' && r.studentStatus === 'نشط');

    if (graduates.length === 0) {
      alert('لا يوجد طلاب ناجحون جدد للترحيل في القائمة الحالية (ربما تم ترحيلهم مسبقاً).');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من ترحيل ${graduates.length} طالب ناجح للعام القادم؟`)) {
      return;
    }

    try {
      const result = await promoteStudents(graduates.map(g => g.id), currentUser.id, currentAcademicYear);

      if (result.ok) {
        alert(`تم ترحيل الطلاب بنجاح إلى العام الدراسي الجديد: ${result.nextYear}.\n\nالطلاب المرحلون سيختفون من قوائم هذا العام وسيظهرون في صفوفهم الجديدة في العام القادم.`);
        if (onRefresh) await onRefresh();
        await loadResults();
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الترحيل.');
    }
  };

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
      message += `- ${sub.name}: ${scoreStr} / ${sub.total}\n`;
    });

    message += `\n*المجموع:* ${student.totalScore} / ${student.maxPossible}\n`;
    message += `*المعدل:* ${student.average}%\n`;
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

  const handleBulkWhatsApp = () => {
    const selected = filteredResults.filter(r => selectedStudentIds.includes(r.id));
    if (selected.length === 0) {
      alert('يرجى تحديد طالب واحد على الأقل.');
      return;
    }

    if (!window.confirm(`سيتم فتح ${selected.length} نافذة واتساب لإرسال النتائج. هل تود الاستمرار؟\n\n(ملاحظة: يرجى السماح بالنوافذ المنبثقة "Pop-ups" في متصفحك إذا لزم الأمر).`)) {
      return;
    }

    selected.forEach((student, index) => {
      // Small delay between opens to help browser manage multiple tabs
      setTimeout(() => {
        sendWhatsAppResult(student);
      }, index * 1200);
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredResults.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredResults.map(r => r.id));
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
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
    const targetCourse = normalize(selectedCourse);
    filteredResults.forEach(r => {
      r.courseSubjects.forEach(s => {
        if (!subs[s.name]) {
          subs[s.name] = s.date || '—';
        }
      });
    });
    return Object.entries(subs).map(([name, date]) => ({ name, date }));
  }, [filteredResults, selectedCourse]);

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
              <option value="الشهر الأول">الشهر الأول</option>
              <option value="الشهر الثاني">الشهر الثاني</option>
              <option value="الشهر الثالث">الشهر الثالث</option>
              <option value="الشهر الرابع">الشهر الرابع</option>
              <option value="نصف السنة">نصف السنة</option>
              <option value="النهائي">النهائي</option>
           </select>
        </div>

        <button className="btn btn-secondary promote-btn" onClick={handlePromote}>
          <span style={{ marginLeft: '8px' }}>🔄</span> ترحيل الناجحين للعام القادم
        </button>

        {selectedStudentIds.length > 0 && (
          <button
            className="btn"
            onClick={handleBulkWhatsApp}
            style={{ background: '#25d366', color: 'white', fontWeight: '800', borderRadius: '12px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)' }}
          >
            📱 إرسال النتائج للمحددين ({selectedStudentIds.length})
          </button>
        )}
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
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === filteredResults.length && filteredResults.length > 0}
                      onChange={toggleSelectAll}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ textAlign: 'center' }}>إرسال</th>
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
                  <tr key={row.id} className={selectedStudentIds.includes(row.id) ? 'selected-row' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(row.id)}
                        onChange={() => toggleSelectStudent(row.id)}
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-icon"
                        onClick={() => sendWhatsAppResult(row)}
                        title="إرسال عبر واتساب"
                        style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid rgba(37, 211, 102, 0.2)' }}
                      >
                        📱
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
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
