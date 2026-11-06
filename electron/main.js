const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const databaseService = require('./databaseService');

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('db:initializeDatabase', () => databaseService.initializeDatabase());
ipcMain.handle('db:getAppData', () => databaseService.getAppData());
ipcMain.handle('db:createSchool', (_, payload, requiresApproval) => databaseService.createSchool(payload, requiresApproval));
ipcMain.handle('db:getPendingSchools', () => databaseService.getPendingSchools());
ipcMain.handle('db:setSchoolApproval', (_, schoolId, approvalStatus) => databaseService.setSchoolApproval(schoolId, approvalStatus));
ipcMain.handle('db:login', (_, username, password, schoolName) => databaseService.login(username, password, schoolName));
ipcMain.handle('db:createStudent', (_, payload) => databaseService.createStudent(payload));
ipcMain.handle('db:updateStudent', (_, id, payload) => databaseService.updateStudent(id, payload));
ipcMain.handle('db:deleteStudent', (_, id) => databaseService.deleteStudent(id));
ipcMain.handle('db:createTeacher', (_, payload) => databaseService.createTeacher(payload));
ipcMain.handle('db:updateTeacher', (_, id, payload) => databaseService.updateTeacher(id, payload));
ipcMain.handle('db:deleteTeacher', (_, id) => databaseService.deleteTeacher(id));
ipcMain.handle('db:createGrade', (_, payload) => databaseService.createGrade(payload));
ipcMain.handle('db:updateGrade', (_, id, payload) => databaseService.updateGrade(id, payload));
ipcMain.handle('db:deleteGrade', (_, id) => databaseService.deleteGrade(id));
ipcMain.handle('db:createDivision', (_, payload) => databaseService.createDivision(payload));
ipcMain.handle('db:updateDivision', (_, id, payload) => databaseService.updateDivision(id, payload));
ipcMain.handle('db:deleteDivision', (_, id) => databaseService.deleteDivision(id));
ipcMain.handle('db:createExam', (_, payload) => databaseService.createExam(payload));
ipcMain.handle('db:updateExam', (_, id, payload) => databaseService.updateExam(id, payload));
ipcMain.handle('db:deleteExam', (_, id) => databaseService.deleteExam(id));
ipcMain.handle('db:saveExamResults', (_, examId, rows) => databaseService.saveExamResults(examId, rows));
ipcMain.handle('db:getAttendanceForDate', (_, date) => databaseService.listAttendanceForDate(date));
ipcMain.handle('db:saveAttendanceRecords', (_, date, rows) => databaseService.saveAttendanceRecords(date, rows));
ipcMain.handle('db:createFeePayment', (_, studentId, payload) => databaseService.createFeePayment(studentId, payload));
ipcMain.handle('db:getFees', () => databaseService.getFees());
ipcMain.handle('db:createCertificate', (_, payload) => databaseService.createCertificate(payload));
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
