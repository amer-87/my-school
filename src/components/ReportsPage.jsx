import { useEffect, useMemo, useState } from 'react';
import { createBackup, getLatestBackupInfo, restoreBackup } from '../services/databaseApi';
import { compareArabicNames, sortStudentsAlphabetically } from '../services/studentService';

const attendanceData = [
  { studentId: 1, studentName: 'أحمد محمد علي', status: 'حاضر', date: '2026-07-30' },
  { studentId: 2, studentName: 'سارة خالد سالم', status: 'غائب', date: '2026-07-30' },
  { studentId: 1, studentName: 'أحمد محمد علي', status: 'حاضر', date: '2026-07-31' },
  { studentId: 2, studentName: 'سارة خالد سالم', status: 'حاضر', date: '2026-07-31' },
];

const gradesData = [
  { studentId: 1, studentName: 'أحمد محمد علي', subject: 'الرياضيات', score: 92, grade: 'ممتاز' },
  { studentId: 2, studentName: 'سارة خالد سالم', subject: 'الرياضيات', score: 86, grade: 'جيد جدًا' },
  { studentId: 1, studentName: 'أحمد محمد علي', subject: 'العلوم', score: 89, grade: 'جيد جدًا' },
  { studentId: 2, studentName: 'سارة خالد سالم', subject: 'العلوم', score: 78, grade: 'جيد' },
];

const feeData = [
  { studentId: 1, studentName: 'أحمد محمد علي', total: 18000, paid: 10000, remaining: 8000, status: 'متبقي' },
  { studentId: 2, studentName: 'سارة خالد سالم', total: 15000, paid: 15000, remaining: 0, status: 'مكتمل' },
];

function ReportsPage({ students }) {
  const [reportType, setReportType] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupMessage, setBackupMessage] = useState('');

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortStudentsAlphabetically(students.filter((student) => {
      const haystack = `${student.fullName} ${student.grade} ${student.division} ${student.phone}`.toLowerCase();
      return (!term || haystack.includes(term));
    }));
  }, [searchTerm, students]);

  const filteredAttendance = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return attendanceData.filter((item) => {
      const haystack = `${item.studentName} ${item.status}`.toLowerCase();
      const matchesFilter = statusFilter === 'all' || item.status === statusFilter;
      return matchesFilter && (!term || haystack.includes(term));
    }).sort((first, second) => compareArabicNames(first.studentName, second.studentName));
  }, [searchTerm, statusFilter]);

  const filteredGrades = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return gradesData.filter((item) => {
      const haystack = `${item.studentName} ${item.subject} ${item.grade}`.toLowerCase();
      return !term || haystack.includes(term);
    }).sort((first, second) => compareArabicNames(first.studentName, second.studentName));
  }, [searchTerm]);

  const filteredFees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return feeData.filter((item) => {
      const haystack = `${item.studentName} ${item.status}`.toLowerCase();
      return !term || haystack.includes(term);
    }).sort((first, second) => compareArabicNames(first.studentName, second.studentName));
  }, [searchTerm]);

  useEffect(() => {
    const loadBackupInfo = async () => {
      try {
        const info = await getLatestBackupInfo();
        setBackupInfo(info);
      } catch (error) {
        console.error('Failed to load backup info', error);
      }
    };

    loadBackupInfo();
  }, []);

  useEffect(() => {
    if (!backupMessage) return undefined;

    const timer = window.setTimeout(() => setBackupMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [backupMessage]);

  const handleBackup = async () => {
    try {
      const result = await createBackup();
      if (result?.canceled) {
        setBackupMessage('تم إلغاء اختيار موقع الحفظ.');
        return;
      }

      const info = await getLatestBackupInfo();
      setBackupInfo(info);
      setBackupMessage('تم إنشاء نسخة احتياطية بنجاح.');
    } catch (error) {
      console.error('Failed to create backup', error);
      setBackupMessage('فشل إنشاء النسخة الاحتياطية.');
    }
  };

  const handleRestore = async () => {
    try {
      const result = await restoreBackup();
      if (result?.canceled) {
        setBackupMessage('تم إلغاء اختيار ملف الاستعادة.');
        return;
      }

      const info = await getLatestBackupInfo();
      setBackupInfo(info);
      setBackupMessage('تم استعادة النسخة الاحتياطية بنجاح.');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error('Failed to restore backup', error);
      setBackupMessage('فشل استعادة النسخة الاحتياطية.');
    }
  };

  const exportCsv = () => {
    let rows = [];
    if (reportType === 'students') {
      rows = filteredStudents.map((student) => [student.fullName, student.grade, student.division, student.phone, student.status]);
    } else if (reportType === 'attendance') {
      rows = filteredAttendance.map((item) => [item.studentName, item.status, item.date]);
    } else if (reportType === 'grades') {
      rows = filteredGrades.map((item) => [item.studentName, item.subject, item.score, item.grade]);
    } else if (reportType === 'fees') {
      rows = filteredFees.map((item) => [item.studentName, item.total, item.paid, item.remaining, item.status]);
    }

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>تقرير</title></head><body><h2>تقرير المدرسة</h2><p>تم إنشاء التقرير بنجاح.</p></body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <div className="module-actions">
          <label className="filter-control">
            نوع التقرير
            <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
              <option value="students">تقرير الطلاب</option>
              <option value="attendance">تقرير الحضور</option>
              <option value="absence">تقرير الغياب</option>
              <option value="grades">تقرير الدرجات</option>
              <option value="fees">تقرير الأقساط</option>
            </select>
          </label>
          <label className="filter-control">
            البحث
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ابحث باسم الطالب أو المادة" />
          </label>
          {reportType === 'attendance' ? (
            <label className="filter-control">
              الحالة
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">الكل</option>
                <option value="حاضر">حاضر</option>
                <option value="غائب">غائب</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="module-summary">
          <span>{reportType === 'students' ? filteredStudents.length : reportType === 'attendance' ? filteredAttendance.length : reportType === 'grades' ? filteredGrades.length : reportType === 'fees' ? filteredFees.length : 0} سجل</span>
        </div>
      </div>

      <section className="cards">
        <article className="card">
          <h3>إجمالي الطلاب</h3>
          <p style={{ fontSize: '24px', margin: '8px 0 0' }}>{students.length}</p>
        </article>
        <article className="card">
          <h3>الحضور والغياب</h3>
          <p style={{ fontSize: '24px', margin: '8px 0 0' }}>{attendanceData.filter((item) => item.status === 'حاضر').length} حاضر / {attendanceData.filter((item) => item.status === 'غائب').length} غائب</p>
        </article>
        <article className="card">
          <h3>النسخ الاحتياطي</h3>
          <p style={{ margin: '8px 0 6px' }}>آخر نسخة: {backupInfo?.timestamp || 'لا توجد نسخة احتياطية بعد'}</p>
          <div className="module-actions" style={{ marginTop: '10px' }}>
            <button type="button" className="btn btn-primary" onClick={handleBackup}>
              إنشاء نسخة احتياطية
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleRestore}>
              استعادة نسخة
            </button>
          </div>
        </article>
      </section>

      {backupMessage ? <div className="toast">{backupMessage}</div> : null}

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>نتائج التقرير</h3>
            <p>يمكنك البحث والتصفية ثم تصدير البيانات.</p>
          </div>
          <div className="module-actions">
            <button type="button" className="btn btn-secondary" onClick={exportPdf}>تصدير PDF</button>
            <button type="button" className="btn btn-primary" onClick={exportCsv}>تصدير Excel</button>
          </div>
        </div>

        {reportType === 'students' ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>اسم الطالب</th>
                  <th>الصف</th>
                  <th>الشعبة</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td>{student.fullName}</td>
                    <td>{student.grade}</td>
                    <td>{student.division}</td>
                    <td>{student.phone}</td>
                    <td>{student.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'attendance' ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>اسم الطالب</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((item, index) => (
                  <tr key={`${item.studentId}-${item.date}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.studentName}</td>
                    <td>{item.status}</td>
                    <td>{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'absence' ? (
          <div className="empty-state-card">
            <p>لا توجد غيابات مسجلة حالياً.</p>
          </div>
        ) : reportType === 'grades' ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>اسم الطالب</th>
                  <th>المادة</th>
                  <th>الدرجة</th>
                  <th>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((item, index) => (
                  <tr key={`${item.studentId}-${item.subject}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.studentName}</td>
                    <td>{item.subject}</td>
                    <td>{item.score}</td>
                    <td>{item.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>اسم الطالب</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((item, index) => (
                  <tr key={item.studentId}>
                    <td>{index + 1}</td>
                    <td>{item.studentName}</td>
                    <td>{item.total}</td>
                    <td>{item.paid}</td>
                    <td>{item.remaining}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default ReportsPage;
