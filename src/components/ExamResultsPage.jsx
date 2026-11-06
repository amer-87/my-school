import { useMemo, useState } from 'react';
import { saveExamResults } from '../services/databaseApi';

function ExamResultsPage({ students, exams }) {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  const selectedExam = useMemo(() => exams.find((exam) => exam.id === Number(selectedExamId)) || null, [exams, selectedExamId]);

  const loadStudents = () => {
    if (!selectedExam) return;
    const nextRows = students.map((student) => ({ studentId: student.id, studentName: student.fullName, score: '' }));
    setRows(nextRows);
    setMessage('');
  };

  const updateScore = (studentId, value) => {
    setRows((current) => current.map((row) => (row.studentId === studentId ? { ...row, score: value } : row)));
  };

  const handleSave = async () => {
    if (!selectedExam) return;
    try {
      await saveExamResults(selectedExam.id, rows);
      setMessage(`تم حفظ درجات ${rows.length} طالبًا بنجاح.`);
    } catch (error) {
      console.error('Failed to save exam results', error);
      setMessage('فشل حفظ النتائج في قاعدة البيانات.');
    }
  };

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <div className="module-actions">
          <label className="filter-control">
            الامتحان
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              <option value="">اختر الامتحان</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={loadStudents}>عرض الطلاب</button>
        </div>
      </div>
      {rows.length ? (
        <section className="table-card">
          <div className="table-toolbar">
            <div>
              <h3>إدخال النتائج</h3>
              <p>أدخل كل درجة وسيتم حفظها في قاعدة البيانات.</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>الدرجة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.studentName}</td>
                    <td>
                      <input type="number" min="0" className="score-input" value={row.score} onChange={(event) => updateScore(row.studentId, event.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="module-toolbar footer-toolbar">
            <button type="button" className="btn btn-primary" onClick={handleSave}>حفظ النتائج</button>
            {message ? <span className="module-summary">{message}</span> : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default ExamResultsPage;
