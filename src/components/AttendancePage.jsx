import { useMemo, useState } from 'react';
import { attendanceStatuses, buildAttendanceRecords } from '../services/attendanceService';
import { saveAttendanceRecords, getAttendanceForDate } from '../services/databaseApi';

function AttendancePage({ students, grades, divisions }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [savedMessage, setSavedMessage] = useState('');

  const availableDivisions = useMemo(() => {
    if (!selectedGradeId) return divisions;
    return divisions.filter((division) => division.gradeId === Number(selectedGradeId));
  }, [divisions, selectedGradeId]);

  const visibleRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return attendanceRecords.filter((record) => {
      if (!term) return true;
      return `${record.studentName} ${record.grade} ${record.division}`.toLowerCase().includes(term);
    });
  }, [attendanceRecords, searchTerm]);

  const handleGradeChange = (event) => {
    const gradeId = event.target.value;
    setSelectedGradeId(gradeId);
    setSelectedDivisionId('');
  };

  const handleLoadStudents = async () => {
    const existing = await getAttendanceForDate(selectedDate);
    const nextRecords = buildAttendanceRecords(students, selectedGradeId, selectedDivisionId).map((record) => {
      const previous = existing.find((item) => item.studentId === record.studentId);
      return previous ? { ...record, status: previous.status } : record;
    });
    setAttendanceRecords(nextRecords);
    setSavedMessage('');
  };

  const updateStatus = (studentId, status) => {
    setAttendanceRecords((current) => current.map((record) => (record.studentId === studentId ? { ...record, status } : record)));
  };

  const handleSave = async () => {
    if (attendanceRecords.length === 0) {
      setSavedMessage('لا توجد سجلات للحفظ.');
      return;
    }

    try {
      await saveAttendanceRecords(selectedDate, attendanceRecords);
      setSavedMessage(`تم حفظ الحضور ل${attendanceRecords.length} طالب بتاريخ ${selectedDate}.`);
    } catch (error) {
      console.error('Failed to save attendance', error);
      setSavedMessage('فشل حفظ الحضور في قاعدة البيانات.');
    }
  };

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <div className="module-actions">
          <label className="filter-control">
            التاريخ
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label className="filter-control">
            الصف
            <select value={selectedGradeId} onChange={handleGradeChange}>
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
          <button type="button" className="btn btn-primary" onClick={handleLoadStudents}>
            عرض الطلاب
          </button>
        </div>
        <div className="module-summary">
          <span>{attendanceRecords.length} سجل</span>
        </div>
      </div>

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>قائمة الحضور</h3>
            <p>اختر الحالة المناسبة لكل طالب ثم احفظ البيانات.</p>
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم الطالب..."
            className="search-input"
          />
        </div>

        {visibleRecords.length === 0 ? (
          <div className="empty-state-card">
            <p>لم يتم عرض أي طلاب بعد.</p>
            <span>اختر التاريخ والصف والشعبة ثم اضغط عرض الطلاب.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>الصف</th>
                  <th>الشعبة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.studentId}>
                    <td>{record.studentName}</td>
                    <td>{record.grade}</td>
                    <td>{record.division}</td>
                    <td>
                      <div className="status-switch-group">
                        {attendanceStatuses.map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={record.status === status ? 'status-pill active' : 'status-pill'}
                            onClick={() => updateStatus(record.studentId, status)}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="module-toolbar footer-toolbar">
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          حفظ الحضور
        </button>
        {savedMessage ? <span className="module-summary">{savedMessage}</span> : null}
      </div>
    </section>
  );
}

export default AttendancePage;
