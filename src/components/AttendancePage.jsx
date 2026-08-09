// Attendance Management Page - Pro Version 3.1
import { useMemo, useState, useEffect } from 'react';
import { attendanceStatuses, buildAttendanceRecords } from '../services/attendanceService';
import { saveAttendanceRecords, getAttendanceForDate, getEnrichedAttendance } from '../services/databaseApi';

function AttendancePage({ students, grades, divisions, currentUser, currentAcademicYear, onSuccess }) {
  const [viewMode, setViewMode] = useState('absentees'); // 'dashboard', 'record', 'absentees', 'leaves'
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  });
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dailyStats, setDailyStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0 });
  const [enrichedData, setEnrichedData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load dashboard/stats and list data
  const loadDailyData = async () => {
    setLoading(true);
    try {
      const data = await getEnrichedAttendance(selectedDate);
      const records = Array.isArray(data) ? data : [];
      setEnrichedData(records);

      const stats = { present: 0, absent: 0, late: 0, leave: 0, total: records.length };
      records.forEach(r => {
        if (r.status === 'حاضر') stats.present++;
        else if (r.status === 'غائب') stats.absent++;
        else if (r.status === 'متأخر') stats.late++;
        else if (r.status === 'إجازة') stats.leave++;
      });
      setDailyStats(stats);
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode !== 'record') {
      loadDailyData();
    }
  }, [selectedDate, viewMode]);

  const availableDivisions = useMemo(() => {
    if (!selectedGradeId) return divisions;
    return divisions.filter((division) => division.gradeId === Number(selectedGradeId));
  }, [divisions, selectedGradeId]);

  const handleGradeChange = (event) => {
    const gradeId = event.target.value;
    setSelectedGradeId(gradeId);
    setSelectedDivisionId('');
  };

  const handleLoadStudentsForRecording = async () => {
    setLoading(true);
    try {
      const existing = await getAttendanceForDate(selectedDate);
      const nextRecords = buildAttendanceRecords(students, selectedGradeId, selectedDivisionId).map((record) => {
        const previous = existing.find((item) => item.studentId === record.studentId);
        return previous ? { ...record, status: previous.status } : record;
      });
      setAttendanceRecords(nextRecords);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setAttendanceRecords((current) => current.map((record) => (record.studentId === studentId ? { ...record, status } : record)));
  };

  const handleSave = async () => {
    if (attendanceRecords.length === 0) return;
    try {
      await saveAttendanceRecords(selectedDate, attendanceRecords, currentUser.id, currentAcademicYear);
      const msg = `تم حفظ الحضور لـ ${attendanceRecords.length} طالب بتاريخ ${selectedDate}.`;
      setViewMode('absentees');
      if (onSuccess) onSuccess(msg);
      loadDailyData();
    } catch (error) {
      console.error(error);
      alert('فشل حفظ الحضور');
    }
  };

  const filteredEnriched = useMemo(() => {
    let list = enrichedData;
    if (viewMode === 'absentees') list = enrichedData.filter(r => r.status === 'غائب');
    if (viewMode === 'leaves') list = enrichedData.filter(r => r.status === 'إجازة');

    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(r =>
      r.student_name?.toLowerCase().includes(term) ||
      r.grade_name?.toLowerCase().includes(term) ||
      r.division_name?.toLowerCase().includes(term)
    );
  }, [enrichedData, viewMode, searchTerm]);

  // Shared Toolbar for Lists (Absentees / Leaves)
  const renderListToolbar = () => (
    <div className="module-toolbar">
      <div className="module-actions">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: 'auto' }} />

        <div className="tabs-container">
          <button
            className={`tab-btn ${viewMode === 'absentees' ? 'active' : ''}`}
            onClick={() => setViewMode('absentees')}
          >
            🚫 كشف الغياب ({dailyStats.absent})
          </button>
          <button
            className={`tab-btn ${viewMode === 'leaves' ? 'active' : ''}`}
            onClick={() => setViewMode('leaves')}
          >
            📝 كشف الإجازات ({dailyStats.leave})
          </button>
        </div>
      </div>

      <div className="module-actions">
        <button className="btn btn-primary" onClick={() => { setViewMode('record'); setAttendanceRecords([]); }}>
          ➕ تسجيل حضور جديد
        </button>
        <button className="btn btn-secondary" onClick={() => setViewMode('dashboard')} title="عرض لوحة الإحصائيات">
          📊 الإحصائيات
        </button>
      </div>
    </div>
  );

  // Stats Dashboard View
  if (viewMode === 'dashboard') {
    return (
      <div className="attendance-dashboard">
        <div className="module-toolbar">
           <button className="back-link" onClick={() => setViewMode('absentees')}>
            <span>‹</span> عودة لكشف الغياب
          </button>
          <div className="module-actions">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: 'auto' }} />
          </div>
        </div>

        <div className="stats-grid">
          <div className="card stat-card" style={{ background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}>
            <span className="stat-label" style={{ color: '#94a3b8' }}>تم تسجيلهم اليوم</span>
            <h2 className="stat-value" style={{ color: '#f8fafc' }}>{dailyStats.total}</h2>
          </div>
          <div className="card stat-card clickable-row" onClick={() => setViewMode('absentees')} style={{ background: 'rgba(255,255,255,0.05)', borderRight: '4px solid #ef4444', color: '#f8fafc' }}>
            <span className="stat-label" style={{ color: '#94a3b8' }}>إجمالي الغيابات</span>
            <h2 className="stat-value" style={{ color: '#ef4444' }}>{dailyStats.absent}</h2>
          </div>
          <div className="card stat-card clickable-row" onClick={() => setViewMode('leaves')} style={{ background: 'rgba(255,255,255,0.05)', borderRight: '4px solid #8b5cf6', color: '#f8fafc' }}>
            <span className="stat-label" style={{ color: '#94a3b8' }}>إجمالي الإجازات</span>
            <h2 className="stat-value" style={{ color: '#8b5cf6' }}>{dailyStats.leave}</h2>
          </div>
          <div className="card stat-card" style={{ background: 'rgba(255,255,255,0.05)', borderRight: '4px solid #10b981', color: '#f8fafc' }}>
            <span className="stat-label" style={{ color: '#94a3b8' }}>نسبة الحضور</span>
            <h2 className="stat-value" style={{ color: '#10b981' }}>
              {dailyStats.total > 0 ? Math.round(((dailyStats.present + dailyStats.late) / dailyStats.total) * 100) : 0}%
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // Recording Mode UI
  if (viewMode === 'record') {
    return (
      <section className="students-module">
        <div className="module-toolbar">
          <button className="back-link" onClick={() => setViewMode('absentees')}>
            <span>‹</span> إلغاء والعودة
          </button>
          <div className="module-actions">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: 'auto' }} />
            <select value={selectedGradeId} onChange={handleGradeChange} style={{ width: 'auto' }}>
              <option value="">اختر الصف</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={selectedDivisionId} onChange={(e) => setSelectedDivisionId(e.target.value)} style={{ width: 'auto' }}>
              <option value="">اختر الشعبة</option>
              {availableDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleLoadStudentsForRecording} disabled={!selectedDivisionId}>عرض الطلاب</button>
          </div>
        </div>

        <section className="table-card">
           <div className="table-toolbar">
              <h3>تسجيل حضور: {grades.find(g => g.id === Number(selectedGradeId))?.name || '...'}</h3>
           </div>
           <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>اسم الطالب</th><th>الصف</th><th>الحالة</th></tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((r, i) => (
                    <tr key={r.studentId}>
                      <td style={{ color: '#e2e8f0' }}>{i+1}</td>
                      <td style={{ fontWeight: '600', color: '#f8fafc' }}>{r.studentName}</td>
                      <td style={{ color: '#e2e8f0' }}>{r.grade}</td>
                      <td>
                        <div className="status-switch-group">
                          {attendanceStatuses.map(s => (
                            <button key={s} className={r.status === s ? 'status-pill active' : 'status-pill'} onClick={() => updateStatus(r.studentId, s)}>{s}</button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attendanceRecords.length === 0 && !loading && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>يرجى اختيار الصف والشعبة ثم الضغط على عرض الطلاب.</td></tr>}
                  {loading && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</td></tr>}
                </tbody>
              </table>
           </div>
        </section>
        <div className="module-toolbar footer-toolbar" style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={attendanceRecords.length === 0}>حفظ الحضور والعودة</button>
        </div>
      </section>
    );
  }

  // DEFAULT VIEW: Absentees or Leaves List
  return (
    <section className="students-module">
      {renderListToolbar()}

      <section className="table-card">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span style={{ fontSize: '24px' }}>{viewMode === 'absentees' ? '🚫' : '📝'}</span>
             <div>
                <h3>{viewMode === 'absentees' ? 'كشف الغيابات لهذا اليوم' : 'كشف الإجازات لهذا اليوم'}</h3>
             </div>
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الطالب أو الصف..."
            className="search-input"
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>الصف الدراسي</th>
                <th>الشعبة</th>
                <th>هاتف ولي الأمر</th>
                <th style={{ textAlign: 'center' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnriched.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '600', color: '#f8fafc' }}>{r.student_name}</td>
                  <td style={{ color: '#e2e8f0' }}>{r.grade_name}</td>
                  <td style={{ color: '#e2e8f0' }}>{r.division_name}</td>
                  <td style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '500' }}>{r.guardian_phone}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      background: viewMode === 'absentees' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: viewMode === 'absentees' ? '#f87171' : '#a78bfa',
                      padding: '6px 16px',
                      borderRadius: '25px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      border: `1px solid ${viewMode === 'absentees' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                    }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEnriched.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    {loading ? 'جاري التحميل...' : 'لا توجد سجلات مطابقة لهذا اليوم.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default AttendancePage;
