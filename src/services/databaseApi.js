// Database API Service
const electronApi = typeof window !== 'undefined' ? window.electronAPI : null;

async function initializeDatabase() {
  if (!electronApi?.initializeDatabase) return { ok: true };
  return electronApi.initializeDatabase();
}

async function getAppData(academicYear) {
  if (!electronApi?.getAppData) return { students: [], teachers: [], grades: [], divisions: [], exams: [], attendance: [], fees: [], certificates: [] };
  return electronApi.getAppData(academicYear);
}

async function createStudent(payload, userId, academicYear) {
  return electronApi?.createStudent ? electronApi.createStudent(payload, userId, academicYear) : payload;
}

async function updateStudent(id, payload, userId) {
  return electronApi?.updateStudent ? electronApi.updateStudent(id, payload, userId) : { id, ...payload };
}

async function deleteStudent(id, userId) {
  return electronApi?.deleteStudent ? electronApi.deleteStudent(id, userId) : true;
}

async function createTeacher(payload, userId) {
  return electronApi?.createTeacher ? electronApi.createTeacher(payload, userId) : payload;
}

async function updateTeacher(id, payload, userId) {
  return electronApi?.updateTeacher ? electronApi.updateTeacher(id, payload, userId) : { id, ...payload };
}

async function deleteTeacher(id, userId) {
  return electronApi?.deleteTeacher ? electronApi.deleteTeacher(id, userId) : true;
}

async function getLogs() {
  return electronApi?.getLogs ? electronApi.getLogs() : [];
}

async function getAcademicYears() {
  return electronApi?.getAcademicYears ? electronApi.getAcademicYears() : [];
}

async function createGrade(payload, userId) {
  return electronApi?.createGrade ? electronApi.createGrade(payload, userId) : payload;
}

async function updateGrade(id, payload, userId) {
  return electronApi?.updateGrade ? electronApi.updateGrade(id, payload, userId) : { id, ...payload };
}

async function deleteGrade(id, userId) {
  return electronApi?.deleteGrade ? electronApi.deleteGrade(id, userId) : true;
}

async function createDivision(payload, userId) {
  return electronApi?.createDivision ? electronApi.createDivision(payload, userId) : payload;
}

async function updateDivision(id, payload, userId) {
  return electronApi?.updateDivision ? electronApi.updateDivision(id, payload, userId) : { id, ...payload };
}

async function deleteDivision(id, userId) {
  return electronApi?.deleteDivision ? electronApi.deleteDivision(id, userId) : true;
}

async function createExam(payload, userId, academicYear) {
  return electronApi?.createExam ? electronApi.createExam(payload, userId, academicYear) : payload;
}

async function updateExam(id, payload, userId) {
  return electronApi?.updateExam ? electronApi.updateExam(id, payload, userId) : { id, ...payload };
}

async function deleteExam(id, userId) {
  return electronApi?.deleteExam ? electronApi.deleteExam(id, userId) : true;
}

async function saveExamResults(examId, rows, userId, academicYear) {
  return electronApi?.saveExamResults ? electronApi.saveExamResults(examId, rows, userId, academicYear) : true;
}

async function getExamResults(examId) {
  return electronApi?.getExamResults ? electronApi.getExamResults(examId) : [];
}

async function getExamsStats(academicYear) {
  return electronApi?.getExamsStats ? electronApi.getExamsStats(academicYear) : [];
}

async function getAttendanceForDate(date) {
  return electronApi?.getAttendanceForDate ? electronApi.getAttendanceForDate(date) : [];
}

async function getEnrichedAttendance(date) {
  return electronApi?.getEnrichedAttendance ? electronApi.getEnrichedAttendance(date) : [];
}

async function saveAttendanceRecords(date, rows, userId, academicYear) {
  return electronApi?.saveAttendanceRecords ? electronApi.saveAttendanceRecords(date, rows, userId, academicYear) : true;
}

async function createFeePayment(studentId, payload, userId, academicYear) {
  return electronApi?.createFeePayment ? electronApi.createFeePayment(studentId, payload, userId, academicYear) : payload;
}

async function getFees(academicYear) {
  return electronApi?.getFees ? electronApi.getFees(academicYear) : [];
}

async function createCertificate(payload) {
  return electronApi?.createCertificate ? electronApi.createCertificate(payload) : payload;
}

async function getSchedule() {
  return electronApi?.getSchedule ? electronApi.getSchedule() : [];
}

async function saveScheduleCell(payload) {
  return electronApi?.saveScheduleCell ? electronApi.saveScheduleCell(payload) : { ok: true };
}

async function saveFullSchedule(divisionId, cells, userId, academicYear) {
  return electronApi?.saveFullSchedule ? electronApi.saveFullSchedule(divisionId, cells, userId, academicYear) : { ok: true };
}

async function getFinalResults(academicYear) {
  return electronApi?.getFinalResults ? electronApi.getFinalResults(academicYear) : [];
}

async function promoteStudents(studentIds, userId, currentYear) {
  return electronApi?.promoteStudents ? electronApi.promoteStudents(studentIds, userId, currentYear) : { ok: true };
}

async function getExpenses() {
  return electronApi?.getExpenses ? electronApi.getExpenses() : [];
}

async function createExpense(payload, userId, academicYear) {
  return electronApi?.createExpense ? electronApi.createExpense(payload, userId, academicYear) : payload;
}

async function updateExpenseStatus(id, status, userId) {
  return electronApi?.updateExpenseStatus ? electronApi.updateExpenseStatus(id, status, userId) : { ok: true };
}

async function login(username, password) {
  return electronApi?.login ? electronApi.login(username, password) : { ok: true, user: { id: 1, username: 'admin', role: 'admin', full_name: 'مدير النظام' } };
}

async function getUsers() {
  return electronApi?.getUsers ? electronApi.getUsers() : [];
}

async function createUser(payload, userId) {
  return electronApi?.createUser ? electronApi.createUser(payload, userId) : payload;
}

async function deleteUser(id, userId) {
  return electronApi?.deleteUser ? electronApi.deleteUser(id, userId) : { ok: true };
}

async function updateUserPassword(id, newPassword, userId) {
  return electronApi?.updateUserPassword ? electronApi.updateUserPassword(id, newPassword, userId) : { ok: true };
}

async function updateGradeFee(gradeId, amount, currency, userId) {
  return electronApi?.updateGradeFee ? electronApi.updateGradeFee(gradeId, amount, currency, userId) : { ok: true };
}

async function applyGradeFeeToAll(gradeId, amount, userId) {
  return electronApi?.applyGradeFeeToAll ? electronApi.applyGradeFeeToAll(gradeId, amount, userId) : { ok: true };
}

async function updateGradeFeesBulk(edits, userId) {
  return electronApi?.updateGradeFeesBulk ? electronApi.updateGradeFeesBulk(edits, userId) : { ok: true };
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

async function addAcademicYear(yearName, userId) {
  return electronApi?.addAcademicYear ? electronApi.addAcademicYear(yearName, userId) : { ok: true };
}

async function setCurrentAcademicYear(yearName, userId) {
  return electronApi?.setCurrentAcademicYear ? electronApi.setCurrentAcademicYear(yearName, userId) : { ok: true };
}

export {
  initializeDatabase, getAppData, createStudent, updateStudent, deleteStudent, createTeacher, updateTeacher, deleteTeacher,
  createGrade, updateGrade, deleteGrade, createDivision, updateDivision, deleteDivision,
  createExam, updateExam, deleteExam, saveExamResults, getExamResults, getExamsStats, getAttendanceForDate, getEnrichedAttendance, saveAttendanceRecords,
  createFeePayment, getFees, createCertificate, getSchedule, saveScheduleCell, saveFullSchedule,
  getFinalResults, promoteStudents, getExpenses, createExpense, updateExpenseStatus,
  login, getUsers, createUser, deleteUser, updateUserPassword, updateGradeFee, applyGradeFeeToAll, updateGradeFeesBulk, createBackup, restoreBackup, getLatestBackupInfo, getLogs, getAcademicYears,
  addAcademicYear, setCurrentAcademicYear
};

export default {
  initializeDatabase, getAppData, createStudent, updateStudent, deleteStudent, createTeacher, updateTeacher, deleteTeacher,
  createGrade, updateGrade, deleteGrade, createDivision, updateDivision, deleteDivision,
  createExam, updateExam, deleteExam, saveExamResults, getExamResults, getExamsStats, getAttendanceForDate, getEnrichedAttendance, saveAttendanceRecords,
  createFeePayment, getFees, createCertificate, getSchedule, saveScheduleCell, saveFullSchedule,
  getFinalResults, promoteStudents, getExpenses, createExpense, updateExpenseStatus,
  login, getUsers, createUser, deleteUser, updateUserPassword, updateGradeFee, applyGradeFeeToAll, updateGradeFeesBulk, createBackup, restoreBackup, getLatestBackupInfo, getLogs, getAcademicYears,
  addAcademicYear, setCurrentAcademicYear
};
