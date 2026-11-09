import { useEffect, useMemo, useState } from 'react';
import AttendancePage from './components/AttendancePage';
import ClassTable from './components/ClassTable';
import ExamsPage from './components/ExamsPage';
import FeesPage from './components/FeesPage';
import GradesPage from './components/GradesPage';
import DivisionModal from './components/DivisionModal';
import GradeModal from './components/GradeModal';
import StudentDirectoryModal from './components/StudentDirectoryModal';
import TransferStudentModal from './components/TransferStudentModal';
import StudentModal from './components/StudentModal';
import StudentTable from './components/StudentTable';
import StudentProfilePage from './components/StudentProfilePage';
import TeacherDetailsModal from './components/TeacherDetailsModal';
import TeacherModal from './components/TeacherModal';
import TeacherTable from './components/TeacherTable';
import ConfirmDialog from './components/ConfirmDialog';
import ModuleToolbar from './components/ModuleToolbar';
import SettingsPage from './components/SettingsPage';
import DashboardPage from './components/DashboardPage';
import SchedulePage from './components/SchedulePage';
import ResultsPage from './components/ResultsPage';
import ExpensesPage from './components/ExpensesPage';
import LoginPage from './components/LoginPage';
import { createDivisionId, createGradeId, initialDivisions, initialGrades } from './services/classService';
import { buildStudentPayload, createInitialStudentForm, createStudentId, getIraqiLocalPhone, getNamePartsCount, initialStudentForm, initialStudents, isDuplicateStudent, sortStudentsAlphabetically } from './services/studentService';
import { buildTeacherPayload, createTeacherId, initialTeacherForm, initialTeachers, isDuplicateTeacher } from './services/teacherService';
import {
  initializeDatabase,
  getAppData,
  createStudent,
  updateStudent,
  deleteStudent,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  createGrade,
  updateGrade,
  deleteGrade,
  createDivision,
  updateDivision,
  deleteDivision,
  getAcademicYears,
  getLogs,
  getSchoolSettings,
  validateUserSession,
  logout,
} from './services/databaseApi';

const modules = [
  { key: 'dashboard', title: 'الرئيسية', description: 'نظرة عامة على أداء المدرسة' },
  { key: 'students', title: 'إدارة الطلاب', description: 'إضافة الطلاب وتعديل بياناتهم ومتابعة التحصيل' },
  { key: 'teachers', title: 'إدارة المعلمين', description: 'تسجيل المعلمين وتوزيع المواد والصفوف' },
  { key: 'classes', title: 'الصفوف والشعب', description: 'إنشاء الصفوف والشعب وربط الطلاب بها' },
  { key: 'attendance', title: 'الحضور والغياب', description: 'تسجيل الحضور والغياب وتقارير يومية' },
  { key: 'exams', title: 'الامتحانات والدرجات', description: 'إعداد الجداول وإدخال درجات المواد' },
  { key: 'schedule', title: 'الجدول الدراسي', description: 'بناء الجداول الأسبوعية ومنع تضارب المعلمين' },
  { key: 'results', title: 'النتائج', description: 'عرض النتائج النهائية للطلاب' },
  { key: 'expenses', title: 'الصرفيات', description: 'سجل المشتريات ومصاريف التشغيل للمدرسة' },
  { key: 'fees', title: 'الرسوم والاقساط', description: 'إدارة الرسوم ومتابعة المدفوعات' },
  { key: 'settings', title: 'الإعدادات والنسخ', description: 'إدارة النسخ الاحتياطي واستعادة البيانات' },
];

function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginMessage, setLoginMessage] = useState('');
  const [students, setStudents] = useState(() => sortStudentsAlphabetically(initialStudents));
  const [teachers, setTeachers] = useState(initialTeachers);
  const [grades, setGrades] = useState(initialGrades);
  const [divisions, setDivisions] = useState(initialDivisions);
  const [fees, setFees] = useState([]);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [formData, setFormData] = useState(() => createInitialStudentForm(initialGrades, initialDivisions));
  const [teacherFormData, setTeacherFormData] = useState(initialTeacherForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [teacherErrorMessage, setTeacherErrorMessage] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState('2026-2027');
  const [academicYears, setAcademicYears] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState({
    schoolName: 'مدارس المعلم والكتاب الأهلية',
    whatsappPhone: '',
    schoolType: '',
    schoolAddress: '',
    schoolPhone: '',
  });
  const [teacherDetailsModalOpen, setTeacherDetailsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [teacherDeleteTargetId, setTeacherDeleteTargetId] = useState(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherMode, setTeacherMode] = useState('create');
  const [attendance, setAttendance] = useState([]);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [gradeFormData, setGradeFormData] = useState({ name: '', level: 'ابتدائي' });
  const [divisionFormData, setDivisionFormData] = useState({ name: '', gradeId: initialGrades[0]?.id || 1 });
  const [gradeMode, setGradeMode] = useState('create');
  const [divisionMode, setDivisionMode] = useState('create');
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);
  const [gradeErrorMessage, setGradeErrorMessage] = useState('');
  const [divisionErrorMessage, setDivisionErrorMessage] = useState('');
  const [gradeDeleteTargetId, setGradeDeleteTargetId] = useState(null);
  const [divisionDeleteTargetId, setDivisionDeleteTargetId] = useState(null);
  const [selectedGradeIdForDivisions, setSelectedGradeIdForDivisions] = useState(null);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [filteredDirectoryStudents, setFilteredDirectoryStudents] = useState(null);
  const [directoryTitle, setDirectoryTitle] = useState('دليل الطلاب الشامل');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState(null);

  // Persistence States for Exams and Results
  const [examsViewState, setExamsViewState] = useState({
    view: 'selection',
    divisionId: null,
    course: 'الشهر الأول',
    examIdForResult: null
  });
  const [resultsViewState, setResultsViewState] = useState({
    view: 'selection',
    divisionId: null,
    course: 'الشهر الأول'
  });
  const [feesViewState, setFeesViewState] = useState({
    activeTab: 'overview',
    searchTerm: '',
    allEdits: {}
  });

  const gradeOrder = {
    'اول': 1, '1': 1,
    'ثاني': 2, '2': 2,
    'ثالث': 3, '3': 3,
    'رابع': 4, '4': 4,
    'خامس': 5, '5': 5,
    'سادس': 6, '6': 6,
    'سابع': 7, '7': 7,
    'ثامن': 8, '8': 8,
    'تاسع': 9, '9': 9,
    'عاشر': 10, '10': 10,
    'حادي عشر': 11, '11': 11,
    'ثاني عشر': 12, '12': 12,
  };

  const getGradeWeight = (name) => {
    let clean = name.replace('الصف', '').trim();
    if (clean.startsWith('ال')) clean = clean.substring(2);
    // Normalize Hamzas
    clean = clean.replace(/[أإآ]/g, 'ا');
    return gradeOrder[clean] || 999;
  };

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status === 'نشط');
  }, [students]);

  const handleViewDivisionStudents = (division) => {
    const grade = grades.find(g => g.id === division.gradeId);
    // Only show ACTIVE students in this division for the selected year
    // Promoted and Graduated students will "disappear" as requested
    const studentsInDiv = activeStudents.filter(s => s.divisionId === division.id || (s.division === division.name && s.gradeId === division.gradeId));
    setFilteredDirectoryStudents(studentsInDiv);
    setDirectoryTitle(`طلاب شعبة: ${division.name} (${grade?.name || ''})`);
    setIsDirectoryOpen(true);
  };

  const handleOpenMainDirectory = () => {
    setFilteredDirectoryStudents(null);
    setDirectoryTitle('دليل الطلاب الشامل');
    setIsDirectoryOpen(true);
  };

  const refreshFees = async () => {
    const data = await getAppData(currentAcademicYear);
    if (data?.fees) {
      setFees(data.fees);
    }
  };

  const filteredStudents = useMemo(() => {
    // Arabic normalization helper
    const normalize = (str) => {
      if (!str) return '';
      return str
        .trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .toLowerCase();
    };

    const term = normalize(searchTerm);

    if (!term) {
      return activeStudents;
    }

    return activeStudents.filter((student) => {
      const haystack = normalize(`${student.fullName} ${student.grade} ${student.division} ${student.phone}`);
      return haystack.includes(term);
    });
  }, [searchTerm, activeStudents]);

  const filteredTeachers = useMemo(() => {
    const term = teacherSearchTerm.trim().toLowerCase();

    if (!term) {
      return teachers;
    }

    return teachers.filter((teacher) => {
      const haystack = `${teacher.fullName} ${teacher.specialty} ${teacher.subject} ${teacher.phone}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [teacherSearchTerm, teachers]);

  const gradeRows = useMemo(() =>
    [...grades]
      .sort((a, b) => getGradeWeight(a.name) - getGradeWeight(b.name))
      .map((grade) => {
        const studentCount = activeStudents.filter(s => s.gradeId === grade.id || s.grade === grade.name).length;
        return { ...grade, level: grade.level, studentCount };
      }),
  [grades, activeStudents]);

  const divisionRows = useMemo(() =>
    divisions
      .filter((division) => !selectedGradeIdForDivisions || division.gradeId === selectedGradeIdForDivisions)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((division) => {
        const grade = grades.find((item) => item.id === division.gradeId);
        const studentCount = activeStudents.filter(s => s.divisionId === division.id || (s.division === division.name && s.gradeId === division.gradeId)).length;
        return { ...division, gradeName: grade ? grade.name : 'غير محدد', studentCount };
      }),
  [divisions, grades, selectedGradeIdForDivisions, activeStudents]);

  const refreshAppData = async () => {
    try {
      const data = await getAppData(currentAcademicYear);
      if (data) {
        if (Array.isArray(data.students)) setStudents(sortStudentsAlphabetically(data.students));
        if (Array.isArray(data.teachers)) setTeachers(data.teachers);
        if (Array.isArray(data.grades)) setGrades(data.grades);
        if (Array.isArray(data.divisions)) setDivisions(data.divisions);
        if (Array.isArray(data.attendance)) setAttendance(data.attendance);
        if (Array.isArray(data.fees)) setFees(data.fees);
      }
      const years = await getAcademicYears();
      if (Array.isArray(years)) setAcademicYears(years);
    } catch (error) {
      console.error('Failed to refresh app data', error);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initializeDatabase();
        const [years, settings] = await Promise.all([getAcademicYears(), getSchoolSettings()]);
        setSchoolSettings(settings);
        const yearsList = Array.isArray(years) ? years : [];
        setAcademicYears(yearsList);

        const current = yearsList.find(y => y.is_current);
        if (current && current.year_name !== currentAcademicYear) {
          setCurrentAcademicYear(current.year_name);
        } else {
          await refreshAppData();
        }
      } catch (error) {
        console.error('Failed to load database data', error);
      } finally {
        setIsDatabaseReady(true);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    // Only refresh data if the year changes AFTER the initial load
    // or if the initial load didn't trigger it yet.
    if (isDatabaseReady) {
      refreshAppData();
    }
  }, [currentAcademicYear]);

  useEffect(() => {
    if (!currentUser) return undefined;
    let checking = false;
    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await validateUserSession(currentUser.id);
        if (!result?.ok) {
          setCurrentUser(null);
          setActiveModule('dashboard');
          setViewingStudentId(null);
          setLoginMessage('تم إيقاف هذا الحساب من قبل مدير المدرسة.');
        } else if (result.user.role !== currentUser.role) {
          setCurrentUser(result.user);
        }
      } catch (error) {
        console.error('Failed to validate current user session', error);
      } finally {
        checking = false;
      }
    };
    const intervalId = window.setInterval(checkSession, 5000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.role]);

  const openCreateModal = () => {
    setMode('create');
    setFormData(createInitialStudentForm(grades, divisions));
    setSelectedStudentId(null);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openCreateTeacherModal = () => {
    setTeacherMode('create');
    setTeacherFormData(initialTeacherForm);
    setSelectedTeacherId(null);
    setTeacherErrorMessage('');
    setIsTeacherModalOpen(true);
  };

  const openCreateGradeModal = () => {
    setGradeMode('create');
    setGradeFormData({ name: '', level: 'ابتدائي' });
    setSelectedGradeId(null);
    setGradeErrorMessage('');
    setIsGradeModalOpen(true);
  };

  const openCreateDivisionModal = () => {
    setDivisionMode('create');
    setDivisionFormData({ name: '', gradeId: grades[0]?.id || 1 });
    setSelectedDivisionId(null);
    setDivisionErrorMessage('');
    setIsDivisionModalOpen(true);
  };

  const openEditModal = (student) => {
    const matchedGrade = grades.find((grade) => grade.id === student.gradeId || grade.name === student.grade);
    const matchedDivision = divisions.find((div) => div.id === student.divisionId || (div.name === student.division && div.gradeId === matchedGrade?.id));

    setMode('edit');
    setSelectedStudentId(student.id);
    setFormData({
      fullName: student.fullName,
      gender: student.gender,
      dob: student.dob,
      grade: matchedGrade?.name || student.grade || '',
      gradeId: matchedGrade?.id || student.gradeId || '',
      division: matchedDivision?.name || student.division || '',
      divisionId: matchedDivision?.id || student.divisionId || '',
      phone: getIraqiLocalPhone(student.phone),
      address: student.address,
      status: student.status,
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditTeacherModal = (teacher) => {
    setTeacherMode('edit');
    setSelectedTeacherId(teacher.id);
    setTeacherFormData({
      fullName: teacher.fullName,
      gender: teacher.gender,
      specialty: teacher.specialty,
      subject: teacher.subject,
      phone: teacher.phone,
      email: teacher.email,
      address: teacher.address,
      status: teacher.status,
    });
    setTeacherErrorMessage('');
    setIsTeacherModalOpen(true);
  };

  const openEditGradeModal = (grade) => {
    setGradeMode('edit');
    setSelectedGradeId(grade.id);
    setGradeFormData({ name: grade.name, level: grade.level });
    setGradeErrorMessage('');
    setIsGradeModalOpen(true);
  };

  const openEditDivisionModal = (division) => {
    setDivisionMode('edit');
    setSelectedDivisionId(division.id);
    setDivisionFormData({ name: division.name, gradeId: division.gradeId });
    setDivisionErrorMessage('');
    setIsDivisionModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === 'gradeId') {
        const nextGradeId = value ? Number(value) : '';
        const nextGrade = grades.find((grade) => grade.id === nextGradeId);
        const matchingDivisions = nextGradeId ? divisions.filter((division) => division.gradeId === nextGradeId) : [];
        const nextDivision = matchingDivisions.length > 0 ? matchingDivisions[0] : null;

        return {
          ...current,
          gradeId: nextGradeId,
          grade: nextGrade?.name || '',
          divisionId: nextDivision?.id || '',
          division: nextDivision?.name || '',
        };
      }

      if (name === 'divisionId') {
        const nextDivId = value ? Number(value) : '';
        const nextDivision = divisions.find((division) => division.id === nextDivId);

        return {
          ...current,
          divisionId: nextDivId,
          division: nextDivision?.name || '',
        };
      }

      return { ...current, [name]: value };
    });
  };

  const handleTeacherChange = (event) => {
    const { name, value } = event.target;
    setTeacherFormData((current) => ({ ...current, [name]: value }));
  };

  const handleGradeChange = (event) => {
    const { name, value } = event.target;
    setGradeFormData((current) => ({ ...current, [name]: value }));
  };

  const handleDivisionChange = (event) => {
    const { name, value } = event.target;
    setDivisionFormData((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => setToastMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nameParts = getNamePartsCount(formData.fullName);
    if (nameParts < 3) {
      setErrorMessage('يرجى إدخال الاسم الثلاثي للطالب على الأقل.');
      return;
    }

    if (isDuplicateStudent(students, formData, selectedStudentId)) {
      setErrorMessage('هذا الاسم (أو الهاتف) موجود مسبقاً بالفعل. يرجى إدخال الاسم الرباعي لتمييز الطالب عن السجلات السابقة.');
      return;
    }

    try {
      if (mode === 'edit' && selectedStudentId) {
        const payload = buildStudentPayload(formData, selectedStudentId, students.find((student) => student.id === selectedStudentId)?.status || 'نشط');
        const saved = await updateStudent(selectedStudentId, payload, currentUser.id);
        setStudents((current) => sortStudentsAlphabetically(current.map((student) => (student.id === selectedStudentId ? saved : student))));
        setToastMessage('تم تعديل بيانات الطالب بنجاح.');
      } else {
        const payload = buildStudentPayload(formData, createStudentId(students));
        const saved = await createStudent(payload, currentUser.id, currentAcademicYear);
        setStudents((current) => sortStudentsAlphabetically([...current, saved]));
        setToastMessage('تم إضافة الطالب بنجاح.');
      }

      setIsModalOpen(false);
      setFormData(createInitialStudentForm(grades, divisions));
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to save student', error);
      setErrorMessage('فشل حفظ الطالب في قاعدة البيانات.');
    }
  };

  const handleTeacherSubmit = async (event) => {
    event.preventDefault();

    if (isDuplicateTeacher(teachers, teacherFormData, selectedTeacherId)) {
      setTeacherErrorMessage('يوجد معلم مشابه بالفعل، يرجى مراجعة البيانات قبل الحفظ.');
      return;
    }

    try {
      if (teacherMode === 'edit' && selectedTeacherId) {
        const payload = buildTeacherPayload(teacherFormData, selectedTeacherId);
        const saved = await updateTeacher(selectedTeacherId, payload, currentUser.id);
        setTeachers((current) => current.map((teacher) => (teacher.id === selectedTeacherId ? saved : teacher)));
        setToastMessage('تم تعديل بيانات المعلم بنجاح.');
      } else {
        const payload = buildTeacherPayload(teacherFormData, createTeacherId(teachers));
        const saved = await createTeacher(payload, currentUser.id);
        setTeachers((current) => [saved, ...current]);
        setToastMessage('تم إضافة المعلم بنجاح.');
      }

      setIsTeacherModalOpen(false);
      setTeacherFormData(initialTeacherForm);
      setTeacherErrorMessage('');
    } catch (error) {
      console.error('Failed to save teacher', error);
      setTeacherErrorMessage('فشل حفظ المعلم في قاعدة البيانات.');
    }
  };

  const handleGradeSubmit = async (event) => {
    event.preventDefault();

    if (!gradeFormData.name.trim()) {
      setGradeErrorMessage('يرجى إدخال اسم الصف.');
      return;
    }

    try {
      if (gradeMode === 'edit' && selectedGradeId) {
        const saved = await updateGrade(selectedGradeId, { id: selectedGradeId, name: gradeFormData.name.trim(), level: gradeFormData.level }, currentUser.id);
        setGrades((current) => current.map((grade) => (grade.id === selectedGradeId ? saved : grade)));
        setToastMessage('تم تعديل الصف بنجاح.');
      } else {
        const saved = await createGrade({ id: createGradeId(grades), name: gradeFormData.name.trim(), level: gradeFormData.level }, currentUser.id);
        setGrades((current) => [...current, saved]);
        setToastMessage('تم إضافة الصف بنجاح.');
      }

      setIsGradeModalOpen(false);
      setGradeFormData({ name: '', level: 'ابتدائي' });
      setGradeErrorMessage('');
    } catch (error) {
      console.error('Failed to save grade', error);
      setGradeErrorMessage('فشل حفظ الصف في قاعدة البيانات.');
    }
  };

  const handleDivisionSubmit = async (event) => {
    event.preventDefault();

    if (!divisionFormData.name.trim()) {
      setDivisionErrorMessage('يرجى إدخال اسم الشعبة.');
      return;
    }

    try {
      if (divisionMode === 'edit' && selectedDivisionId) {
        const saved = await updateDivision(selectedDivisionId, { id: selectedDivisionId, name: divisionFormData.name.trim(), gradeId: Number(divisionFormData.gradeId) }, currentUser.id);
        setDivisions((current) => current.map((division) => (division.id === selectedDivisionId ? saved : division)));
        setToastMessage('تم تعديل الشعبة بنجاح.');
      } else {
        const saved = await createDivision({ id: createDivisionId(divisions), name: divisionFormData.name.trim(), gradeId: Number(divisionFormData.gradeId) }, currentUser.id);
        setDivisions((current) => [...current, saved]);
        setToastMessage('تم إضافة الشعبة بنجاح.');
      }

      setIsDivisionModalOpen(false);
      setDivisionFormData({ name: '', gradeId: grades[0]?.id || 1 });
      setDivisionErrorMessage('');
    } catch (error) {
      console.error('Failed to save division', error);
      setDivisionErrorMessage('فشل حفظ الشعبة في قاعدة البيانات.');
    }
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
  };

  const handleTeacherDelete = (id) => {
    setTeacherDeleteTargetId(id);
  };

  const handleGradeDelete = (id) => {
    setGradeDeleteTargetId(id);
  };

  const handleDivisionDelete = (id) => {
    setDivisionDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await deleteStudent(deleteTargetId, currentUser.id);
      setStudents((current) => current.filter((student) => student.id !== deleteTargetId));
      setDeleteTargetId(null);
      setToastMessage('تم حذف الطالب بنجاح.');
    } catch (error) {
      console.error('Failed to delete student', error);
      setToastMessage('فشل حذف الطالب من قاعدة البيانات.');
    }
  };

  const confirmTeacherDelete = async () => {
    if (!teacherDeleteTargetId) return;

    try {
      await deleteTeacher(teacherDeleteTargetId, currentUser.id);
      setTeachers((current) => current.filter((teacher) => teacher.id !== teacherDeleteTargetId));
      setTeacherDeleteTargetId(null);
      setToastMessage('تم حذف المعلم بنجاح.');
    } catch (error) {
      console.error('Failed to delete teacher', error);
      setToastMessage('فشل حذف المعلم من قاعدة البيانات.');
    }
  };

  const confirmGradeDelete = async () => {
    if (!gradeDeleteTargetId) return;

    try {
      await deleteGrade(gradeDeleteTargetId, currentUser.id);
      setGrades((current) => current.filter((grade) => grade.id !== gradeDeleteTargetId));
      setDivisions((current) => current.filter((division) => division.gradeId !== gradeDeleteTargetId));
      setGradeDeleteTargetId(null);
      setToastMessage('تم حذف الصف والشعب المرتبطة به بنجاح.');
    } catch (error) {
      console.error('Failed to delete grade', error);
      setToastMessage('فشل حذف الصف من قاعدة البيانات.');
    }
  };

  const confirmDivisionDelete = async () => {
    if (!divisionDeleteTargetId) return;

    try {
      await deleteDivision(divisionDeleteTargetId, currentUser.id);
      setDivisions((current) => current.filter((division) => division.id !== divisionDeleteTargetId));
      setDivisionDeleteTargetId(null);
      setToastMessage('تم حذف الشعبة بنجاح.');
    } catch (error) {
      console.error('Failed to delete division', error);
      setToastMessage('فشل حذف الشعبة من قاعدة البيانات.');
    }
  };

  const handleTransferClick = (student) => {
    setStudentToTransfer(student);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (studentId, newPlacement) => {
    try {
      const student = students.find(s => s.id === studentId);
      const updatedPayload = {
        ...student,
        gradeId: newPlacement.gradeId,
        grade: newPlacement.grade,
        divisionId: newPlacement.divisionId,
        division: newPlacement.division
      };

      await updateStudent(studentId, updatedPayload, currentUser.id);

      setStudents(prev => sortStudentsAlphabetically(prev.map(s => s.id === studentId ? { ...s, ...newPlacement } : s)));
      setToastMessage(`تم نقل الطالب ${student.fullName} بنجاح.`);
      setIsTransferModalOpen(false);
      setStudentToTransfer(null);
    } catch (error) {
      console.error('Failed to transfer student', error);
      alert('فشل في نقل الطالب');
    }
  };

  const handleView = (student) => {
    setViewingStudentId(student.id);
  };

  const handleTeacherView = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherDetailsModalOpen(true);
  };

  const visibleModules = useMemo(() => {
    if (currentUser?.role === 'admin') return modules;
    const allowedModules = currentUser?.role === 'accounting_employee'
      ? ['fees', 'expenses']
      : currentUser?.role === 'administrative_employee'
        ? modules.filter((module) => !['fees', 'expenses', 'settings'].includes(module.key)).map((module) => module.key)
        : [];
    return modules.filter((module) => allowedModules.includes(module.key));
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setLoginMessage('');
    if (user.role === 'accounting_employee') setActiveModule('fees');
    else if (user.role === 'administrative_employee') setActiveModule('dashboard');
    else setActiveModule('dashboard');
    setViewingStudentId(null);
    refreshAppData();
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} initialMessage={loginMessage} />;
  }

  return (
    <div className="app-shell" style={{ direction: 'rtl' }}>
      <aside className="sidebar">
        <h1>إدارة المدارس</h1>
        <p>{currentUser.full_name} ({currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'administrative_employee' ? 'موظف إداري' : 'موظف'})</p>
        <nav style={{ flex: 1 }}>
          {visibleModules.map((module) => (
            <button
              key={module.key}
              className={activeModule === module.key ? 'nav-btn active' : 'nav-btn'}
              onClick={() => {
                setActiveModule(module.key);
                setViewingStudentId(null);
              }}
            >
              {module.title}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          <button
            className="nav-btn"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
            onClick={async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Failed to clear authenticated application session', error);
              }
              setCurrentUser(null);
              setActiveModule('dashboard');
              setViewingStudentId(null);
              setLoginMessage('');
            }}
          >
            ↩️ تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="content">
        <header>
          <h2>{modules.find((m) => m.key === activeModule)?.title}</h2>
          <p>{modules.find((m) => m.key === activeModule)?.description}</p>
        </header>

        {viewingStudentId ? (
          <StudentProfilePage
            student={students.find(s => String(s.id) === String(viewingStudentId))}
            feeRecord={fees.find(f => f.studentId === viewingStudentId)}
            attendanceRecords={attendance.filter(a => a.studentId === viewingStudentId)}
            grades={grades}
            currentAcademicYear={currentAcademicYear}
            onBack={() => setViewingStudentId(null)}
            canViewFinancials={['admin', 'accounting_employee'].includes(currentUser.role)}
            onEdit={(student) => {
              setViewingStudentId(null);
              openEditModal(student);
            }}
          />
        ) : activeModule === 'dashboard' ? (
          <DashboardPage
            students={activeStudents}
            teachers={teachers}
            fees={fees}
            onViewStudent={handleView}
            currentAcademicYear={currentAcademicYear}
            canViewFinancials={['admin', 'accounting_employee'].includes(currentUser.role)}
          />
        ) : activeModule === 'students' ? (
          <section className="students-module">
            <div className="cards">
              <article className="card clickable-row" onClick={openCreateModal} style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>➕</div>
                <h3>إضافة طالب جديد</h3>
                <p>تسجيل طالب جديد في النظام وتحديد الصف والشعبة.</p>
              </article>

              <article className="card clickable-row" onClick={handleOpenMainDirectory} style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h3>دليل الطلاب</h3>
                <p>البحث في قائمة الطلاب، تعديل البيانات، أو عرض التفاصيل الكاملة.</p>
              </article>

              <article className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <h3>إحصائيات سريعة</h3>
                <p>إجمالي الطلاب المسجلين حالياً: <strong>{activeStudents.length}</strong> طالب.</p>
              </article>
            </div>
          </section>
        ) : activeModule === 'teachers' ? (
          <section className="students-module">
            <ModuleToolbar
              primaryActionLabel="إضافة معلم"
              onPrimaryAction={openCreateTeacherModal}
              countLabel={`${teachers.length} معلم مسجل`}
            />

            <TeacherTable
              teachers={filteredTeachers}
              onView={handleTeacherView}
              onEdit={openEditTeacherModal}
              onDelete={handleTeacherDelete}
              searchTerm={teacherSearchTerm}
              onSearchChange={(event) => setTeacherSearchTerm(event.target.value)}
            />
          </section>
        ) : activeModule === 'classes' ? (
          <section className="students-module">
            <ModuleToolbar
              primaryActionLabel="إضافة صف"
              onPrimaryAction={openCreateGradeModal}
              secondaryActionLabel="إضافة شعبة"
              onSecondaryAction={openCreateDivisionModal}
              countLabel={`${grades.length} صف و${divisions.length} شعبة`}
            />

            <div className="grid-two-columns">
              <ClassTable
                title="الصفوف"
                items={gradeRows}
                onEdit={openEditGradeModal}
                onDelete={handleGradeDelete}
                onSelect={(id) => setSelectedGradeIdForDivisions(id)}
                selectedId={selectedGradeIdForDivisions}
                emptyMessage="لا توجد صفوف حتى الآن."
              />
              {selectedGradeIdForDivisions ? (
                <ClassTable
                  title={`الشعب - ${grades.find(g => g.id === selectedGradeIdForDivisions)?.name || ''}`}
                  items={divisionRows}
                  onEdit={openEditDivisionModal}
                  onDelete={handleDivisionDelete}
                  onView={handleViewDivisionStudents}
                  emptyMessage="لا توجد شعب لهذا الصف."
                />
              ) : (
                <div className="table-card empty-state-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p>اختر صفاً من الجدول لعرض الشعب التابعة له.</p>
                </div>
              )}
            </div>

            <GradeModal
              isOpen={isGradeModalOpen}
              mode={gradeMode}
              formData={gradeFormData}
              onChange={handleGradeChange}
              onClose={() => setIsGradeModalOpen(false)}
              onSubmit={handleGradeSubmit}
              errorMessage={gradeErrorMessage}
            />

            <DivisionModal
              isOpen={isDivisionModalOpen}
              mode={divisionMode}
              formData={divisionFormData}
              onChange={handleDivisionChange}
              onClose={() => setIsDivisionModalOpen(false)}
              onSubmit={handleDivisionSubmit}
              errorMessage={divisionErrorMessage}
              grades={grades}
            />

            <ConfirmDialog
              isOpen={Boolean(gradeDeleteTargetId)}
              title="تأكيد الحذف"
              message="هل أنت متأكد من حذف هذا الصف؟ ستُحذف أيضًا الشعب المرتبطة به."
              onConfirm={confirmGradeDelete}
              onCancel={() => setGradeDeleteTargetId(null)}
            />

            <ConfirmDialog
              isOpen={Boolean(divisionDeleteTargetId)}
              title="تأكيد الحذف"
              message="هل أنت متأكد من حذف هذه الشعبة؟"
              onConfirm={confirmDivisionDelete}
              onCancel={() => setDivisionDeleteTargetId(null)}
            />

            {toastMessage ? <div className="toast">{toastMessage}</div> : null}
          </section>
        ) : activeModule === 'attendance' ? (
          <>
            <AttendancePage
              students={activeStudents}
              grades={grades}
              divisions={divisions}
              currentUser={currentUser}
              currentAcademicYear={currentAcademicYear}
              onSuccess={(msg) => setToastMessage(msg)}
            />
            {toastMessage ? <div className="toast">{toastMessage}</div> : null}
          </>
        ) : activeModule === 'exams' ? (
          <ExamsPage
            students={activeStudents}
            grades={grades}
            divisions={divisions}
            currentUser={currentUser}
            currentAcademicYear={currentAcademicYear}
            viewState={examsViewState}
            setViewState={setExamsViewState}
          />
        ) : activeModule === 'schedule' ? (
          <SchedulePage grades={grades} divisions={divisions} teachers={teachers} currentUser={currentUser} currentAcademicYear={currentAcademicYear} />
        ) : activeModule === 'results' ? (
          <ResultsPage
            grades={grades}
            divisions={divisions}
            schoolSettings={schoolSettings}
            currentAcademicYear={currentAcademicYear}
            viewState={resultsViewState}
            setViewState={setResultsViewState}
            onViewStudent={handleView}
          />
        ) : activeModule === 'expenses' ? (
          <ExpensesPage currentUser={currentUser} currentAcademicYear={currentAcademicYear} />
        ) : activeModule === 'fees' ? (
          <FeesPage
            students={activeStudents}
            fees={fees}
            grades={grades}
            divisions={divisions}
            schoolSettings={schoolSettings}
            onRefresh={refreshAppData}
            onViewStudent={handleView}
            currentUser={currentUser}
            currentAcademicYear={currentAcademicYear}
            viewState={feesViewState}
            setViewState={setFeesViewState}
          />
        ) : activeModule === 'settings' && currentUser.role === 'admin' ? (
          <SettingsPage
            currentUser={currentUser}
            academicYears={academicYears}
            currentAcademicYear={currentAcademicYear}
            onSchoolSettingsChange={setSchoolSettings}
            onYearChange={async (year) => {
              await setCurrentAcademicYear(year);
              await refreshAppData();
            }}
            onRefreshYears={async () => {
              const years = await getAcademicYears();
              if (Array.isArray(years)) setAcademicYears(years);
            }}
          />
        ) : (
          <section className="cards">
            <article className="card">
              <h3>الميزات الأساسية</h3>
              <ul>
                <li>إدارة الطلاب والمعلمين</li>
                <li>الصفوف والشعب والحضور</li>
                <li>الامتحانات والدرجات والرسوم</li>
              </ul>
            </article>

            <article className="card">
              <h3>الحالة</h3>
              <ul>
                <li>تم إنشاء بنية Electron + React</li>
                <li>جاهز للإضافة والتطوير</li>
                <li>يدعم واجهات حديثة وم responsive</li>
              </ul>
            </article>
          </section>
        )}

        {/* --- Global Modals --- */}
        <StudentModal
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

        <ConfirmDialog
          isOpen={Boolean(deleteTargetId)}
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذا الطالب؟"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />

        <TeacherModal
          isOpen={isTeacherModalOpen}
          mode={teacherMode}
          formData={teacherFormData}
          onChange={handleTeacherChange}
          onClose={() => setIsTeacherModalOpen(false)}
          onSubmit={handleTeacherSubmit}
          errorMessage={teacherErrorMessage}
        />

        <TeacherDetailsModal
          isOpen={teacherDetailsModalOpen}
          teacher={selectedTeacher}
          onClose={() => setTeacherDetailsModalOpen(false)}
          onEdit={(teacher) => {
            setTeacherDetailsModalOpen(false);
            openEditTeacherModal(teacher);
          }}
        />

        <ConfirmDialog
          isOpen={Boolean(teacherDeleteTargetId)}
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذا المعلم؟"
          onConfirm={confirmTeacherDelete}
          onCancel={() => setTeacherDeleteTargetId(null)}
        />

        <StudentDirectoryModal
          isOpen={isDirectoryOpen}
          students={filteredDirectoryStudents || activeStudents}
          title={directoryTitle}
          onClose={() => setIsDirectoryOpen(false)}
          onView={(student) => {
            setIsDirectoryOpen(false);
            handleView(student);
          }}
          onEdit={(student) => {
            setIsDirectoryOpen(false);
            openEditModal(student);
          }}
          onDelete={(id) => {
            handleDelete(id);
          }}
          onTransfer={(student) => {
            handleTransferClick(student);
          }}
        />

        <TransferStudentModal
          isOpen={isTransferModalOpen}
          student={studentToTransfer}
          grades={grades}
          divisions={divisions}
          onClose={() => setIsTransferModalOpen(false)}
          onConfirm={handleConfirmTransfer}
        />
      </main>
    </div>
  );
}

export default App;
