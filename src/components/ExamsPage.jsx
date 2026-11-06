import { useMemo, useState } from 'react';
import ExamModal from './ExamModal';
import { createExamId, initialExams } from '../services/examService';
import { createExam, updateExam, deleteExam, saveExamResults } from '../services/databaseApi';

function ExamsPage({ grades, divisions }) {
  const [exams, setExams] = useState(initialExams);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [formData, setFormData] = useState({
    name: '',
    subject: 'الرياضيات',
    gradeId: grades[0]?.id || 1,
    divisionId: divisions.find((division) => division.gradeId === (grades[0]?.id || 1))?.id || 1,
    examDate: '',
    totalScore: 100,
  });
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const filteredExams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return exams;

    return exams.filter((exam) => `${exam.name} ${exam.subject}`.toLowerCase().includes(term));
  }, [exams, searchTerm]);

  const openCreateModal = () => {
    setMode('create');
    setSelectedExamId(null);
    setFormData({
      name: '',
      subject: 'الرياضيات',
      gradeId: grades[0]?.id || 1,
      divisionId: divisions.find((division) => division.gradeId === (grades[0]?.id || 1))?.id || 1,
      examDate: '',
      totalScore: 100,
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (exam) => {
    setMode('edit');
    setSelectedExamId(exam.id);
    setFormData({
      name: exam.name,
      subject: exam.subject,
      gradeId: exam.gradeId,
      divisionId: exam.divisionId,
      examDate: exam.examDate,
      totalScore: exam.totalScore,
    });
    setErrorMessage('');
    setIsModalOpen(true);
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

    if (!formData.name.trim()) {
      setErrorMessage('يرجى إدخال اسم الامتحان.');
      return;
    }

    try {
      if (mode === 'edit' && selectedExamId) {
        const saved = await updateExam(selectedExamId, { id: selectedExamId, ...formData });
        setExams((current) => current.map((exam) => (exam.id === selectedExamId ? saved : exam)));
        setToastMessage('تم تعديل الامتحان بنجاح.');
      } else {
        const saved = await createExam({ id: createExamId(exams), ...formData });
        setExams((current) => [...current, saved]);
        setToastMessage('تم إضافة الامتحان بنجاح.');
      }

      setIsModalOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to save exam', error);
      setErrorMessage('فشل حفظ الامتحان في قاعدة البيانات.');
    }
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteExam(deleteTargetId);
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

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          إضافة امتحان
        </button>
        <div className="module-summary">
          <span>{exams.length} امتحان مسجل</span>
        </div>
      </div>

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>قائمة الامتحانات</h3>
            <p>عرض جميع الامتحانات وإدارتها بسهولة.</p>
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث باسم الامتحان أو المادة..."
            className="search-input"
          />
        </div>

        <div className="table-wrapper">
          {filteredExams.length === 0 ? (
            <div className="empty-state-card">
              <p>لا توجد امتحانات حتى الآن.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>اسم الامتحان</th>
                  <th>المادة</th>
                  <th>الصف</th>
                  <th>الشعبة</th>
                  <th>التاريخ</th>
                  <th>الدرجة النهائية</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.id}</td>
                    <td>{exam.name}</td>
                    <td>{exam.subject}</td>
                    <td>{gradeName(exam.gradeId)}</td>
                    <td>{divisionName(exam.divisionId)}</td>
                    <td>{exam.examDate}</td>
                    <td>{exam.totalScore}</td>
                    <td>
                      <div className="action-group">
                        <button type="button" className="table-action edit" onClick={() => openEditModal(exam)}>
                          تعديل
                        </button>
                        <button type="button" className="table-action delete" onClick={() => handleDelete(exam.id)}>
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
      />

      {deleteTargetId ? (
        <div className="modal-backdrop">
          <div className="modal-card confirm-card">
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من حذف هذا الامتحان؟</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={confirmDelete}>
                نعم، حذف
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTargetId(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? <div className="toast">{toastMessage}</div> : null}
    </section>
  );
}

export default ExamsPage;
