const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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
const authenticatedUsers = new Map();

async function getAuthenticatedUser(event) {
  const userId = authenticatedUsers.get(event.sender.id);
  if (!userId) return null;
  const session = await databaseService.validateUserSession(userId);
  if (!session.ok) {
    authenticatedUsers.delete(event.sender.id);
    return null;
  }
  return session.user;
}

async function getAuthenticatedUserId(event) {
  const user = await getAuthenticatedUser(event);
  return user?.id || null;
}

async function getAuthenticatedAdminId(event) {
  const userId = await getAuthenticatedUserId(event);
  return userId && await databaseService.isActiveAdmin(userId) ? userId : null;
}

async function getAuthenticatedFinanceId(event) {
  const user = await getAuthenticatedUser(event);
  return user && ['admin', 'super_admin', 'accounting_employee'].includes(user.role)
    ? user.id
    : null;
}

async function requireFinanceAccess(event) {
  const userId = await getAuthenticatedFinanceId(event);
  if (!userId) throw new Error('هذا القسم متاح لمدير المدرسة وموظف الحسابات فقط.');
  return userId;
}
function getRecoveryCredentialPath() {
  return path.join(app.getPath('userData'), 'recovery-gmail.bin');
}

function readRecoveryMailPassword(expectedEmail) {
  if (process.platform !== 'win32' || !safeStorage.isEncryptionAvailable()) {
    throw new Error('خزنة Windows الآمنة غير متاحة.');
  }
  const credentialPath = getRecoveryCredentialPath();
  if (!fs.existsSync(credentialPath)) throw new Error('لم يتم إعداد بيانات إرسال Gmail.');
  const decrypted = safeStorage.decryptString(fs.readFileSync(credentialPath));
  let credential;
  try {
    credential = JSON.parse(decrypted);
  } catch {
    throw new Error('بيانات Gmail المحفوظة تخص إعداداً قديماً؛ أعد إدخال كلمة مرور تطبيق Gmail للحساب الحالي.');
  }
  if (String(credential.email || '').trim().toLowerCase() !== String(expectedEmail || '').trim().toLowerCase()) {
    throw new Error('عنوان Gmail تغيّر؛ أدخل كلمة مرور تطبيق Gmail الجديدة لهذا العنوان واحفظها.');
  }
  return credential.password;
}

async function sendRecoveryEmail(to, code) {
  const password = readRecoveryMailPassword(to);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: to, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
  await transporter.sendMail({
    from: `"نظام إدارة المدارس" <${to}>`,
    to,
    subject: 'رمز استرجاع كلمة مرور مدير المدرسة',
    text: `رمز التحقق الخاص بك هو: ${code}\n\nتنتهي صلاحيته خلال 10 دقائق، ولا يمكن استخدامه إلا مرة واحدة. إذا لم تطلب هذا الرمز فتجاهل الرسالة.`,
  });
}

async function sendRecoveryTestEmail(to) {
  const password = readRecoveryMailPassword(to);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: to, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
  await transporter.sendMail({
    from: `"نظام إدارة المدارس" <${to}>`,
    to,
    subject: 'اختبار إعداد بريد استرجاع كلمة المرور',
    text: 'تم إعداد إرسال بريد استرجاع كلمة مرور مدير المدرسة بنجاح.',
  });
}

function getRecoveryMailErrorMessage(error) {
  const code = String(error?.code || '').toUpperCase();
  const response = String(error?.response || '').toLowerCase();
  const responseCode = Number(error?.responseCode || 0);

  if (code === 'EAUTH' || responseCode === 534 || responseCode === 535
    || response.includes('application-specific password') || response.includes('username and password not accepted')) {
    return 'رفض Gmail تسجيل الدخول. تأكد أن البريد في بيانات المدرسة هو نفسه حساب Google، وأن المدخل كلمة مرور تطبيق صالحة من 16 حرفاً بعد تفعيل التحقق بخطوتين، وليست كلمة مرور Gmail العادية.';
  }
  if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return 'تعذر الاتصال بخوادم Gmail. تحقق من اتصال الإنترنت أو جدار الحماية ثم أعد الاختبار.';
  }
  if (code === 'EENVELOPE' || responseCode >= 500) {
    return 'رفض Gmail إرسال الرسالة. تحقق من أن بريد المدرسة صحيح ومتاح وأنه يطابق حساب كلمة مرور التطبيق.';
  }
  if (error?.message === 'خزنة Windows الآمنة غير متاحة.') {
    return 'خزنة Windows الآمنة غير متاحة. شغّل التطبيق على Windows ثم أعد إعداد كلمة مرور تطبيق Gmail.';
  }
  if (error?.message === 'لم يتم إعداد بيانات إرسال Gmail.') {
    return 'لم تُحفظ كلمة مرور تطبيق Gmail. أدخل كلمة مرور التطبيق ذات 16 حرفاً واضغط حفظ بيانات المدرسة أولاً.';
  }
  return `تعذر إرسال الرسالة (${code || 'خطأ غير معروف'}). تحقق من إعدادات Gmail واتصال الإنترنت.`;
}

async function getRecoveryMailStatus(userId) {
  if (!await databaseService.isActiveAdmin(userId)) {
    return { ok: false, message: 'إعداد بريد الاسترجاع متاح لمدير المدرسة فقط.' };
  }
  const settings = await databaseService.getSchoolSettings();
  let credentialEmail = '';
  let hasCredential = false;
  if (process.platform === 'win32' && safeStorage.isEncryptionAvailable()) {
    const credentialPath = getRecoveryCredentialPath();
    hasCredential = fs.existsSync(credentialPath);
    if (hasCredential) {
      try {
        const credential = JSON.parse(safeStorage.decryptString(fs.readFileSync(credentialPath)));
        credentialEmail = String(credential.email || '').trim().toLowerCase();
      } catch {
        credentialEmail = '';
      }
    }
  }
  return {
    ok: true,
    recoveryEmail: settings.recoveryEmail,
    credentialEmail,
    hasCredential,
    credentialConfigured: Boolean(
      credentialEmail
      && credentialEmail === String(settings.recoveryEmail || '').trim().toLowerCase(),
    ),
  };
}

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

  win.webContents.on('did-start-navigation', (_, __, ___, isMainFrame) => {
    if (isMainFrame) authenticatedUsers.delete(win.webContents.id);
  });
  win.webContents.once('destroyed', () => authenticatedUsers.delete(win.webContents.id));
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
ipcMain.handle('db:getAppData', async (event, academicYear) => {
  const user = await getAuthenticatedUser(event);
  const includeFinancials = Boolean(user && ['admin', 'super_admin', 'accounting_employee'].includes(user.role));
  return databaseService.getAppData(academicYear, includeFinancials);
});
ipcMain.handle('db:createStudent', (_, payload, userId, academicYear) => databaseService.createStudent(payload, userId, academicYear));
ipcMain.handle('db:updateStudent', (_, id, payload, userId) => databaseService.updateStudent(id, payload, userId));
ipcMain.handle('db:deleteStudent', (_, id, userId) => databaseService.deleteStudent(id, userId));
ipcMain.handle('db:createTeacher', (_, payload, userId) => databaseService.createTeacher(payload, userId));
ipcMain.handle('db:updateTeacher', (_, id, payload, userId) => databaseService.updateTeacher(id, payload, userId));
ipcMain.handle('db:deleteTeacher', (_, id, userId) => databaseService.deleteTeacher(id, userId));
ipcMain.handle('db:createGrade', async (event, payload, userId) => {
  const actor = await getAuthenticatedUser(event);
  const canManageFinancials = Boolean(actor && ['admin', 'super_admin', 'accounting_employee'].includes(actor.role));
  return databaseService.createGrade(payload, actor?.id || userId, canManageFinancials);
});
ipcMain.handle('db:updateGrade', async (event, id, payload, userId) => {
  const actor = await getAuthenticatedUser(event);
  const canManageFinancials = Boolean(actor && ['admin', 'super_admin', 'accounting_employee'].includes(actor.role));
  return databaseService.updateGrade(id, payload, actor?.id || userId, canManageFinancials);
});
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
ipcMain.handle('db:createFeePayment', async (event, studentId, payload, _userId, academicYear) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.createFeePayment(studentId, payload, userId, academicYear);
});
ipcMain.handle('db:getFees', async (event, academicYear) => {
  await requireFinanceAccess(event);
  return databaseService.getFees(academicYear);
});
ipcMain.handle('db:getTuitionExpenses', async (event, academicYear) => {
  await requireFinanceAccess(event);
  return databaseService.getTuitionExpenses(academicYear);
});
ipcMain.handle('db:createTuitionExpense', async (event, payload, _userId, academicYear) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.createTuitionExpense(payload, userId, academicYear);
});
ipcMain.handle('db:createCertificate', (_, payload) => databaseService.createCertificate(payload));
ipcMain.handle('db:getSchedule', () => databaseService.getSchedule());
ipcMain.handle('db:saveScheduleCell', (_, payload) => databaseService.saveScheduleCell(payload));
ipcMain.handle('db:saveFullSchedule', (_, divisionId, cells, userId, academicYear) => databaseService.saveFullSchedule(divisionId, cells, userId, academicYear));
ipcMain.handle('db:getFinalResults', (_, academicYear) => databaseService.getFinalResults(academicYear));
ipcMain.handle('db:getExpenses', async (event) => {
  await requireFinanceAccess(event);
  return databaseService.getExpenses();
});
ipcMain.handle('db:createExpense', async (event, payload, _userId, academicYear) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.createExpense(payload, userId, academicYear);
});
ipcMain.handle('db:updateExpenseStatus', async (event, id, status) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.updateExpenseStatus(id, status, userId);
});
ipcMain.handle('db:login', async (event, username, password) => {
  authenticatedUsers.delete(event.sender.id);
  const result = await databaseService.login(username, password);
  if (result.ok) authenticatedUsers.set(event.sender.id, result.user.id);
  return result;
});
ipcMain.handle('auth:logout', (event) => authenticatedUsers.delete(event.sender.id));
ipcMain.handle('db:validateUserSession', async (event) => {
  const userId = authenticatedUsers.get(event.sender.id);
  if (!userId) return { ok: false };
  const result = await databaseService.validateUserSession(userId);
  if (!result.ok) authenticatedUsers.delete(event.sender.id);
  return result;
});
ipcMain.handle('db:getUsers', async (event) => {
  const userId = await getAuthenticatedAdminId(event);
  if (!userId) throw new Error('إدارة حسابات الموظفين متاحة لمدير المدرسة فقط.');
  return databaseService.getUsers(userId);
});
ipcMain.handle('db:createUser', async (event, payload) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId
    ? databaseService.createUser(payload, userId)
    : { ok: false, message: 'يرجى تسجيل الدخول مجدداً.' };
});
ipcMain.handle('db:deleteUser', async (event, id) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId
    ? databaseService.deleteUser(id, userId)
    : { ok: false, message: 'يرجى تسجيل الدخول مجدداً.' };
});
ipcMain.handle('db:updateUserPassword', async (event, id, newPassword) => {
  const userId = await getAuthenticatedUserId(event);
  return userId
    ? databaseService.updateUserPassword(id, newPassword, userId)
    : { ok: false, message: 'يرجى تسجيل الدخول مجدداً.' };
});
ipcMain.handle('db:updateOwnUsername', async (event, id, newUsername, currentPassword) => {
  const userId = await getAuthenticatedUserId(event);
  return userId
    ? databaseService.updateOwnUsername(id, newUsername, currentPassword, userId)
    : { ok: false, message: 'يرجى تسجيل الدخول مجدداً.' };
});
ipcMain.handle('db:setUserActive', async (event, id, isActive) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId
    ? databaseService.setUserActive(id, isActive, userId)
    : { ok: false, message: 'يرجى تسجيل الدخول مجدداً.' };
});
ipcMain.handle('db:updateGradeFee', async (event, gradeId, amount, currency) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.updateGradeFee(gradeId, amount, currency, userId);
});
ipcMain.handle('db:applyGradeFeeToAll', async (event, gradeId, amount) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.applyGradeFeeToAll(gradeId, amount, userId);
});
ipcMain.handle('db:updateGradeFeesBulk', async (event, edits) => {
  const userId = await requireFinanceAccess(event);
  return databaseService.updateGradeFeesBulk(edits, userId);
});
ipcMain.handle('db:getLogs', () => databaseService.getLogs());
ipcMain.handle('db:getAcademicYears', () => databaseService.getAcademicYears());
ipcMain.handle('db:addAcademicYear', async (event, yearName) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId ? databaseService.addAcademicYear(yearName, userId) : { ok: false, message: 'إدارة السنوات الدراسية متاحة لمدير المدرسة فقط.' };
});
ipcMain.handle('db:setCurrentAcademicYear', async (event, yearName) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId ? databaseService.setCurrentAcademicYear(yearName, userId) : { ok: false, message: 'تغيير السنة الدراسية متاح لمدير المدرسة فقط.' };
});
ipcMain.handle('db:getSchoolSettings', async (event) => {
  const settings = await databaseService.getSchoolSettings();
  const userId = await getAuthenticatedAdminId(event);
  return userId ? settings : { ...settings, recoveryEmail: '' };
});
ipcMain.handle('db:saveSchoolSettings', async (event, settings) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId
    ? databaseService.saveSchoolSettings(settings, userId)
    : { ok: false, message: 'تعديل بيانات المدرسة متاح لمدير المدرسة فقط.' };
});
ipcMain.handle('security:saveRecoveryMailPassword', async (event, email, password) => {
  const userId = await getAuthenticatedAdminId(event);
  if (!userId) {
    return { ok: false, message: 'إعداد بريد الاسترجاع متاح لمدير المدرسة فقط.' };
  }
  if (process.platform !== 'win32' || !safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: 'خزنة Windows الآمنة غير متاحة على هذا الجهاز.' };
  }
  const normalizedPassword = String(password || '').replace(/\s/g, '');
  if (!/^[a-zA-Z0-9]{16}$/.test(normalizedPassword)) {
    return { ok: false, message: 'أدخل كلمة مرور تطبيق Gmail المكونة من 16 حرفاً أو رقماً.' };
  }
  const settings = await databaseService.getSchoolSettings();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail !== String(settings.recoveryEmail || '').trim().toLowerCase()) {
    return { ok: false, message: 'احفظ بريد المدرسة أولاً، وتأكد أن كلمة مرور التطبيق تخص عنوان Gmail نفسه.' };
  }
  const encryptedPassword = safeStorage.encryptString(JSON.stringify({
    email: normalizedEmail,
    password: normalizedPassword,
  }));
  fs.writeFileSync(getRecoveryCredentialPath(), encryptedPassword);
  return { ok: true };
});
ipcMain.handle('security:getRecoveryMailStatus', async (event) => {
  const userId = await getAuthenticatedAdminId(event);
  return userId ? getRecoveryMailStatus(userId) : { ok: false, message: 'إعداد بريد الاسترجاع متاح لمدير المدرسة فقط.' };
});
ipcMain.handle('security:testRecoveryMail', async (event) => {
  const userId = await getAuthenticatedAdminId(event);
  if (!userId) return { ok: false, message: 'إعداد بريد الاسترجاع متاح لمدير المدرسة فقط.' };
  const status = await getRecoveryMailStatus(userId);
  if (!status.ok) return status;
  if (!status.recoveryEmail || !status.credentialConfigured) {
    return {
      ok: false,
      message: status.hasCredential
        ? `بيانات الإرسال المحفوظة تخص ${status.credentialEmail || 'حساباً سابقاً'}، بينما البريد الحالي هو ${status.recoveryEmail}. أدخل كلمة مرور تطبيق لهذا الحساب واحفظ البيانات أولاً.`
        : 'أدخل بريد Gmail وكلمة مرور التطبيق لهذا الحساب واحفظهما أولاً.',
    };
  }
  try {
    await sendRecoveryTestEmail(status.recoveryEmail);
    return { ok: true, message: 'تم إرسال رسالة اختبار إلى بريد المدرسة.' };
  } catch (error) {
    console.error('Recovery email test failed:', {
      code: error?.code || '',
      responseCode: error?.responseCode || '',
      command: error?.command || '',
    });
    return { ok: false, message: getRecoveryMailErrorMessage(error) };
  }
});
ipcMain.handle('security:requestPasswordRecovery', (_, username) => (
  databaseService.requestPasswordRecovery(username, sendRecoveryEmail)
));
ipcMain.handle('security:verifyPasswordRecoveryCode', (_, username, code) => (
  databaseService.verifyPasswordRecoveryCode(username, code)
));
ipcMain.handle('security:resetAdministratorPassword', (_, username, token, password) => (
  databaseService.resetAdministratorPassword(username, token, password)
));

ipcMain.handle('db:createBackup', async (event) => {
  const userId = await getAuthenticatedAdminId(event);
  if (!userId) throw new Error('إدارة النسخ الاحتياطي متاحة لمدير المدرسة فقط.');
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

ipcMain.handle('db:restoreBackup', async (event) => {
  const userId = await getAuthenticatedAdminId(event);
  if (!userId) throw new Error('استعادة النسخة الاحتياطية متاحة لمدير المدرسة فقط.');
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

ipcMain.handle('db:getLatestBackupInfo', async (event) => {
  const userId = await getAuthenticatedAdminId(event);
  if (!userId) throw new Error('معلومات النسخ الاحتياطي متاحة لمدير المدرسة فقط.');
  return databaseService.getLatestBackupInfo();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
