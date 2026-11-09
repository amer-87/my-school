import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { saveExamResults, getExamResults, getFinalResults } from '../services/databaseApi';
import { sortStudentsAlphabetically } from '../services/studentService';
import { calculateYearEndSubjects, normalizeResultText } from '../services/resultCalculation';

// Individual Row component for better performance and stability
const ResultRow = React.memo(({ row, index, totalScore, onUpdate }) => {
  // Use a local state that is NOT synced back from parent during typing
  // We only initialize it from the prop once or when the row ID changes
  const [val, setVal] = useState(row.score);

  // Update internal value only if the student ID changes (e.g. switching exams)
  // or if the parent state was reset (e.g. after a successful save)
  useEffect(() => {
    setVal(row.score);
  }, [row.studentId, row.score === '' ? 'empty' : 'data']);

  const isInvalid = val !== '' && Number(val) > totalScore;

  const handleChange = (e) => {
    const newVal = e.target.value.replace(/[^\d]/g, '');
    setVal(newVal);
    onUpdate(row.studentId, newVal);
  };

  return (
    <tr style={isInvalid ? { background: 'rgba(239, 68, 68, 0.05)' } : {}}>
      <td style={{ color: '#64748b' }}>{index + 1}</td>
      <td style={{ fontWeight: '600', color: '#f8fafc' }}>{row.studentName}</td>
      <td style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <input
            type="text"
            inputMode="numeric"
            className="cell-input"
            value={val}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            placeholder="—"
            style={{
              width: '180px',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: '900',
              background: '#ffffff',
              color: isInvalid ? '#dc2626' : '#000000',
              border: isInvalid ? '3px solid #ef4444' : '2px solid #2563eb',
              borderRadius: '12px',
              padding: '10px'
            }}
          />
          {isInvalid && (
            <div style={{
              position: 'absolute',
              top: '-25px',
              right: '0',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              تتجاوز الحد ({totalScore})
            </div>
          )}
        </div>
        {row.editedBy && (
          <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '11px' }}>
            آخر تعديل بواسطة: {row.editedBy}
          </div>
        )}
      </td>
    </tr>
  );
});

function ExamResultsPage({ students, grades, exams, initialExamId, onBack, onSuccess, currentUser, currentAcademicYear }) {
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || '');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const lastLoadedExamId = useRef(null);

  const selectedExam = useMemo(() =>
    exams.find((exam) => String(exam.id) === String(selectedExamId)) || null,
    [exams, selectedExamId]
  );
  const isSecondRound = normalizeResultText(selectedExam?.course) === normalizeResultText('الدور الثاني');
  const selectedGrade = grades.find((grade) => String(grade.id) === String(selectedExam?.gradeId));

  const loadExistingResults = async () => {
    if (!selectedExam) return;

    setIsLoading(true);
    try {
      const [existingScores, finalResults] = await Promise.all([
        getExamResults(selectedExam.id),
        isSecondRound ? getFinalResults(currentAcademicYear) : Promise.resolve([]),
      ]);

      let eligibleStudentIds = null;
      if (isSecondRound) {
        eligibleStudentIds = new Set(finalResults
          .filter((result) =>
            String(result.gradeId) === String(selectedExam.gradeId)
            && String(result.divisionId) === String(selectedExam.divisionId)
            && result.studentStatus === 'نشط'
          )
          .filter((result) => calculateYearEndSubjects(result, selectedGrade).some((subject) =>
            normalizeResultText(subject.name) === normalizeResultText(selectedExam.subject)
            && subject.failedInFirstRound
          ))
          .map((result) => String(result.id)));
      }

      const filteredStudents = sortStudentsAlphabetically(students.filter(s =>
        String(s.gradeId) === String(selectedExam.gradeId) &&
        String(s.divisionId) === String(selectedExam.divisionId) &&
        (!eligibleStudentIds || eligibleStudentIds.has(String(s.id)))
      ));

      const nextRows = filteredStudents.map((student) => {
        const existing = existingScores.find(es => String(es.student_id) === String(student.id));
        return {
          studentId: student.id,
          studentName: student.fullName,
          score: (existing && existing.score !== null && existing.score !== undefined) ? String(existing.score) : '',
          editedBy: existing?.edited_by || '',
        };
      });

      setRows(nextRows);
      lastLoadedExamId.current = `${selectedExam.id}:${currentAcademicYear}`;
    } catch (error) {
      console.error('Failed to load existing results', error);
      setMessage('فشل في تحميل النتائج السابقة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadKey = selectedExam ? `${selectedExam.id}:${currentAcademicYear}` : null;
    if (selectedExam && loadKey !== lastLoadedExamId.current) {
      loadExistingResults();
    }
  }, [selectedExam?.id, currentAcademicYear]);

  // Use useCallback to prevent unnecessary re-renders of ResultRow
  const updateScore = useCallback((studentId, value) => {
    setRows((current) => {
      const rowIndex = current.findIndex(r => String(r.studentId) === String(studentId));
      if (rowIndex === -1) return current;
      if (current[rowIndex].score === value) return current;

      const newRows = [...current];
      newRows[rowIndex] = { ...newRows[rowIndex], score: value };
      return newRows;
    });
  }, []);

  const handleSave = async () => {
    if (!selectedExam) return;

    // Final validation check for ALL rows before saving
    const invalidRows = rows.filter(row => {
      const num = Number(row.score);
      return row.score !== '' && !isNaN(num) && (num > selectedExam.totalScore || num < 0);
    });

    if (invalidRows.length > 0) {
      alert(`عذراً، يوجد (${invalidRows.length}) طلاب لديهم درجات تتجاوز الحد المسموح به. يرجى تصحيح الدرجات المحددة باللون الأحمر أولاً.`);
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      await saveExamResults(selectedExam.id, rows, currentUser.id, currentAcademicYear);
      setRows((current) => current.map((row) => ({
        ...row,
        editedBy: row.score !== '' ? currentUser.full_name : row.editedBy,
      })));

      if (onSuccess) {
        onSuccess();
      } else {
        setMessage('تم حفظ النتائج بنجاح ✅');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save exam results', error);
      setMessage('❌ فشل حفظ النتائج في قاعدة البيانات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="exam-results-module">
      <div className="module-toolbar">
        <div className="title-section">
          {onBack && (
            <button className="back-link" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', marginLeft: '10px', color: '#94a3b8' }}>
              <span>‹</span> عودة لقائمة الامتحانات
            </button>
          )}
        </div>

        <div className="module-actions">
          <label className="filter-control" style={{ color: '#e2e8f0' }}>
            الامتحان المختار:
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">-- اختر الامتحان من القائمة --</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id} style={{ background: '#1e293b' }}>
                  {exam.name} - {exam.subject} ({exam.course})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!selectedExam ? (
        <div className="empty-state-card" style={{ marginTop: '20px', background: 'rgba(255,255,255,0.05)' }}>
          <p>يرجى اختيار امتحان من القائمة المنسدلة للبدء في إدخال الدرجات.</p>
        </div>
      ) : isLoading ? (
        <div className="empty-state-card" style={{ marginTop: '20px' }}>
          <p>جاري تحميل بيانات الطلاب والنتائج...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state-card" style={{ marginTop: '20px' }}>
          <p>
            {isSecondRound
              ? 'لا يوجد طلاب راسبون في هذه المادة لإدخال درجات الدور الثاني.'
              : 'لا يوجد طلاب مسجلين في هذا الصف والشعبة حالياً.'}
          </p>
        </div>
      ) : (
        <section className="table-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="table-toolbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff' }}>إدخال نتائج: {selectedExam.name}</h3>
                  <p style={{ color: '#94a3b8' }}>
                    المادة: <strong>{selectedExam.subject}</strong>
                    {isSecondRound ? ' | درجات الدور الثاني للطلاب الراسبين في المادة فقط' : ''}
                    {' | الدرجة النهائية: '}<strong>{selectedExam.totalScore}</strong>
                  </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
                style={{ padding: '10px 30px' }}
              >
                {isSaving ? 'جاري الحفظ...' : '💾 حفظ النتائج'}
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px', color: '#94a3b8' }}>#</th>
                  <th style={{ color: '#94a3b8' }}>اسم الطالب</th>
                  <th style={{ textAlign: 'center', color: '#94a3b8' }}>الدرجة (من {selectedExam.totalScore})</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <ResultRow
                    key={row.studentId}
                    row={row}
                    index={index}
                    totalScore={selectedExam.totalScore}
                    onUpdate={updateScore}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="module-toolbar footer-toolbar" style={{ justifyContent: 'center', padding: '30px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '14px 60px', fontSize: '18px', borderRadius: '16px' }}
              onClick={handleSave}
              disabled={isSaving}
            >
               {isSaving ? 'جاري الحفظ...' : '💾 اعتماد وحفظ نتائج الطلاب'}
            </button>
          </div>

          {message && (
            <div className={`toast ${message.includes('فشل') ? 'error-toast' : ''}`} style={{
              position: 'fixed',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: message.includes('✅') ? '#10b981' : '#ef4444',
              color: '#fff',
              padding: '15px 40px',
              borderRadius: '50px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              zIndex: 9999,
              fontWeight: 'bold'
            }}>
              {message}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export default ExamResultsPage;
