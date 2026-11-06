async function getPendingSchools(actorUserId) {
  return electronApi?.getPendingSchools ? electronApi.getPendingSchools(actorUserId) : [];
}

async function setSchoolApproval(schoolId, approvalStatus, actorUserId) {
  return electronApi?.setSchoolApproval
    ? electronApi.setSchoolApproval(schoolId, approvalStatus, actorUserId)
    : { ok: false, message: 'اعتماد المدارس متاح من تطبيق سطح المكتب فقط.' };
}

export {
  initializeDatabase,
  getAppData,
  createSchool,
  getPendingSchools,
  setSchoolApproval,
  login,
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
  createExam,
  updateExam,
  deleteExam,
  saveExamResults,
  getAttendanceForDate,
  saveAttendanceRecords,
  createFeePayment,
  getFees,
  createCertificate,
  createBackup,
  restoreBackup,
  getLatestBackupInfo,
};

const electronApi = typeof window !== 'undefined' ? window.electronAPI : null;

async function initializeDatabase() {
  if (!electronApi?.initializeDatabase) {
    return { ok: true };
  }

  return electronApi.initializeDatabase();
}

async function getAppData() {
  if (!electronApi?.getAppData) {
    return { students: [], teachers: [], grades: [], divisions: [], exams: [], attendance: [], fees: [], certificates: [] };
  }

  return electronApi.getAppData();
}

async function createSchool(payload, requiresApproval = false) {
  if (!electronApi?.createSchool) {
    return { ok: true, school: { name: payload?.schoolName || '' }, message: 'تم إنشاء المدرسة بنجاح.' };
  }

  return electronApi.createSchool(payload, requiresApproval);
}

async function getPendingSchools() {
  return electronApi?.getPendingSchools ? electronApi.getPendingSchools() : [];
}

async function setSchoolApproval(schoolId, approvalStatus) {
  return electronApi?.setSchoolApproval
    ? electronApi.setSchoolApproval(schoolId, approvalStatus)
    : { ok: false, message: 'اعتماد المدارس متاح من تطبيق سطح المكتب فقط.' };
}

async function login(username, password, schoolName) {
  if (!electronApi?.login) {
    return {
      ok: true,
      user: {
        id: 1,
        schoolId: 1,
        schoolName: schoolName || 'مدرسة افتراضية',
        username: username || 'admin',
        role: 'admin',
        full_name: username || 'admin',
      },
      message: 'تم تسجيل الدخول بنجاح.',
    };
  }

  return electronApi.login(username, password, schoolName);
}

async function createStudent(payload) {
  return electronApi?.createStudent ? electronApi.createStudent(payload) : payload;
}

async function updateStudent(id, payload) {
  return electronApi?.updateStudent ? electronApi.updateStudent(id, payload) : { id, ...payload };
}

async function deleteStudent(id) {
  return electronApi?.deleteStudent ? electronApi.deleteStudent(id) : true;
}

async function createTeacher(payload) {
  return electronApi?.createTeacher ? electronApi.createTeacher(payload) : payload;
}

async function updateTeacher(id, payload) {
  return electronApi?.updateTeacher ? electronApi.updateTeacher(id, payload) : { id, ...payload };
}

async function deleteTeacher(id) {
  return electronApi?.deleteTeacher ? electronApi.deleteTeacher(id) : true;
}

async function createGrade(payload) {
  return electronApi?.createGrade ? electronApi.createGrade(payload) : payload;
}

async function updateGrade(id, payload) {
  return electronApi?.updateGrade ? electronApi.updateGrade(id, payload) : { id, ...payload };
}

async function deleteGrade(id) {
  return electronApi?.deleteGrade ? electronApi.deleteGrade(id) : true;
}

async function createDivision(payload) {
  return electronApi?.createDivision ? electronApi.createDivision(payload) : payload;
}

async function updateDivision(id, payload) {
  return electronApi?.updateDivision ? electronApi.updateDivision(id, payload) : { id, ...payload };
}

async function deleteDivision(id) {
  return electronApi?.deleteDivision ? electronApi.deleteDivision(id) : true;
}

async function createExam(payload) {
  return electronApi?.createExam ? electronApi.createExam(payload) : payload;
}

async function updateExam(id, payload) {
  return electronApi?.updateExam ? electronApi.updateExam(id, payload) : { id, ...payload };
}

async function deleteExam(id) {
  return electronApi?.deleteExam ? electronApi.deleteExam(id) : true;
}

async function saveExamResults(examId, rows) {
  return electronApi?.saveExamResults ? electronApi.saveExamResults(examId, rows) : true;
}

async function getAttendanceForDate(date) {
  return electronApi?.getAttendanceForDate ? electronApi.getAttendanceForDate(date) : [];
}

async function saveAttendanceRecords(date, rows) {
  return electronApi?.saveAttendanceRecords ? electronApi.saveAttendanceRecords(date, rows) : true;
}

async function createFeePayment(studentId, payload) {
  return electronApi?.createFeePayment ? electronApi.createFeePayment(studentId, payload) : payload;
}

async function getFees() {
  return electronApi?.getFees ? electronApi.getFees() : [];
}

async function createCertificate(payload) {
  return electronApi?.createCertificate ? electronApi.createCertificate(payload) : payload;
}

async function createBackup() {
  return electronApi?.createBackup ? electronApi.createBackup() : { ok: true, skipped: true };
}

async function restoreBackup() {
  return electronApi?.restoreBackup ? electronApi.restoreBackup() : { ok: true, skipped: true };
}

async function getLatestBackupInfo() {
  return electronApi?.getLatestBackupInfo ? electronApi.getLatestBackupInfo() : null;
}

export {
  initializeDatabase,
  getAppData,
  createSchool,
  getPendingSchools,
  setSchoolApproval,
  login,
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
  createExam,
  updateExam,
  deleteExam,
  saveExamResults,
  getAttendanceForDate,
  saveAttendanceRecords,
  createFeePayment,
  getFees,
  createCertificate,
  createBackup,
  restoreBackup,
  getLatestBackupInfo,
};

export default {
  initializeDatabase,
  getAppData,
  createSchool,
  getPendingSchools,
  setSchoolApproval,
  login,
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
  createExam,
  updateExam,
  deleteExam,
  saveExamResults,
  getAttendanceForDate,
  saveAttendanceRecords,
  createFeePayment,
  getFees,
  createCertificate,
  createBackup,
  restoreBackup,
  getLatestBackupInfo,
};
