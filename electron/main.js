const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let databaseService;
try {
  databaseService = require('./databaseService');
} catch (error) {
  app.whenReady().then(() => {
    dialog.showErrorBox('خطأ في ملف قاعدة البيانات',
      'فشل تحميل محرك sqlite3. قد يكون السبب في عملية التثبيت.\n\nالتفاصيل:\n' + error.message);
  });
}

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    title: "نظام إدارة المدارس",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true, // Force enable DevTools
    },
  });

  // Hide DevTools for a professional clean look
  // win.webContents.openDevTools();

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html')).catch(err => {
      dialog.showErrorBox('فشل تحميل الواجهة', err.message);
    });
  }
}

// Global Error Handler
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('خطأ في النظام', error.message + '\n' + error.stack);
});

// IPC Handlers
ipcMain.handle('db:initializeDatabase', () => databaseService.initializeDatabase());
ipcMain.handle('db:getAppData', (_, academicYear) => databaseService.getAppData(academicYear));
ipcMain.handle('db:createStudent', (_, payload, userId, academicYear) => databaseService.createStudent(payload, userId, academicYear));
ipcMain.handle('db:updateStudent', (_, id, payload, userId) => databaseService.updateStudent(id, payload, userId));
ipcMain.handle('db:deleteStudent', (_, id, userId) => databaseService.deleteStudent(id, userId));
ipcMain.handle('db:createTeacher', (_, payload, userId) => databaseService.createTeacher(payload, userId));
ipcMain.handle('db:updateTeacher', (_, id, payload, userId) => databaseService.updateTeacher(id, payload, userId));
ipcMain.handle('db:deleteTeacher', (_, id, userId) => databaseService.deleteTeacher(id, userId));
ipcMain.handle('db:createGrade', (_, payload, userId) => databaseService.createGrade(payload, userId));
ipcMain.handle('db:updateGrade', (_, id, payload, userId) => databaseService.updateGrade(id, payload, userId));
ipcMain.handle('db:deleteGrade', (_, id, userId) => databaseService.deleteGrade(id, userId));
ipcMain.handle('db:createDivision', (_, payload, userId) => databaseService.createDivision(payload, userId));
ipcMain.handle('db:updateDivision', (_, id, payload, userId) => databaseService.updateDivision(id, payload, userId));
ipcMain.handle('db:deleteDivision', (_, id, userId) => databaseService.deleteDivision(id, userId));
ipcMain.handle('db:createExam', (_, payload, userId, academicYear) => databaseService.createExam(payload, userId, academicYear));
ipcMain.handle('db:updateExam', (_, id, payload, userId) => databaseService.updateExam(id, payload, userId));
ipcMain.handle('db:deleteExam', (_, id, userId) => databaseService.deleteExam(id, userId));
ipcMain.handle('db:saveExamResults', (_, examId, rows, userId, academicYear) => databaseService.saveExamResults(examId, rows, userId, academicYear));
ipcMain.handle('db:getExamResults', (_, examId) => databaseService.getExamResults(examId));
ipcMain.handle('db:getExamsStats', (_, academicYear) => databaseService.getExamsStats(academicYear));
ipcMain.handle('db:getAttendanceForDate', (_, date) => databaseService.listAttendanceForDate(date));
ipcMain.handle('db:getEnrichedAttendance', (_, date) => databaseService.getEnrichedAttendance(date));
ipcMain.handle('db:saveAttendanceRecords', (_, date, rows, userId, academicYear) => databaseService.saveAttendanceRecords(date, rows, userId, academicYear));
ipcMain.handle('db:createFeePayment', (_, studentId, payload, userId, academicYear) => databaseService.createFeePayment(studentId, payload, userId, academicYear));
ipcMain.handle('db:getFees', (_, academicYear) => databaseService.getFees(academicYear));
ipcMain.handle('db:createCertificate', (_, payload) => databaseService.createCertificate(payload));
ipcMain.handle('db:getSchedule', () => databaseService.getSchedule());
ipcMain.handle('db:saveScheduleCell', (_, payload) => databaseService.saveScheduleCell(payload));
ipcMain.handle('db:saveFullSchedule', (_, divisionId, cells, userId, academicYear) => databaseService.saveFullSchedule(divisionId, cells, userId, academicYear));
ipcMain.handle('db:getFinalResults', (_, academicYear) => databaseService.getFinalResults(academicYear));
ipcMain.handle('db:promoteStudents', (_, studentIds, userId, currentYear) => databaseService.promoteStudents(studentIds, userId, currentYear));
ipcMain.handle('db:getExpenses', () => databaseService.getExpenses());
ipcMain.handle('db:createExpense', (_, payload) => databaseService.createExpense(payload));
ipcMain.handle('db:updateExpenseStatus', (_, id, status) => databaseService.updateExpenseStatus(id, status));
ipcMain.handle('db:login', (_, username, password) => databaseService.login(username, password));
ipcMain.handle('db:getUsers', () => databaseService.getUsers());
ipcMain.handle('db:createUser', (_, payload, userId) => databaseService.createUser(payload, userId));
ipcMain.handle('db:deleteUser', (_, id, userId) => databaseService.deleteUser(id, userId));
ipcMain.handle('db:updateUserPassword', (_, id, newPassword, userId) => databaseService.updateUserPassword(id, newPassword, userId));
ipcMain.handle('db:updateGradeFee', (_, gradeId, amount, currency, userId) => databaseService.updateGradeFee(gradeId, amount, currency, userId));
ipcMain.handle('db:applyGradeFeeToAll', (_, gradeId, amount, userId) => databaseService.applyGradeFeeToAll(gradeId, amount, userId));
ipcMain.handle('db:updateGradeFeesBulk', (_, edits, userId) => databaseService.updateGradeFeesBulk(edits, userId));
ipcMain.handle('db:getLogs', () => databaseService.getLogs());
ipcMain.handle('db:getAcademicYears', () => databaseService.getAcademicYears());
ipcMain.handle('db:addAcademicYear', (_, yearName, userId) => databaseService.addAcademicYear(yearName, userId));
ipcMain.handle('db:setCurrentAcademicYear', (_, yearName, userId) => databaseService.setCurrentAcademicYear(yearName, userId));

ipcMain.handle('db:createBackup', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'اختيار مكان حفظ النسخة الاحتياطية',
    defaultPath: path.join(__dirname, '..', 'data', 'backups', `school-backup-${new Date().toISOString().slice(0, 10)}.db`),
    filters: [{ name: 'Database', extensions: ['db', 'sqlite'] }],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  return databaseService.createBackup(filePath);
});

ipcMain.handle('db:restoreBackup', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'اختيار ملف النسخة الاحتياطية',
    filters: [{ name: 'Database', extensions: ['db', 'sqlite'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths?.length) {
    return { canceled: true };
  }

  return databaseService.restoreBackup(filePaths[0]);
});

ipcMain.handle('db:getLatestBackupInfo', () => databaseService.getLatestBackupInfo());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
