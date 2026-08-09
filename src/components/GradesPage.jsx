import { useMemo, useState } from 'react';
import { buildGradeRows, gradeEntrySubjects } from '../services/gradeEntryService';

function GradesPage({ students, grades, divisions, exams }) {
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('الرياضيات');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [rows, setRows] = useState([]);
  const [savedMessage, setSavedMessage] = useState('');

  const availableDivisions = useMemo(() => {
    if (!selectedGradeId) return divisions;
    return divisions.filter((division) => division.gradeId === Number(selectedGradeId));
  }, [divisions, selectedGradeId]);

  const availableExams = useMemo(() => {
    const filtered = exams.filter((exam) => {
      const matchesGrade = !selectedGradeId || exam.gradeId === Number(selectedGradeId);
      const matchesDivision = !selectedDivisionId || exam.divisionId === Number(selectedDivisionId);
      const matchesSubject = !selectedSubject || exam.subject === selectedSubject;
      return matchesGrade && matchesDivision && matchesSubject;
    });

    return filtered;
  }, [exams, selectedDivisionId, selectedGradeId, selectedSubject]);

  const handleLoadStudents = () => {
    const nextRows = buildGradeRows(students, selectedGradeId, selectedDivisionId, selectedExamId, selectedSubject);
    setRows(nextRows);
    setSavedMessage('');
  };

  const updateScore = (studentId, value) => {
    setRows((current) =>
      current.map((row) => {
        if (row.studentId !== studentId) return row;
        const numericValue = Number(value);
        const safeScore = Number.isNaN(numericValue) ? '' : numericValue;
        return { ...row, score: safeScore, total: safeScore };
      }),
    );
  };

  const handleSave = () => {
    if (rows.length === 0) {
      setSavedMessage('لا توجد درجات للحفظ.');
      return;
    }

    setSavedMessage(`تم حفظ ${rows.length} درجة بنجاح.`);
  };

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <div className="module-actions">
          <label className="filter-control">
            الصف
            <select value={selectedGradeId} onChange={(event) => setSelectedGradeId(event.target.value)}>
              <option value="">اختر الصف</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            الشعبة
            <select value={selectedDivisionId} onChange={(event) => setSelectedDivisionId(event.target.value)}>
              <option value="">اختر الشعبة</option>
              {availableDivisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            المادة
            <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
              {gradeEntrySubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            الامتحان
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              <option value="">اختر الامتحان</option>
              {availableExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={handleLoadStudents}>
            عرض الطلاب
          </button>
        </div>
        <div className="module-summary">
          <span>{rows.length} سجل</span>
        </div>
      </div>

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>إدخال الدرجات</h3>
            <p>أدخل درجة كل طالب وسيتم احتساب المجموع تلقائيًا.</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state-card">
            <p>لم يتم عرض الطلاب بعد.</p>
            <span>اختر الخيارات ثم اضغط عرض الطلاب.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>الصف</th>
                  <th>الشعبة</th>
                  <th>الدرجة</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.studentName}</td>
                    <td>{row.grade}</td>
                    <td>{row.division}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={row.score}
                        onChange={(event) => updateScore(row.studentId, event.target.value)}
                        className="score-input"
                      />
                    </td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="module-toolbar footer-toolbar">
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          حفظ
        </button>
        {savedMessage ? <span className="module-summary">{savedMessage}</span> : null}
      </div>
    </section>
  );
}

export default GradesPage;
