import { useMemo, useState, useEffect } from 'react';
import ExamModal from './ExamModal';
import ConfirmDialog from './ConfirmDialog';
import ExamResultsPage from './ExamResultsPage';
import { createExamId, initialExams } from '../services/examService';
import { createExam, updateExam, deleteExam, getAppData, getExamsStats } from '../services/databaseApi';

function ExamsPage({ students, grades, divisions, currentUser, currentAcademicYear, viewState, setViewState }) {
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const { view: activeSubView, divisionId: selectedDivisionId, course: selectedCourse, examIdForResult: selectedExamIdForResult } = viewState;

  // Helper setters that update the global state in App.jsx
  const setActiveSubSubView = (val) => setViewState(prev => ({ ...prev, view: val }));
  const setSelectedDivisionId = (val) => setViewState(prev => ({ ...prev, divisionId: val }));
  const setSelectedCourse = (val) => setViewState(prev => ({ ...prev, course: val }));
  const setSelectedExamIdForResult = (val) => setViewState(prev => ({ ...prev, examIdForResult: val }));

  const handleSelectDivision = (divId) => {
    setViewState(prev => ({ ...prev, divisionId: divId, view: 'list' }));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState('create');

  const selectedDivision = useMemo(() =>
    divisions.find(d => String(d.id) === String(selectedDivisionId)),
    [divisions, selectedDivisionId]
  );

  const selectedGrade = useMemo(() =>
    grades.find(g => g.id === selectedDivision?.gradeId),
    [grades, selectedDivision]
  );

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await getAppData(currentAcademicYear);
      if (data && Array.isArray(data.exams)) {
        setExams(data.exams);
      }
      const examStats = await getExamsStats(currentAcademicYear);
      setStats(Array.isArray(examStats) ? examStats : []);
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [currentAcademicYear, activeSubView]); // Re-fetch when entering the list view to be sure

  const [formData, setFormData] = useState({
    subject: 'الرياضيات',
    gradeId: '',
    divisionId: '',
    examDate: new Date().toISOString().split('T')[0],
    totalScore: 100,
  });

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const filteredExams = useMemo(() => {
    if (!selectedDivisionId) return [];

    const divId = String(selectedDivisionId);
    const targetCourse = normalize(selectedCourse);

    return exams.filter(e =>
      String(e.divisionId) === divId &&
      normalize(e.course) === targetCourse
    );
  }, [exams, searchTerm, selectedDivisionId, selectedCourse]);

  const openCreateModal = () => {
    setMode('create');
    setSelectedExamId(null);
    setFormData({
      subject: 'الرياضيات',
      gradeId: selectedGrade?.id || '',
      divisionId: selectedDivision?.id || '',
      examDate: new Date().toISOString().split('T')[0],
      totalScore: 100,
      course: selectedCourse,
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (exam) => {
    setMode('edit');
    setSelectedExamId(exam.id);
    setFormData({
      subject: exam.subject,
      gradeId: exam.gradeId,
      divisionId: exam.divisionId,
      examDate: exam.examDate,
      totalScore: exam.totalScore,
      course: exam.course || 'الكورس الأول',
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleEnterResults = (examId) => {
    setSelectedExamIdForResult(examId);
    setActiveSubSubView('results');
  };

  const handleResultsFinished = () => {
    setActiveSubSubView('list');
    setToastMessage('تم حفظ درجات الطلاب بنجاح.');
    loadExams();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === 'gradeId') {
        const nextGradeId = Number(value);
        const nextDivision = divisions.find((division) => division.gradeId === nextGradeId);
        return {
          ...current,
          gradeId: nextGradeId,
          divisionId: nextDivision?.id || '',
        };
      }

      return { ...current, [name]: name === 'totalScore' ? Number(value) : value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const finalData = { ...formData, name: formData.subject };
    const duplicateExam = exams.some((exam) =>
      String(exam.id) !== String(selectedExamId) &&
      String(exam.divisionId) === String(finalData.divisionId) &&
      normalize(exam.subject) === normalize(finalData.subject) &&
      normalize(exam.course) === normalize(finalData.course)
    );

    if (duplicateExam) {
      setErrorMessage(`تم إدخال امتحان مادة ${finalData.subject} في ${finalData.course} لهذه الشعبة مسبقاً.`);
      return;
    }

    try {
      if (mode === 'edit' && selectedExamId) {
        const saved = await updateExam(selectedExamId, { id: selectedExamId, ...finalData }, currentUser.id);
        setExams((current) => current.map((exam) => (exam.id === selectedExamId ? saved : exam)));
        setToastMessage('تم تعديل الامتحان بنجاح.');
      } else {
        const saved = await createExam({ id: createExamId(exams), ...finalData }, currentUser.id, currentAcademicYear);
        setExams((current) => [...current, saved]);
        setToastMessage('تم إضافة الامتحان بنجاح.');
      }
      setIsModalOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to save exam', error);
      setErrorMessage(error.message || 'فشل حفظ الامتحان في قاعدة البيانات.');
    }
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteExam(deleteTargetId, currentUser.id);
      setExams((current) => current.filter((exam) => exam.id !== deleteTargetId));
      setDeleteTargetId(null);
      setToastMessage('تم حذف الامتحان بنجاح.');
    } catch (error) {
      console.error('Failed to delete exam', error);
      setToastMessage('فشل حذف الامتحان من قاعدة البيانات.');
    }
  };

  const gradeName = (gradeId) => grades.find((grade) => grade.id === gradeId)?.name || 'غير محدد';
  const divisionName = (divisionId) => divisions.find((division) => division.id === divisionId)?.name || 'غير محدد';

  if (activeSubView === 'results') {
    return (
      <ExamResultsPage
        students={students}
        exams={exams}
        initialExamId={selectedExamIdForResult}
        onBack={() => setActiveSubSubView('list')}
        onSuccess={handleResultsFinished}
        currentUser={currentUser}
        currentAcademicYear={currentAcademicYear}
      />
    );
  }

  if (activeSubView === 'selection') {
    return (
      <div className="exams-selection-view">
        <div className="selection-grid-header">
          <h3>اختر الصف والشعبة</h3>
          <p>حدد الشعبة التي ترغب في عرض امتحاناتها أو إضافة امتحان جديد لها.</p>
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
                  {gradeDivisions.length === 0 && (
                    <div className="empty-divs">لا توجد شعب</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="back-link" onClick={() => setActiveSubSubView('selection')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
            <span>‹</span> عودة للصفوف
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            إضافة امتحان جديد لـ {selectedGrade?.name} ({selectedDivision?.name})
          </button>
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
        <div className="module-summary">
          <span>{filteredExams.length} امتحان في {selectedCourse}</span>
        </div>
      </div>

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>امتحانات {selectedGrade?.name} - شعبة {selectedDivision?.name}</h3>
            <p>إدارة امتحانات ودرجات هذه الشعبة بشكل مخصص.</p>
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث في المواد..."
            className="search-input"
          />
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state-card">
              <p>جاري تحميل البيانات...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="empty-state-card">
              <p>لا توجد امتحانات لهذه الشعبة حتى الآن.</p>
              <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={openCreateModal}>إضافة أول امتحان</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>المادة</th>
                  <th>التاريخ</th>
                  <th style={{ textAlign: 'center' }}>الدرجة النهائية</th>
                  <th style={{ textAlign: 'center' }}>إحصائيات النجاح</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam, index) => {
                  const examStat = stats.find(s => s.exam_id === exam.id) || { passed_count: 0, failed_count: 0 };
                  return (
                    <tr key={exam.id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: '600' }}>{exam.subject}</td>
                      <td>{exam.examDate}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{exam.totalScore}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }} title="عدد الناجحين">🟢 {examStat.passed_count}</span>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }} title="عدد الراسبين">🔴 {examStat.failed_count}</span>
                        </div>
                      </td>
                      <td>
                        <div className="action-group">
                          <button type="button" className="table-action edit" style={{ background: '#10b981', color: 'white' }} onClick={() => handleEnterResults(exam.id)}>
                            إدخال الدرجات
                          </button>
                          <button type="button" className="table-action edit" onClick={() => openEditModal(exam)}>
                            تعديل
                          </button>
                          <button type="button" className="table-action delete" onClick={() => handleDelete(exam.id)}>
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <ExamModal
        isOpen={isModalOpen}
        mode={mode}
        formData={formData}
        onChange={handleChange}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        errorMessage={errorMessage}
        grades={grades}
        divisions={divisions}
        isLocked={activeSubView === 'list'}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا الامتحان؟"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {toastMessage ? <div className="toast">{toastMessage}</div> : null}
    </section>
  );
}

export default ExamsPage;
