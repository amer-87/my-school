import React, { useState, useEffect, useMemo } from 'react';
import { getSchedule, saveFullSchedule } from '../services/databaseApi';
import { examSubjects } from '../services/examService';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIODS = [1, 2, 3, 4, 5, 6];

function SchedulePage({ grades, divisions, teachers, currentUser, currentAcademicYear }) {
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [localSchedule, setLocalSchedule] = useState({}); // Key: "day-period", Value: { subject, teacherId }
  const [dbSchedule, setDbSchedule] = useState([]);
  const [errorBanner, setErrorBanner] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadScheduleData = async () => {
    try {
      const data = await getSchedule();
      setDbSchedule(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, []);

  // When division changes, populate local schedule from DB data
  useEffect(() => {
    if (!selectedDivisionId) {
      setLocalSchedule({});
      return;
    }

    const initialLocal = {};
    dbSchedule
      .filter(s => s.division_id === Number(selectedDivisionId))
      .forEach(s => {
        initialLocal[`${s.day_name}-${s.period_number}`] = {
          subject: s.subject_name || '',
          teacherId: s.teacher_id || ''
        };
      });
    setLocalSchedule(initialLocal);
    setErrorBanner('');
  }, [selectedDivisionId, dbSchedule]);

  const availableDivisions = useMemo(() => {
    return divisions.filter(d => d.gradeId === Number(selectedGradeId));
  }, [divisions, selectedGradeId]);

  const selectedGrade = useMemo(() => {
    return grades.find(g => g.id === Number(selectedGradeId));
  }, [grades, selectedGradeId]);

  const handleLocalChange = (day, period, field, value) => {
    const key = `${day}-${period}`;

    if (field === 'teacherId' && value) {
      const conflict = getTeacherConflict(day, period, value);
      if (conflict) {
        alert(`تنبيه: هذا المعلم مشغول حالياً في (${conflict}) في نفس الحصة واليوم.`);
      }
    }

    setLocalSchedule(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { subject: '', teacherId: '' }),
        [field]: value
      }
    }));

    // Clear error when making changes
    if (errorBanner) setErrorBanner('');
  };

  const getTeacherConflict = (day, period, teacherId) => {
    if (!teacherId) return null;

    const conflict = dbSchedule.find(s =>
      s.division_id !== Number(selectedDivisionId) &&
      s.day_name === day &&
      s.period_number === period &&
      s.teacher_id === Number(teacherId)
    );

    if (conflict) {
      // Find division and grade names for the conflict
      const div = divisions.find(d => d.id === conflict.division_id);
      const grade = grades.find(g => g.id === div?.gradeId);
      return `${grade?.name || ''} - ${div?.name || ''}`;
    }
    return null;
  };

  const hasConflicts = useMemo(() => {
    for (const key in localSchedule) {
      const parts = key.split('-');
      const day = parts[0];
      const period = Number(parts[1]);
      if (getTeacherConflict(day, period, localSchedule[key].teacherId)) return true;
    }
    return false;
  }, [localSchedule, dbSchedule, selectedDivisionId]);

  const handleSaveSchedule = async () => {
    if (!selectedDivisionId) return;

    if (hasConflicts) {
      alert('لا يمكن حفظ الجدول لوجود تضارب في حصص المعلمين. يرجى حل التضاربات (المحددة باللون الأحمر) أولاً.');
      return;
    }

    setIsSaving(true);
    setErrorBanner('');

    const cellsToSave = [];
    for (const day of DAYS) {
      for (const period of PERIODS) {
        const cell = localSchedule[`${day}-${period}`] || { subject: '', teacherId: '' };
        cellsToSave.push({
          dayName: day,
          periodNumber: period,
          subjectName: cell.subject,
          teacherId: cell.teacherId ? Number(cell.teacherId) : null
        });
      }
    }

    try {
      const result = await saveFullSchedule(Number(selectedDivisionId), cellsToSave, currentUser.id, currentAcademicYear);

      if (result.error === 'CONFLICT') {
        setErrorBanner(result.message);
        setIsSaving(false);
        return;
      }

      await loadScheduleData();
      alert('تم حفظ الجدول بنجاح.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="schedule-page">
      <div className="schedule-header-actions">
        <button
          className="btn btn-primary schedule-save-btn"
          onClick={handleSaveSchedule}
          disabled={!selectedDivisionId || isSaving}
        >
          {isSaving ? 'جاري الحفظ...' : '💾 حفظ الجدول'}
        </button>
      </div>

      <div className="schedule-filters-card">
        <div className="filter-item">
          <label>المرحلة: {selectedGrade?.level || '—'}</label>
        </div>
        <div className="filter-item">
          <label>الصف:</label>
          <select
            value={selectedGradeId}
            onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedDivisionId(''); }}
          >
            <option value="">اختر الصف...</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="filter-item">
          <label>الشعبة:</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            disabled={!selectedGradeId}
          >
            <option value="">اختر الشعبة...</option>
            {availableDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {errorBanner && (
        <div className="conflict-banner">
          <span className="banner-icon">🚫</span>
          <p>{errorBanner}</p>
        </div>
      )}

      {!selectedDivisionId ? (
        <div className="empty-state-card" style={{ marginTop: '20px' }}>
          <p>يرجى اختيار الصف والشعبة لبناء الجدوال الأسبوعية.</p>
        </div>
      ) : (
        <div className="schedule-grid-wrapper">
          <table className="schedule-horizontal-grid">
            <thead>
              <tr>
                <th className="day-header">اليوم</th>
                {PERIODS.map(p => (
                  <th key={p}>الدرس {p === 1 ? 'الأول' : p === 2 ? 'الثاني' : p === 3 ? 'الثالث' : p === 4 ? 'الرابع' : p === 5 ? 'الخامس' : p === 6 ? 'السادس' : p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td className="row-day-name">{day}</td>
                  {PERIODS.map(period => {
                    const cell = localSchedule[`${day}-${period}`] || { subject: '', teacherId: '' };
                    const conflictLocation = getTeacherConflict(day, period, cell.teacherId);

                    return (
                      <td key={period}>
                        <div className={`schedule-cell-card ${conflictLocation ? 'has-conflict' : ''}`}>
                          <select
                            className="cell-subject-input"
                            value={cell.subject}
                            onChange={(e) => handleLocalChange(day, period, 'subject', e.target.value)}
                            style={{
                              background: '#1e293b',
                              color: '#ffffff',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '8px',
                              width: '100%',
                              fontWeight: '700'
                            }}
                          >
                            <option value="">-- المادة --</option>
                            {examSubjects.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>

                          <select
                            className="cell-teacher-select"
                            value={cell.teacherId}
                            onChange={(e) => handleLocalChange(day, period, 'teacherId', e.target.value)}
                          >
                            <option value="">-- المعلم --</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                          </select>

                          {conflictLocation && (
                            <div className="conflict-badge" title={`هذا المعلم مشغول في ${conflictLocation}`}>
                              ⚠️ متضارب في: {conflictLocation}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SchedulePage;
