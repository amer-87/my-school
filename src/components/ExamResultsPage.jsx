import { useMemo, useState, useEffect } from 'react';
import { saveExamResults, getExamResults } from '../services/databaseApi';

function ExamResultsPage({ students, exams, initialExamId, onBack, onSuccess, currentUser, currentAcademicYear }) {
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || '');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedExam = useMemo(() =>
    exams.find((exam) => exam.id === Number(selectedExamId)) || null,
    [exams, selectedExamId]
  );

  // Auto-load students and existing scores when exam is selected
  useEffect(() => {
    let isMounted = true;

    const loadExistingResults = async () => {
      if (selectedExam) {
        try {
          // Fetch existing scores from DB
          const existingScores = await getExamResults(selectedExam.id);

          if (!isMounted) return;

          // Filter students by grade and division of the selected exam
          const filteredStudents = students.filter(s =>
            String(s.gradeId) === String(selectedExam.gradeId) &&
            String(s.divisionId) === String(selectedExam.divisionId)
          );

          // Merge existing scores with student list
          const nextRows = filteredStudents.map((student) => {
            const existing = existingScores.find(es => String(es.student_id) === String(student.id));
            return {
              studentId: student.id,
              studentName: student.fullName,
              score: (existing && existing.score !== null && existing.score !== undefined) ? String(existing.score) : ''
            };
          });

          setRows(nextRows);
        } catch (error) {
          console.error('Failed to load existing results', error);
        }
      } else {
        setRows([]);
      }
      setMessage('');
    };

    loadExistingResults();

    return () => { isMounted = false; };
  }, [selectedExam?.id, students.length]); // Optimized dependencies to prevent accidental resets

  const updateScore = (studentId, value) => {
    // Force match using loose equality to be safe, though IDs should be numbers
    setRows((current) => current.map((row) => (String(row.studentId) === String(studentId) ? { ...row, score: value } : row)));
  };

  const handleSave = async () => {
    if (!selectedExam) return;

    // Validation only at the moment of saving
    const invalidRow = rows.find(row => row.score !== '' && (Number(row.score) > selectedExam.totalScore || Number(row.score) < 0));
    if (invalidRow) {
      alert(`عذراً، توجد درجة غير صحيحة. الدرجة يجب أن تكون بين 0 و ${selectedExam.totalScore}`);
      return;
    }

    setIsSaving(true);
    try {
      await saveExamResults(selectedExam.id, rows, currentUser.id, currentAcademicYear);
      if (onSuccess) {
        onSuccess();
      } else if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('Failed to save exam results', error);
      setMessage('فشل حفظ النتائج في قاعدة البيانات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="exam-results-module">
      <div className="module-toolbar">
        <div className="title-section">
          {onBack && (
            <button className="back-link" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', marginLeft: '10px' }}>
              <span>‹</span> عودة لقائمة الامتحانات
            </button>
          )}
        </div>

        <div className="module-actions">
          <label className="filter-control">
            الامتحان المختار:
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              <option value="">-- اختر الامتحان من القائمة --</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} - {exam.subject} ({exam.grade})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!selectedExam ? (
        <div className="empty-state-card" style={{ marginTop: '20px' }}>
          <p>يرجى اختيار امتحان من القائمة المنسدلة للبدء في إدخال الدرجات.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state-card" style={{ marginTop: '20px' }}>
          <p>لا يوجد طلاب مسجلين في هذا الصف والشعبة حالياً.</p>
        </div>
      ) : (
        <section className="table-card">
          <div className="table-toolbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div>
                <h3>إدخال نتائج: {selectedExam.name}</h3>
                <p>المادة: <strong>{selectedExam.subject}</strong> | الدرجة النهائية: <strong>{selectedExam.totalScore}</strong></p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'جاري الحفظ...' : '💾 حفظ النتائج'}
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>اسم الطالب</th>
                  <th style={{ textAlign: 'center' }}>الدرجة (من {selectedExam.totalScore})</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.studentId}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: '500' }}>{row.studentName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="cell-input"
                        value={row.score}
                        onChange={(event) => {
                          const val = event.target.value.replace(/[^\d]/g, '');
                          updateScore(row.studentId, val);
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="module-toolbar footer-toolbar" style={{ justifyContent: 'center', padding: '20px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '12px 40px' }}
              onClick={handleSave}
              disabled={isSaving}
            >
               {isSaving ? 'جاري الحفظ...' : 'حفظ نتائج الطلاب'}
            </button>
          </div>
          {message && (
            <div className={`toast ${message.includes('فشل') ? 'error-toast' : ''}`} style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
              {message}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export default ExamResultsPage;
