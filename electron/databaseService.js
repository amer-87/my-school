const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

let DATA_DIR, DB_PATH;
const recoveryHmacKey = crypto.randomBytes(32);
const recoveryChallenges = new Map();
const recoveryResetSessions = new Map();
const recoveryRequestTimes = new Map();

// Database Schema embedded directly to avoid file reading issues in production
const DATABASE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    gender TEXT,
    birth_date TEXT,
    grade TEXT,
    grade_id INTEGER,
    division TEXT,
    division_id INTEGER,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'نشط',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    gender TEXT,
    specialty TEXT,
    subject TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'نشط',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level TEXT,
    annual_fee REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade_id INTEGER NOT NULL,
    capacity INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT,
    grade_id INTEGER,
    division_id INTEGER,
    exam_date TEXT,
    total_score INTEGER DEFAULT 100,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    score REAL,
    modified_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    total_fee REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fee_record_id INTEGER NOT NULL,
    amount REAL DEFAULT 0,
    payment_date TEXT,
    method TEXT,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tuition_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'عراقي',
    expense_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    note TEXT DEFAULT '',
    academic_year TEXT NOT NULL,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    certificate_type TEXT NOT NULL,
    issued_at TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_id INTEGER NOT NULL,
    day_name TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    subject_name TEXT,
    teacher_id INTEGER,
    UNIQUE(division_id, day_name, period_number)
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'قيد الانتظار',
    expense_date TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    full_name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action_type TEXT NOT NULL,
    module_name TEXT,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_years (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_name TEXT UNIQUE NOT NULL,
    is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    school_name TEXT NOT NULL DEFAULT 'مدارس المعلم والكتاب الأهلية',
    whatsapp_phone TEXT NOT NULL DEFAULT '',
    recovery_email TEXT NOT NULL DEFAULT '',
    school_type TEXT NOT NULL DEFAULT '',
    school_address TEXT NOT NULL DEFAULT '',
    school_phone TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS password_recovery (
    username_key TEXT PRIMARY KEY,
    last_requested_at INTEGER NOT NULL
);
`;

function initPaths() {
  if (DATA_DIR) return;
  const isDev = !app.isPackaged;
  const BASE_DIR = path.resolve(__dirname, '..');

  // Database location: locally in dev, in AppData in production
  DATA_DIR = isDev ? path.join(BASE_DIR, 'data') : path.join(app.getPath('userData'), 'data');
  DB_PATH = path.join(DATA_DIR, 'school.db');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let connection = null;

function getConnection() {
  initPaths();
  if (!connection) {
    connection = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
      if (error) console.error('Failed to open database', error);
    });
  }
  return connection;
}

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    getConnection().run(query, params, function (error) {
      if (error) { reject(error); return; }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function executescript(query) {
  return new Promise((resolve, reject) => {
    getConnection().exec(query, (error) => {
      if (error) { reject(error); return; }
      resolve({ ok: true });
    });
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    getConnection().all(query, params, (error, rows) => {
      if (error) { reject(error); return; }
      resolve(rows || []);
    });
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    getConnection().get(query, params, (error, row) => {
      if (error) { reject(error); return; }
      resolve(row || null);
    });
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1 }, (error, hash) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedPassword) {
  if (!String(password || '').length) return false;
  const stored = String(storedPassword || '');
  if (stored.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = stored.split('$');
    if (!saltHex || !hashHex || !/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(hashHex)) return false;
    const expected = Buffer.from(hashHex, 'hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 }, (error, actual) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(expected.length === actual.length && crypto.timingSafeEqual(expected, actual));
      });
    });
  }
  const actual = Buffer.from(String(password));
  const expected = Buffer.from(stored);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function formatBackupTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function logActivity(userId, action, module, desc, oldVal = null, newVal = null) {
  try {
    await run(`INSERT INTO activity_logs (user_id, action_type, module_name, description, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, module, desc, oldVal ? JSON.stringify(oldVal) : null, newVal ? JSON.stringify(newVal) : null]);
  } catch (e) { console.error('Logging failed', e); }
}

async function initializeDatabase() {
  initPaths();
  // Execute embedded schema
  await executescript(DATABASE_SCHEMA);

  const migrations = [
    'ALTER TABLE students ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE students ADD COLUMN deleted_at TEXT',
    'ALTER TABLE students ADD COLUMN academic_year TEXT',
    'ALTER TABLE students ADD COLUMN created_by INTEGER',
    'ALTER TABLE students ADD COLUMN updated_by INTEGER',
    'ALTER TABLE teachers ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE teachers ADD COLUMN deleted_at TEXT',
    'ALTER TABLE teachers ADD COLUMN created_by INTEGER',
    'ALTER TABLE grades ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE grades ADD COLUMN annual_fee REAL DEFAULT 0',
    'ALTER TABLE divisions ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE attendance_records ADD COLUMN academic_year TEXT',
    'ALTER TABLE attendance_records ADD COLUMN created_by INTEGER',
    'ALTER TABLE exams ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE exams ADD COLUMN academic_year TEXT',
    'ALTER TABLE exam_results ADD COLUMN academic_year TEXT',
    'ALTER TABLE exam_results ADD COLUMN modified_by INTEGER',
    'ALTER TABLE fee_records ADD COLUMN academic_year TEXT',
    'ALTER TABLE fee_records ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE fee_payments ADD COLUMN academic_year TEXT',
    'ALTER TABLE fee_payments ADD COLUMN created_by INTEGER',
    'ALTER TABLE fee_payments ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE users ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE school_settings ADD COLUMN recovery_email TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE school_settings ADD COLUMN school_type TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE school_settings ADD COLUMN school_address TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE school_settings ADD COLUMN school_phone TEXT NOT NULL DEFAULT ''",
    'ALTER TABLE certificates ADD COLUMN academic_year TEXT',
    'ALTER TABLE certificates ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE schedule ADD COLUMN academic_year TEXT',
    'ALTER TABLE expenses ADD COLUMN academic_year TEXT',
    'ALTER TABLE expenses ADD COLUMN created_by INTEGER',
    'ALTER TABLE expenses ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE grades ADD COLUMN currency TEXT DEFAULT "عراقي"',
    'ALTER TABLE exams ADD COLUMN course TEXT DEFAULT \'الكورس الأول\'',
    'CREATE INDEX IF NOT EXISTS idx_students_grade_id ON students(grade_id)',
    'CREATE INDEX IF NOT EXISTS idx_fee_records_student_id ON fee_records(student_id)'
  ];

  for (const sql of migrations) {
    try { await run(sql); } catch (e) {}
  }
  const userColumns = await all('PRAGMA table_info(users)');
  if (!userColumns.some((column) => column.name === 'is_active')) {
    throw new Error('Database migration failed: users.is_active column is missing.');
  }
  const schoolSettingsColumns = await all('PRAGMA table_info(school_settings)');
  for (const column of ['school_type', 'school_address', 'school_phone']) {
    if (!schoolSettingsColumns.some((item) => item.name === column)) {
      throw new Error(`Database migration failed: school_settings.${column} column is missing.`);
    }
  }
  await run("UPDATE users SET is_active = 1 WHERE is_active IS NULL OR role IN ('admin', 'super_admin')");
  await run("UPDATE users SET is_deleted = 0 WHERE is_deleted IS NULL");
  await run("UPDATE users SET role = 'administrative_employee' WHERE role = 'employee'");
  const legacyPasswords = await all("SELECT id, password FROM users WHERE password NOT LIKE 'scrypt$%'");
  for (const user of legacyPasswords) {
    await run('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(user.password), user.id]);
  }

  const currentYear = await get('SELECT * FROM academic_years WHERE is_current = 1');
  if (!currentYear) await run('INSERT OR IGNORE INTO academic_years (year_name, is_current) VALUES (?, ?)', ['2026-2027', 1]);

  const adminExists = await get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) await run('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)', ['admin', await hashPassword('admin123'), 'admin', 'مدير النظام']);

  return { ok: true, path: DB_PATH };
}

async function getAppData(academicYear = null) {
  const yearFilter = academicYear ? ` AND academic_year = '${academicYear}'` : '';
  const [students, teachers, grades, divisions, exams, attendance, fees, certificates] = await Promise.all([
    all(`SELECT * FROM students WHERE is_deleted = 0${yearFilter} ORDER BY id DESC`),
    all('SELECT * FROM teachers WHERE is_deleted = 0 ORDER BY id DESC'),
    all('SELECT * FROM grades WHERE is_deleted = 0 ORDER BY id DESC'),
    all('SELECT * FROM divisions WHERE is_deleted = 0 ORDER BY id DESC'),
    all(`SELECT * FROM exams WHERE is_deleted = 0${yearFilter} ORDER BY id DESC`),
    all(`SELECT * FROM attendance_records WHERE 1=1${yearFilter} ORDER BY attendance_date DESC, id DESC`),
    getFees(academicYear),
    all(`SELECT * FROM certificates WHERE is_deleted = 0${yearFilter} ORDER BY id DESC`),
  ]);
  return { students: students.map(mapStudentRow), teachers: teachers.map(mapTeacherRow), grades: grades.map(mapGradeRow), divisions: divisions.map(mapDivisionRow), exams: exams.map(mapExamRow), attendance: attendance.map(mapAttendanceRow), fees, certificates };
}

async function login(username, password) {
  const usernameValue = String(username || '').trim().slice(0, 128);
  const passwordValue = String(password || '');
  if (!usernameValue || !passwordValue || passwordValue.length > 256) {
    return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }
  const result = await get('SELECT id, username, password, role, full_name, is_active, is_deleted FROM users WHERE lower(username) = lower(?)', [usernameValue]);
  if (!result || !await verifyPassword(passwordValue, result.password)) {
    return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }
  if (result.is_deleted) return { ok: false, message: 'هذا الحساب ملغى. يرجى مراجعة مدير المدرسة.' };
  if (!result.is_active) return { ok: false, message: 'هذا الحساب موقوف. يرجى مراجعة مدير المدرسة.' };
  if (!String(result.password).startsWith('scrypt$')) {
    await run('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(passwordValue), result.id]);
  }
  await logActivity(result.id, 'LOGIN', 'auth', `تم تسجيل دخول المستخدم ${result.username}`);
  const { password: storedPassword, ...user } = result;
  return {
    ok: true,
    user: {
      ...user,
      role: user.role === 'super_admin' ? 'admin' : user.role === 'employee' ? 'administrative_employee' : user.role,
    },
  };
}

async function validateUserSession(userId) {
  const user = await get('SELECT id, username, role, full_name, is_active, is_deleted FROM users WHERE id = ?', [userId]);
  if (!user?.is_active || user.is_deleted) return { ok: false };
  return {
    ok: true,
    user: {
      ...user,
      role: user.role === 'super_admin' ? 'admin' : user.role === 'employee' ? 'administrative_employee' : user.role,
    },
  };
}

async function getLogs() { return all('SELECT l.*, u.full_name as user_name FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 200'); }
async function getAcademicYears() { return all('SELECT * FROM academic_years ORDER BY year_name DESC'); }

async function getSchoolSettings() {
  const settings = await get('SELECT school_name, whatsapp_phone, recovery_email, school_type, school_address, school_phone FROM school_settings WHERE id = 1');
  return {
    schoolName: settings?.school_name || 'مدارس المعلم والكتاب الأهلية',
    whatsappPhone: settings?.whatsapp_phone || '',
    recoveryEmail: settings?.recovery_email || '',
    schoolType: settings?.school_type || '',
    schoolAddress: settings?.school_address || '',
    schoolPhone: settings?.school_phone || '',
  };
}

async function saveSchoolSettings(settings, userId) {
  const schoolName = String(settings?.schoolName || '').trim();
  const whatsappPhone = String(settings?.whatsappPhone || '').replace(/\D/g, '');
  const recoveryEmail = String(settings?.recoveryEmail || '').trim().toLowerCase();
  const schoolType = String(settings?.schoolType || '').trim();
  const schoolAddress = String(settings?.schoolAddress || '').trim();
  const schoolPhone = String(settings?.schoolPhone || '').trim();

  if (!await requireActiveAdmin(userId)) {
    return { ok: false, message: 'تعديل بيانات المدرسة متاح لمدير المدرسة فقط.' };
  }
  if (!schoolName) {
    return { ok: false, message: 'يرجى إدخال اسم المدرسة.' };
  }
  if (!whatsappPhone) {
    return { ok: false, message: 'يرجى إدخال رقم واتساب المدرسة.' };
  }
  if (!/^9647\d{9}$/.test(whatsappPhone)) {
    return { ok: false, message: 'يرجى إدخال رقم واتساب عراقي صحيح يبدأ بـ +9647.' };
  }
  if (recoveryEmail && (recoveryEmail.length > 254 || !/^[^\s@]+@gmail\.com$/i.test(recoveryEmail))) {
    return { ok: false, message: 'يرجى إدخال عنوان Gmail صحيح لاسترجاع كلمة مرور المدير.' };
  }
  if (schoolType.length > 100 || schoolAddress.length > 300 || schoolPhone.length > 50) {
    return { ok: false, message: 'تحقق من طول نوع المدرسة أو عنوانها أو رقم هاتفها.' };
  }

  await run(
    `INSERT INTO school_settings
       (id, school_name, whatsapp_phone, recovery_email, school_type, school_address, school_phone)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       school_name = excluded.school_name,
       whatsapp_phone = excluded.whatsapp_phone,
       recovery_email = excluded.recovery_email,
       school_type = excluded.school_type,
       school_address = excluded.school_address,
       school_phone = excluded.school_phone`,
    [schoolName, whatsappPhone, recoveryEmail, schoolType, schoolAddress, schoolPhone],
  );
  await logActivity(userId, 'UPDATE', 'settings', 'تحديث بيانات المدرسة');
  return { ok: true, settings: await getSchoolSettings() };
}

async function addAcademicYear(yearName, userId) {
  const existing = await get('SELECT id FROM academic_years WHERE year_name = ?', [yearName]);
  if (existing) return { ok: false, message: 'هذا العام الدراسي مسجل مسبقاً' };

  await run('INSERT INTO academic_years (year_name, is_current) VALUES (?, ?)', [yearName, 0]);
  await logActivity(userId, 'INSERT', 'settings', `إضافة عام دراسي جديد: ${yearName}`);
  return { ok: true };
}

async function setCurrentAcademicYear(yearName, userId) {
  await executescript('BEGIN TRANSACTION');
  try {
    await run('UPDATE academic_years SET is_current = 0');
    await run('UPDATE academic_years SET is_current = 1 WHERE year_name = ?', [yearName]);
    await logActivity(userId, 'UPDATE', 'settings', `تغيير العام الدراسي النشط إلى: ${yearName}`);
    await executescript('COMMIT');
    return { ok: true };
  } catch (e) {
    await executescript('ROLLBACK');
    throw e;
  }
}
async function getActor(userId) {
  if (!userId) return null;
  return get('SELECT id, role, is_active, is_deleted FROM users WHERE id = ?', [userId]);
}

async function requireActiveAdmin(userId) {
  const actor = await getActor(userId);
  return Boolean(actor?.is_active && !actor.is_deleted && ['admin', 'super_admin'].includes(actor.role));
}

async function isActiveAdmin(userId) {
  return requireActiveAdmin(userId);
}

async function requestPasswordRecovery(username, sendCode) {
  const normalizedUsername = String(username || '').trim().toLowerCase().slice(0, 128);
  const response = {
    ok: true,
    message: 'إذا كان اسم المستخدم يخص مدير المدرسة وكان البريد مضبوطاً، فسيصل رمز التحقق إلى البريد المسجل.',
  };
  if (!normalizedUsername) return response;

  const user = await get(
    `SELECT id FROM users WHERE lower(username) = ? AND role IN ('admin', 'super_admin')
     AND is_active = 1 AND COALESCE(is_deleted, 0) = 0`,
    [normalizedUsername],
  );
  const settings = await get('SELECT recovery_email FROM school_settings WHERE id = 1');
  const recoveryEmail = String(settings?.recovery_email || '').trim();
  if (!user || !recoveryEmail || typeof sendCode !== 'function') return response;

  const usernameKey = crypto.createHash('sha256').update(normalizedUsername).digest('hex');
  const now = Date.now();
  const rateLimit = await get('SELECT last_requested_at FROM password_recovery WHERE username_key = ?', [usernameKey]);
  if (rateLimit && now - rateLimit.last_requested_at < 60_000) return response;
  await run(
    `INSERT INTO password_recovery (username_key, last_requested_at) VALUES (?, ?)
     ON CONFLICT(username_key) DO UPDATE SET last_requested_at = excluded.last_requested_at`,
    [usernameKey, now],
  );

  const code = String(crypto.randomInt(100000, 1_000_000));
  const codeHash = crypto.createHmac('sha256', recoveryHmacKey).update(`${user.id}:${code}`).digest();
  recoveryChallenges.set(user.id, { codeHash, expiresAt: now + 10 * 60_000, attempts: 0 });
  recoveryResetSessions.delete(user.id);
  Promise.resolve()
    .then(() => sendCode(recoveryEmail, code))
    .catch(async (error) => {
      if (recoveryChallenges.get(user.id)?.codeHash === codeHash) recoveryChallenges.delete(user.id);
      await run('DELETE FROM password_recovery WHERE username_key = ?', [usernameKey]);
      console.error('Failed to send password recovery email:', error?.code || 'unknown');
    });
  return response;
}

async function verifyPasswordRecoveryCode(username, code) {
  const normalizedUsername = String(username || '').trim().toLowerCase().slice(0, 128);
  const user = await get(
    `SELECT id FROM users WHERE lower(username) = ? AND role IN ('admin', 'super_admin')
     AND is_active = 1 AND COALESCE(is_deleted, 0) = 0`,
    [normalizedUsername],
  );
  const challenge = user ? recoveryChallenges.get(user.id) : null;
  if (!challenge || challenge.expiresAt <= Date.now() || challenge.attempts >= 5) {
    if (user) recoveryChallenges.delete(user.id);
    return { ok: false, message: 'رمز التحقق غير صحيح أو منتهي الصلاحية.' };
  }

  challenge.attempts += 1;
  const submittedCode = String(code || '').slice(0, 7);
  const actualHash = crypto.createHmac('sha256', recoveryHmacKey)
    .update(`${user.id}:${submittedCode}`).digest();
  if (!/^\d{6}$/.test(submittedCode)
    || actualHash.length !== challenge.codeHash.length
    || !crypto.timingSafeEqual(actualHash, challenge.codeHash)) {
    if (challenge.attempts >= 5) recoveryChallenges.delete(user.id);
    return { ok: false, message: 'رمز التحقق غير صحيح أو منتهي الصلاحية.' };
  }

  recoveryChallenges.delete(user.id);
  const token = crypto.randomBytes(32).toString('hex');
  recoveryResetSessions.set(user.id, {
    tokenHash: crypto.createHash('sha256').update(token).digest(),
    expiresAt: Date.now() + 10 * 60_000,
  });
  return { ok: true, resetToken: token };
}

async function resetAdministratorPassword(username, resetToken, newPassword) {
  const normalizedUsername = String(username || '').trim().toLowerCase().slice(0, 128);
  const user = await get(
    `SELECT id, full_name FROM users WHERE lower(username) = ? AND role IN ('admin', 'super_admin')
     AND is_active = 1 AND COALESCE(is_deleted, 0) = 0`,
    [normalizedUsername],
  );
  const session = user ? recoveryResetSessions.get(user.id) : null;
  const tokenValue = String(resetToken || '');
  const suppliedTokenHash = crypto.createHash('sha256').update(tokenValue.slice(0, 64)).digest();
  if (!/^[\da-f]{64}$/i.test(tokenValue) || !session || session.expiresAt <= Date.now()
    || !crypto.timingSafeEqual(session.tokenHash, suppliedTokenHash)) {
    if (user) recoveryResetSessions.delete(user.id);
    return { ok: false, message: 'جلسة استرجاع كلمة المرور غير صالحة أو منتهية.' };
  }
  const password = String(newPassword || '');
  if (password.length < 8 || password.length > 256) {
    return { ok: false, message: 'كلمة المرور يجب أن تتكون من 8 إلى 256 حرفاً.' };
  }

  recoveryResetSessions.delete(user.id);
  await run('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(password), user.id]);
  await logActivity(user.id, 'UPDATE', 'auth', 'إعادة تعيين كلمة مرور مدير المدرسة عبر البريد الإلكتروني');
  return { ok: true };
}

async function getUsers(actorId) {
  if (!await requireActiveAdmin(actorId)) throw new Error('إدارة حسابات الموظفين متاحة لمدير المدرسة فقط.');
  return all(`SELECT id, username, role, full_name, COALESCE(is_active, 1) AS is_active, created_at
    FROM users WHERE COALESCE(is_deleted, 0) = 0 ORDER BY id DESC`);
}

async function createUser(payload, userId) {
  if (!await requireActiveAdmin(userId)) return { ok: false, message: 'إنشاء حسابات الموظفين متاح لمدير المدرسة فقط.' };
  const fullName = String(payload?.fullName || '').trim();
  const username = String(payload?.username || '').trim();
  const password = String(payload?.password || '');
  const role = payload?.role;
  if (!fullName || !username || username.length > 128 || password.length < 6 || password.length > 256 || !['accounting_employee', 'administrative_employee'].includes(role)) {
    return { ok: false, message: 'أدخل الاسم واسم المستخدم وكلمة مرور من 6 أحرف على الأقل واختر نوع الموظف.' };
  }
  const existingUser = await get(
    'SELECT full_name, is_active, is_deleted FROM users WHERE lower(username) = lower(?)',
    [username],
  );
  if (existingUser) {
    const accountState = existingUser.is_deleted
      ? 'اسم المستخدم محفوظ في السجلات السابقة ولا يمكن استخدامه مجدداً.'
      : existingUser.is_active === 0
        ? 'الحساب الموجود موقوف؛ يمكنك تفعيله من قائمة حسابات الموظفين.'
        : 'اختر اسم مستخدم آخر.';
    return {
      ok: false,
      message: `اسم المستخدم مسجل بالفعل للحساب "${existingUser.full_name || username}". ${accountState}`,
    };
  }

  let row;
  try {
    row = await run(
      'INSERT INTO users (username, password, role, full_name, is_active) VALUES (?, ?, ?, ?, 1)',
      [username, await hashPassword(password), role, fullName],
    );
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { ok: false, message: 'اسم المستخدم مسجل بالفعل. اختر اسم مستخدم آخر.' };
    }
    throw error;
  }
  await logActivity(userId, 'INSERT', 'users', `إنشاء حساب للموظف ${fullName} (${role})`);
  return { ok: true, user: { id: row.id, username, role, full_name: fullName, is_active: 1 } };
}

async function setUserActive(id, isActive, userId) {
  if (!await requireActiveAdmin(userId)) return { ok: false, message: 'إدارة حسابات الموظفين متاحة لمدير المدرسة فقط.' };
  const target = await get('SELECT username, full_name, role, is_deleted FROM users WHERE id = ?', [id]);
  if (!target) return { ok: false, message: 'حساب الموظف غير موجود.' };
  if (target.is_deleted) return { ok: false, message: 'هذا الحساب ملغى.' };
  if (['admin', 'super_admin'].includes(target.role)) return { ok: false, message: 'لا يمكن إيقاف حساب المدير.' };
  await run('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  await logActivity(userId, 'UPDATE', 'users', `${isActive ? 'تفعيل' : 'إيقاف'} حساب الموظف ${target.full_name}`);
  return { ok: true };
}

async function deleteUser(id, userId) {
  if (!await requireActiveAdmin(userId)) return { ok: false, message: 'إدارة حسابات الموظفين متاحة لمدير المدرسة فقط.' };
  const target = await get('SELECT username, full_name, role, is_deleted FROM users WHERE id = ?', [id]);
  if (!target) return { ok: false, message: 'حساب الموظف غير موجود.' };
  if (['admin', 'super_admin'].includes(target.role)) return { ok: false, message: 'لا يمكن حذف حساب مدير المدرسة.' };
  if (target.is_deleted) return { ok: false, message: 'هذا الحساب ملغى مسبقاً.' };
  await run('UPDATE users SET is_active = 0, is_deleted = 1 WHERE id = ?', [id]);
  await logActivity(userId, 'DELETE', 'users', `إلغاء حساب الموظف ${target.full_name} (${target.username}) مع الاحتفاظ بسجلاته`);
  return { ok: true };
}

async function updateUserPassword(id, newPassword, userId) {
  const actor = await getActor(userId);
  const user = await get('SELECT username, full_name, role, is_deleted FROM users WHERE id = ?', [id]);
  if (!actor?.is_active || !user) return { ok: false, message: 'الحساب غير متاح.' };
  if (user.is_deleted) return { ok: false, message: 'لا يمكن تغيير كلمة مرور حساب ملغى.' };
  if (Number(id) !== Number(userId) && !['admin', 'super_admin'].includes(actor.role)) {
    return { ok: false, message: 'يمكن للموظف تغيير كلمة مروره فقط.' };
  }
  if (Number(id) !== Number(userId) && ['admin', 'super_admin'].includes(user.role)) {
    return { ok: false, message: 'لا يمكن إعادة تعيين كلمة مرور حساب مدير آخر.' };
  }
  if (String(newPassword || '').length < 6 || String(newPassword || '').length > 256) {
    return { ok: false, message: 'كلمة المرور يجب أن تتكون من 6 إلى 256 حرفاً.' };
  }
  await run('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(newPassword), id]);
  await logActivity(userId, 'UPDATE', 'users', `تغيير كلمة المرور للمستخدم: ${user.full_name}`);
  return { ok: true };
}

async function updateOwnUsername(id, newUsername, currentPassword, userId) {
  const actor = await getActor(userId);
  if (!actor?.is_active || actor.is_deleted || Number(id) !== Number(userId)
    || !['admin', 'super_admin'].includes(actor.role)) {
    return { ok: false, message: 'تغيير اسم المستخدم متاح لمدير المدرسة لحسابه فقط.' };
  }

  const username = String(newUsername || '').trim();
  if (!username || username.length > 128) return { ok: false, message: 'يرجى إدخال اسم مستخدم صالح.' };

  const user = await get('SELECT username, password FROM users WHERE id = ?', [id]);
  if (!user) return { ok: false, message: 'الحساب غير موجود.' };
  if (!await verifyPassword(currentPassword, user.password)) {
    return { ok: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }
  const duplicate = await get('SELECT id FROM users WHERE lower(username) = lower(?) AND id != ?', [username, id]);
  if (duplicate) return { ok: false, message: 'اسم المستخدم مستخدم مسبقاً. اختر اسماً آخر.' };

  try {
    await run('UPDATE users SET username = ? WHERE id = ?', [username, id]);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { ok: false, message: 'اسم المستخدم مستخدم مسبقاً. اختر اسماً آخر.' };
    }
    throw error;
  }
  await logActivity(userId, 'UPDATE', 'users', `تغيير اسم المستخدم من ${user.username} إلى ${username}`);
  return { ok: true, username };
}

async function createStudent(payload, userId, academicYear) {
  const row = await run('INSERT INTO students (full_name, gender, birth_date, grade, grade_id, division, division_id, phone, address, status, academic_year, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [payload.fullName, payload.gender || 'ذكر', payload.dob || '', payload.grade || '', payload.gradeId || null, payload.division || '', payload.divisionId || null, payload.phone || '', payload.address || '', payload.status || 'نشط', academicYear, userId]);
  const newStudent = { id: row.id, ...payload, academic_year: academicYear };
  await logActivity(userId, 'INSERT', 'students', `إضافة الطالب الجديد: ${payload.fullName}`, null, newStudent);
  return newStudent;
}

async function updateStudent(id, payload, userId) {
  const oldVal = await get('SELECT * FROM students WHERE id = ?', [id]);
  await run('UPDATE students SET full_name = ?, gender = ?, birth_date = ?, grade = ?, grade_id = ?, division = ?, division_id = ?, phone = ?, address = ?, status = ?, updated_by = ? WHERE id = ?', [payload.fullName, payload.gender || 'ذكر', payload.dob || '', payload.grade || '', payload.gradeId || null, payload.division || '', payload.divisionId || null, payload.phone || '', payload.address || '', payload.status || 'نشط', userId, id]);
  const newVal = { id, ...payload };
  await logActivity(userId, 'UPDATE', 'students', `تعديل بيانات الطالب: ${payload.fullName}`, oldVal, newVal);
  return newVal;
}

async function deleteStudent(id, userId) {
  const student = await get('SELECT full_name FROM students WHERE id = ?', [id]);
  await run('UPDATE students SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?', [userId, id]);
  await logActivity(userId, 'DELETE', 'students', `حذف الطالب: ${student?.full_name}`, student, null);
  return true;
}

async function createTeacher(payload, userId) {
  const row = await run('INSERT INTO teachers (full_name, gender, specialty, subject, phone, address, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [payload.fullName, payload.gender || 'ذكر', payload.specialty || '', payload.subject || '', payload.phone || '', payload.address || '', payload.status || 'نشط', userId]);
  const newTeacher = { id: row.id, ...payload };
  await logActivity(userId, 'INSERT', 'teachers', `إضافة المعلم الجديد: ${payload.fullName}`, null, newTeacher);
  return newTeacher;
}

async function updateTeacher(id, payload, userId) {
  const oldVal = await get('SELECT * FROM teachers WHERE id = ?', [id]);
  await run('UPDATE teachers SET full_name = ?, gender = ?, specialty = ?, subject = ?, phone = ?, address = ?, status = ? WHERE id = ?', [payload.fullName, payload.gender || 'ذكر', payload.specialty || '', payload.subject || '', payload.phone || '', payload.address || '', payload.status || 'نشط', id]);
  const newVal = { id, ...payload };
  await logActivity(userId, 'UPDATE', 'teachers', `تعديل بيانات المعلم: ${payload.fullName}`, oldVal, newVal);
  return newVal;
}

async function deleteTeacher(id, userId) {
  const teacher = await get('SELECT full_name FROM teachers WHERE id = ?', [id]);
  await run('UPDATE teachers SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  await logActivity(userId, 'DELETE', 'teachers', `حذف المعلم: ${teacher?.full_name}`, teacher, null);
  return true;
}

async function createGrade(payload, userId) {
  const row = await run('INSERT INTO grades (name, level, annual_fee, currency) VALUES (?, ?, ?, ?)', [payload.name, payload.level || 'ابتدائي', payload.annualFee || 0, payload.currency || 'عراقي']);
  const newGrade = { id: row.id, ...payload };
  await logActivity(userId, 'INSERT', 'grades', `إنشاء صف جديد: ${payload.name}`, null, newGrade);
  return newGrade;
}

async function updateGrade(id, payload, userId) {
  const oldVal = await get('SELECT * FROM grades WHERE id = ?', [id]);
  await run('UPDATE grades SET name = ?, level = ?, annual_fee = ?, currency = ? WHERE id = ?', [payload.name, payload.level || 'ابتدائي', payload.annualFee || 0, payload.currency || 'عراقي', id]);
  const newVal = { id, ...payload };
  await logActivity(userId, 'UPDATE', 'grades', `تعديل بيانات الصف: ${payload.name}`, oldVal, newVal);
  return newVal;
}

async function deleteGrade(id, userId) {
  const grade = await get('SELECT name FROM grades WHERE id = ?', [id]);
  await run('UPDATE grades SET is_deleted = 1 WHERE id = ?', [id]);
  await run('UPDATE divisions SET is_deleted = 1 WHERE grade_id = ?', [id]);
  await logActivity(userId, 'DELETE', 'grades', `حذف الصف: ${grade?.name}`, grade, null);
  return true;
}

async function createDivision(payload, userId) {
  const row = await run('INSERT INTO divisions (name, grade_id, capacity) VALUES (?, ?, ?)', [payload.name, payload.gradeId, payload.capacity || 0]);
  const newDiv = { id: row.id, ...payload };
  await logActivity(userId, 'INSERT', 'divisions', `إنشاء شعبة جديدة: ${payload.name}`, null, newDiv);
  return newDiv;
}

async function updateDivision(id, payload, userId) {
  const oldVal = await get('SELECT * FROM divisions WHERE id = ?', [id]);
  await run('UPDATE divisions SET name = ?, grade_id = ?, capacity = ? WHERE id = ?', [payload.name, payload.gradeId, payload.capacity || 0, id]);
  const newVal = { id, ...payload };
  await logActivity(userId, 'UPDATE', 'divisions', `تعديل بيانات الشعبة: ${payload.name}`, oldVal, newVal);
  return newVal;
}

async function deleteDivision(id, userId) {
  const div = await get('SELECT name FROM divisions WHERE id = ?', [id]);
  await run('UPDATE divisions SET is_deleted = 1 WHERE id = ?', [id]);
  await logActivity(userId, 'DELETE', 'divisions', `حذف الشعبة: ${div?.name}`, div, null);
  return true;
}

async function saveAttendanceRecords(date, records, userId, academicYear) {
  const studentIds = records.map(r => r.studentId);
  if (studentIds.length > 0) {
    const placeholders = studentIds.map(() => '?').join(',');
    await run(`DELETE FROM attendance_records WHERE attendance_date = ? AND student_id IN (${placeholders})`, [date, ...studentIds]);
  }

  for (const record of records) {
    await run('INSERT INTO attendance_records (student_id, attendance_date, status, note, academic_year, created_by) VALUES (?, ?, ?, ?, ?, ?)', [record.studentId, date, record.status, record.note || '', academicYear, userId]);
  }
  await logActivity(userId, 'UPDATE', 'attendance', `تسجيل حضور وانصراف لتاريخ ${date} لـ ${records.length} طالب`);
  return true;
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function createFeePayment(studentId, payload, userId, academicYear) {
  const amount = roundMoney(Number(payload.amount));
  const paymentDate = payload.date || new Date().toISOString().slice(0, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: 'يجب إدخال مبلغ دفعة أكبر من صفر.' };
  }
  if (!isValidIsoDate(paymentDate)) {
    return { ok: false, message: 'تاريخ الدفعة غير صالح.' };
  }

  let feeRecord = await get(
    `SELECT id, total_fee FROM fee_records
     WHERE student_id = ? AND COALESCE(is_deleted, 0) = 0
       AND (academic_year = ? OR academic_year IS NULL)
     ORDER BY CASE WHEN academic_year = ? THEN 0 ELSE 1 END, id DESC LIMIT 1`,
    [studentId, academicYear, academicYear],
  );
  if (!feeRecord) {
    const student = await get('SELECT grade_id FROM students WHERE id = ?', [studentId]);
    const grade = student?.grade_id
      ? await get('SELECT annual_fee FROM grades WHERE id = ?', [student.grade_id])
      : null;
    const totalFee = Number(grade?.annual_fee || 15000);
    const res = await run(
      'INSERT INTO fee_records (student_id, total_fee, academic_year, is_deleted) VALUES (?, ?, ?, 0)',
      [studentId, totalFee, academicYear],
    );
    feeRecord = { id: res.id, total_fee: totalFee };
  }

  const paymentTotals = await get(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM fee_payments
     WHERE fee_record_id = ? AND COALESCE(is_deleted, 0) = 0
       AND (academic_year = ? OR academic_year IS NULL)`,
    [feeRecord.id, academicYear],
  );
  const outstanding = roundMoney(Math.max(0, Number(feeRecord.total_fee || 0) - Number(paymentTotals?.total || 0)));
  if (amount > outstanding) {
    return { ok: false, message: `المبلغ يتجاوز الرصيد المتبقي (${outstanding}).` };
  }

  await executescript('BEGIN TRANSACTION');
  try {
    const paymentRow = await run(
      `INSERT INTO fee_payments
        (fee_record_id, amount, payment_date, method, note, academic_year, created_by, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [feeRecord.id, amount, paymentDate, payload.method || 'نقدي', payload.note || '', academicYear, userId],
    );

    await logActivity(userId, 'INSERT', 'fees', `تسجيل دفعة مالية بقيمة ${amount} للطالب رقم ${studentId}`);
    await executescript('COMMIT');
    const receiver = await get('SELECT full_name FROM users WHERE id = ?', [userId]);
    return { id: paymentRow.id, feeRecordId: feeRecord.id, receivedBy: receiver?.full_name || '', ...payload };
  } catch (error) {
    await executescript('ROLLBACK');
    throw error;
  }
}

async function updateGradeFee(gradeId, amount, currency, userId) {
  const oldVal = await get('SELECT name, annual_fee, currency FROM grades WHERE id = ?', [gradeId]);
  await run('UPDATE grades SET annual_fee = ?, currency = ? WHERE id = ?', [amount, currency, gradeId]);
  await logActivity(userId, 'UPDATE', 'grades', `تعديل القسط الدراسي للصف ${oldVal?.name} إلى ${amount} (${currency})`, oldVal, { annual_fee: amount, currency });
  return { ok: true };
}

async function applyGradeFeeToAll(gradeId, amount, userId) {
  const grade = await get('SELECT name FROM grades WHERE id = ?', [gradeId]);
  await run('UPDATE fee_records SET total_fee = ? WHERE student_id IN (SELECT id FROM students WHERE grade_id = ?)', [amount, gradeId]);
  await run('INSERT INTO fee_records (student_id, total_fee) SELECT id, ? FROM students WHERE grade_id = ? AND id NOT IN (SELECT student_id FROM fee_records)', [amount, gradeId]);
  await logActivity(userId, 'UPDATE', 'fees', `تطبيق القسط الجديد (${amount}) على كافة طلاب صف ${grade?.name}`);
  return { ok: true };
}

/**
 * NEW: Bulk update for grade fees and student records.
 * Uses a single transaction to be 100x faster and prevent UI locking.
 */
async function updateGradeFeesBulk(edits, userId) {
  await executescript('BEGIN TRANSACTION');
  try {
    for (const edit of edits) {
      const { gradeId, amount, currency } = edit;

      // 1. Update grade definition
      await run('UPDATE grades SET annual_fee = ?, currency = ? WHERE id = ?', [amount, currency, gradeId]);

      // 2. Update existing fee records for students in this grade
      await run('UPDATE fee_records SET total_fee = ? WHERE student_id IN (SELECT id FROM students WHERE grade_id = ?)', [amount, gradeId]);

      // 3. Create missing fee records for new students in this grade
      await run('INSERT INTO fee_records (student_id, total_fee) SELECT id, ? FROM students WHERE grade_id = ? AND id NOT IN (SELECT student_id FROM fee_records)', [amount, gradeId]);

      await logActivity(userId, 'UPDATE', 'fees', `تحديث قسط الصف (ID: ${gradeId}) إلى ${amount} ${currency}`);
    }
    await executescript('COMMIT');
    return { ok: true };
  } catch (error) {
    await executescript('ROLLBACK');
    throw error;
  }
}

async function getFees(academicYear = null) {
  const yearFilter = academicYear ? ` AND (s.academic_year = ? OR s.academic_year IS NULL)
    AND fr.id = (
    SELECT candidate.id
    FROM fee_records candidate
    WHERE candidate.student_id = fr.student_id
      AND COALESCE(candidate.is_deleted, 0) = 0
      AND (candidate.academic_year = ? OR candidate.academic_year IS NULL)
    ORDER BY CASE WHEN candidate.academic_year = ? THEN 0 ELSE 1 END, candidate.id DESC
    LIMIT 1
  )` : '';
  const feeRecords = await all(`
    SELECT fr.*, s.full_name, s.grade, s.division, s.phone, g.currency
    FROM fee_records fr
    LEFT JOIN students s ON s.id = fr.student_id
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE COALESCE(fr.is_deleted, 0) = 0${yearFilter}
    ORDER BY fr.id DESC
  `, academicYear ? [academicYear, academicYear, academicYear] : []);
  if (!feeRecords.length) return [];

  const recordIds = feeRecords.map((record) => record.id);
  const placeholders = recordIds.map(() => '?').join(',');
  const payments = await all(
      `SELECT fp.*, u.full_name AS received_by
       FROM fee_payments fp
       LEFT JOIN users u ON u.id = fp.created_by
       WHERE fp.fee_record_id IN (${placeholders}) AND COALESCE(fp.is_deleted, 0) = 0
         ${academicYear ? 'AND (academic_year = ? OR academic_year IS NULL)' : ''}
       ORDER BY fp.payment_date DESC, fp.id DESC`,
      academicYear ? [...recordIds, academicYear] : recordIds,
    );
  const paymentsByRecord = new Map();
  for (const payment of payments) {
    const recordPayments = paymentsByRecord.get(payment.fee_record_id) || [];
    recordPayments.push(mapPaymentRow(payment));
    paymentsByRecord.set(payment.fee_record_id, recordPayments);
  }
  return feeRecords.map((feeRecord) => {
    const recordPayments = paymentsByRecord.get(feeRecord.id) || [];
    const totalPaid = roundMoney(recordPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    const total = Number(feeRecord.total_fee || 0);
    const paid = totalPaid;
    const remaining = roundMoney(Math.max(0, total - paid));

    return {
      id: feeRecord.id,
      studentId: feeRecord.student_id,
      studentName: feeRecord.full_name || 'غير محدد',
      grade: feeRecord.grade || 'غير محدد',
      division: feeRecord.division || 'غير محدد',
      phone: feeRecord.phone || '',
      total,
      paid,
      remaining,
      status: remaining === 0 ? 'مكتمل' : 'متبقي',
      currency: feeRecord.currency || 'عراقي',
      payments: recordPayments,
    };
  });
}

async function getTuitionExpenses(academicYear) {
  return all(
    `SELECT id, title, category, amount, currency, expense_date, payment_method, note, created_by
     FROM tuition_expenses WHERE academic_year = ? ORDER BY expense_date DESC, id DESC`,
    [academicYear],
  );
}

async function createTuitionExpense(payload, userId, academicYear) {
  const title = String(payload?.title || '').trim();
  const category = String(payload?.category || '').trim();
  const amount = roundMoney(Number(payload?.amount));
  const currency = payload?.currency === 'دولار' ? 'دولار' : 'عراقي';
  const expenseDate = String(payload?.date || '');
  const paymentMethod = String(payload?.paymentMethod || '').trim();

  if (!title || !category || !academicYear || !paymentMethod
      || !Number.isFinite(amount) || amount <= 0
      || !isValidIsoDate(expenseDate)) {
    return { ok: false, message: 'يرجى استكمال بيانات المصروف والتحقق من المبلغ والتاريخ.' };
  }

  const result = await run(
    `INSERT INTO tuition_expenses
      (title, category, amount, currency, expense_date, payment_method, note, academic_year, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, category, amount, currency, expenseDate, paymentMethod, String(payload.note || '').trim(), academicYear, userId],
  );
  await logActivity(userId, 'INSERT', 'fees', `تسجيل مصروف أقساط: ${title} بقيمة ${amount} ${currency}`);
  return { ok: true, id: result.id };
}

async function getFinalResults(academicYear = null) {
  const yearFilter = academicYear ? ` AND s.academic_year = '${academicYear}'` : '';
  const query = `
    SELECT
      s.id as student_id, s.full_name, s.grade_id, s.division_id, s.status as student_status, s.phone as guardian_phone,
      g.name as grade_name, g.level as grade_level,
      e.subject as subject_name, e.exam_date, e.course as exam_course, er.score, e.total_score
    FROM students s
    JOIN grades g ON s.grade_id = g.id
    LEFT JOIN exams e ON e.grade_id = s.grade_id AND e.division_id = s.division_id AND e.is_deleted = 0
    LEFT JOIN exam_results er ON er.exam_id = e.id AND er.student_id = s.id
    WHERE s.is_deleted = 0${yearFilter}
    ORDER BY s.id, e.course, e.subject
  `;
  const rows = await all(query);
  const students = {};
  rows.forEach(row => {
    if (!students[row.student_id]) {
      students[row.student_id] = {
        id: row.student_id,
        fullName: row.full_name,
        gradeId: row.grade_id,
        divisionId: row.division_id,
        studentStatus: row.student_status,
        guardianPhone: row.guardian_phone,
        gradeName: row.grade_name,
        gradeLevel: row.grade_level,
        subjects: []
      };
    }
    if (row.subject_name) {
      students[row.student_id].subjects.push({
        name: row.subject_name,
        date: row.exam_date,
        course: row.exam_course || 'الكورس الأول',
        score: (row.score !== null && row.score !== undefined) ? Number(row.score) : null,
        total: row.total_score || 100
      });
    }
  });
  return Object.values(students);
}

async function promoteStudents(studentIds, userId, currentYear) {
  await executescript('BEGIN TRANSACTION');
  try {
    const parts = currentYear.split('-');
    const nextYear = `${Number(parts[0]) + 1}-${Number(parts[1]) + 1}`;

    // Ensure next year exists in academic_years table
    await run('INSERT OR IGNORE INTO academic_years (year_name, is_current) VALUES (?, ?)', [nextYear, 0]);

    const allGrades = await all('SELECT * FROM grades WHERE is_deleted = 0');
    const sortedGrades = allGrades.sort((a, b) => {
        const gradeOrder = { 'اول': 1, 'ثاني': 2, 'ثالث': 3, 'رابع': 4, 'خامس': 5, 'سادس': 6, 'سابع': 7, 'ثامن': 8, 'تاسع': 9, 'عاشر': 10, 'حادي عشر': 11, 'ثاني عشر': 12 };
        const getW = (n) => { let c = n.replace('الصف', '').trim(); if(c.startsWith('ال')) c = c.substring(2); c = c.replace(/[أإآ]/g, 'ا'); return gradeOrder[c] || 999; };
        return getW(a.name) - getW(b.name);
    });

    for (const id of studentIds) {
      const student = await get('SELECT * FROM students WHERE id = ?', [id]);
      if (!student) continue;

      const currentIdx = sortedGrades.findIndex(g => g.id === student.grade_id);

      // Case 1: Student is in Grade 6 (or the last grade in the list)
      if (currentIdx === -1 || currentIdx === sortedGrades.length - 1) {
        // Mark as Graduate in current year record
        await run('UPDATE students SET status = ? WHERE id = ?', ['خريج', id]);
        await logActivity(userId, 'UPDATE', 'students', `تخرج الطالب ${student.full_name} من المدرسة (الصف السادس)`);
      }
      // Case 2: Student is in a lower grade (1-5)
      else {
        const nextGrade = sortedGrades[currentIdx + 1];

        // Mark current record as 'ناجح ومرحل'
        await run('UPDATE students SET status = ? WHERE id = ?', ['ناجح ومرحل', id]);

        // Check if student already promoted to next year to avoid duplicates
        const exists = await get('SELECT id FROM students WHERE full_name = ? AND academic_year = ?', [student.full_name, nextYear]);

        if (!exists) {
          // Find the matching division in the next grade.
          // Search for a division with the same name in the next grade.
          const nextDiv = await get('SELECT id FROM divisions WHERE name = ? AND grade_id = ? AND is_deleted = 0', [student.division, nextGrade.id]);

          await run(`
            INSERT INTO students (
              full_name, gender, birth_date, grade, grade_id,
              division, division_id, phone, address,
              status, academic_year, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            student.full_name, student.gender, student.birth_date, nextGrade.name, nextGrade.id,
            student.division, nextDiv ? nextDiv.id : null,
            student.phone, student.address,
            'نشط', nextYear, userId
          ]);

          await logActivity(userId, 'UPDATE', 'students', `ترحيل الطالب ${student.full_name} من ${student.grade} إلى ${nextGrade.name} للعام ${nextYear}`);
        }
      }
    }
    await executescript('COMMIT');
    return { ok: true, nextYear };
  } catch (error) {
    await executescript('ROLLBACK');
    console.error('Promotion failed:', error);
    throw error;
  }
}

async function getExpenses() { return all('SELECT * FROM expenses WHERE is_deleted = 0 ORDER BY expense_date DESC, id DESC'); }
async function createExpense(payload, userId, academicYear) {
  const row = await run('INSERT INTO expenses (title, category, description, amount, status, expense_date, created_by, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [payload.title, payload.category || 'مشتريات', payload.description || '', payload.amount || 0, 'تم الصرف', payload.date || new Date().toISOString().slice(0, 10), userId, academicYear]);
  const newExp = { id: row.id, ...payload, status: 'تم الصرف', academic_year: academicYear };
  await logActivity(userId, 'INSERT', 'expenses', `تسجيل صرفية مباشرة: ${payload.title} بقيمة ${payload.amount}`, null, newExp);
  return newExp;
}
async function updateExpenseStatus(id, status, userId) {
  const exp = await get('SELECT title FROM expenses WHERE id = ?', [id]);
  await run('UPDATE expenses SET status = ? WHERE id = ?', [status, id]);
  await logActivity(userId, 'UPDATE', 'expenses', `تغيير حالة الصرفية "${exp?.title}" إلى: ${status}`);
  return { ok: true };
}

async function getSchedule() { return all('SELECT s.*, t.full_name as teacher_name FROM schedule s LEFT JOIN teachers t ON s.teacher_id = t.id'); }
async function saveFullSchedule(divisionId, cells, userId, academicYear) {
  for (const cell of cells) {
    if (cell.teacherId) {
      const conflict = await get(`
        SELECT s.*, d.name as division_name, g.name as grade_name
        FROM schedule s
        JOIN divisions d ON s.division_id = d.id
        JOIN grades g ON d.grade_id = g.id
        WHERE s.division_id != ?
          AND s.day_name = ?
          AND s.period_number = ?
          AND s.teacher_id = ?
          AND s.academic_year = ?
      `, [divisionId, cell.dayName, cell.periodNumber, cell.teacherId, academicYear]);

      if (conflict) {
        return {
          error: 'CONFLICT',
          message: `تضارب: المعلم مشغول في يوم ${cell.dayName} الحصة ${cell.periodNumber} في صف ${conflict.grade_name} - شعبة ${conflict.division_name}`
        };
      }
    }
  }

  await executescript('BEGIN TRANSACTION');
  try {
    const div = await get('SELECT name FROM divisions WHERE id = ?', [divisionId]);
    for (const cell of cells) {
      await run('INSERT INTO schedule (division_id, day_name, period_number, subject_name, teacher_id, academic_year) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(division_id, day_name, period_number) DO UPDATE SET subject_name = excluded.subject_name, teacher_id = excluded.teacher_id', [divisionId, cell.dayName, cell.periodNumber, cell.subjectName, cell.teacherId, academicYear]);
    }
    await logActivity(userId, 'UPDATE', 'schedule', `تحديث الجدول الدراسي للشعبة: ${div?.name}`);
    await executescript('COMMIT');
    return { ok: true };
  } catch (error) { await executescript('ROLLBACK'); throw error; }
}

function createBackup(destinationPath = null) {
  initPaths();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = destinationPath || path.join(DATA_DIR, 'backups', `backup-${timestamp}.db`);
  fs.copyFileSync(DB_PATH, backupPath);
  return { ok: true, path: backupPath, timestamp: formatBackupTimestamp(new Date()) };
}

function restoreBackup(sourcePath) {
  initPaths();
  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error('Backup file was not found.');
  fs.copyFileSync(sourcePath, DB_PATH);
  return { ok: true, restoredFrom: sourcePath };
}

function getLatestBackupInfo() {
  initPaths();
  const bPath = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(bPath)) return null;
  const files = fs.readdirSync(bPath).filter((file) => /\.db$/i.test(file)).map((file) => {
      const fullPath = path.join(bPath, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    }).sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (files.length === 0) return null;
  const latest = files[0];
  return { path: latest.fullPath, timestamp: formatBackupTimestamp(new Date(latest.mtimeMs)) };
}

async function listAttendanceForDate(date) { return (await all('SELECT * FROM attendance_records WHERE attendance_date = ? ORDER BY id DESC', [date])).map(mapAttendanceRow); }

async function getEnrichedAttendance(date) {
  console.log('Fetching enriched attendance for date:', date);
  const query = `
    SELECT
      ar.*,
      s.full_name as student_name,
      s.phone as guardian_phone,
      g.name as grade_name,
      d.name as division_name
    FROM attendance_records ar
    LEFT JOIN students s ON ar.student_id = s.id
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN divisions d ON s.division_id = d.id
    WHERE ar.attendance_date = ?
    ORDER BY g.id, d.id, s.full_name
  `;
  const rows = await all(query, [date]);
  console.log(`Found ${rows.length} attendance records for ${date}`);
  return rows;
}

async function createExam(payload, userId, academicYear) {
  const course = payload.course || 'الكورس الأول';
  const duplicate = await get(
    'SELECT id FROM exams WHERE is_deleted = 0 AND academic_year = ? AND division_id = ? AND subject = ? AND course = ? LIMIT 1',
    [academicYear, payload.divisionId, payload.subject, course],
  );
  if (duplicate) {
    throw new Error(`تم إدخال امتحان مادة ${payload.subject} في ${course} لهذه الشعبة مسبقاً.`);
  }

  const row = await run('INSERT INTO exams (name, subject, grade_id, division_id, exam_date, total_score, course, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [payload.name, payload.subject, payload.gradeId, payload.divisionId, payload.examDate, payload.totalScore, course, academicYear]);
  const newExam = { id: row.id, ...payload, academic_year: academicYear };
  await logActivity(userId, 'INSERT', 'exams', `إضافة امتحان جديد: ${payload.name} (${payload.subject}) - ${payload.course}`, null, newExam);
  return newExam;
}

async function updateExam(id, payload, userId) {
  const oldVal = await get('SELECT * FROM exams WHERE id = ?', [id]);
  const course = payload.course || 'الكورس الأول';
  const duplicate = oldVal ? await get(
    'SELECT id FROM exams WHERE is_deleted = 0 AND academic_year = ? AND division_id = ? AND subject = ? AND course = ? AND id != ? LIMIT 1',
    [oldVal.academic_year, payload.divisionId, payload.subject, course, id],
  ) : null;
  if (duplicate) {
    throw new Error(`تم إدخال امتحان مادة ${payload.subject} في ${course} لهذه الشعبة مسبقاً.`);
  }

  await run('UPDATE exams SET name = ?, subject = ?, grade_id = ?, division_id = ?, exam_date = ?, total_score = ?, course = ? WHERE id = ?',
    [payload.name, payload.subject, payload.gradeId, payload.divisionId, payload.examDate, payload.totalScore, course, id]);
  await logActivity(userId, 'UPDATE', 'exams', `تعديل بيانات الامتحان: ${payload.name}`, oldVal, payload);
  return { id, ...payload };
}

async function deleteExam(id, userId) {
  const exam = await get('SELECT name FROM exams WHERE id = ?', [id]);
  await run('UPDATE exams SET is_deleted = 1 WHERE id = ?', [id]);
  await logActivity(userId, 'DELETE', 'exams', `حذف الامتحان: ${exam?.name}`);
  return true;
}

async function saveExamResults(examId, rows, userId, academicYear) {
  await run('DELETE FROM exam_results WHERE exam_id = ?', [examId]);
  for (const row of rows) {
    if (row.studentId != null && row.score != null && row.score !== '') {
      await run(
        'INSERT INTO exam_results (exam_id, student_id, score, academic_year, modified_by) VALUES (?, ?, ?, ?, ?)',
        [examId, row.studentId, Number(row.score), academicYear, userId],
      );
    }
  }
  const exam = await get('SELECT name FROM exams WHERE id = ?', [examId]);
  await logActivity(userId, 'UPDATE', 'exams', `إدخال درجات الامتحان: ${exam?.name} لـ ${rows.length} طالب`);
  return true;
}

async function getExamResults(examId) {
  return all(
    `SELECT er.student_id, er.score, er.modified_by, u.full_name AS edited_by
     FROM exam_results er
     LEFT JOIN users u ON u.id = er.modified_by
     WHERE er.exam_id = ?`,
    [examId],
  );
}

async function getExamsStats(academicYear = null) {
  const yearFilter = academicYear ? ` AND e.academic_year = '${academicYear}'` : '';
  const query = `
    SELECT
      e.id as exam_id,
      SUM(CASE WHEN er.score >= (e.total_score / 2.0) THEN 1 ELSE 0 END) as passed_count,
      SUM(CASE WHEN er.score < (e.total_score / 2.0) AND er.score IS NOT NULL THEN 1 ELSE 0 END) as failed_count
    FROM exams e
    LEFT JOIN exam_results er ON e.id = er.exam_id
    WHERE e.is_deleted = 0${yearFilter}
    GROUP BY e.id
  `;
  return all(query);
}

function mapStudentRow(row) { return { id: row.id, fullName: row.full_name, gender: row.gender, dob: row.birth_date, grade: row.grade, gradeId: row.grade_id, division: row.division, divisionId: row.division_id, phone: row.phone, address: row.address, status: row.status }; }
function mapTeacherRow(row) { return { id: row.id, fullName: row.full_name, gender: row.gender, specialty: row.specialty, subject: row.subject, phone: row.phone, address: row.address, status: row.status }; }
function mapGradeRow(row) { return { id: row.id, name: row.name, level: row.level, annual_fee: row.annual_fee, currency: row.currency || 'عراقي' }; }
function mapDivisionRow(row) { return { id: row.id, name: row.name, gradeId: row.grade_id, capacity: row.capacity }; }
function mapExamRow(row) { return { id: row.id, name: row.name, subject: row.subject, gradeId: row.grade_id, divisionId: row.division_id, examDate: row.exam_date, totalScore: row.total_score, course: row.course || 'الكورس الأول' }; }
function mapAttendanceRow(row) { return { id: row.id, studentId: row.student_id, date: row.attendance_date, status: row.status, note: row.note }; }
function mapPaymentRow(row) {
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    date: row.payment_date,
    method: row.method,
    note: row.note,
    receivedBy: row.received_by || '',
  };
}

module.exports = {
  initializeDatabase, getAppData, login, validateUserSession, requestPasswordRecovery, verifyPasswordRecoveryCode, resetAdministratorPassword, isActiveAdmin, getLogs, getAcademicYears, getUsers, createUser, deleteUser, setUserActive, updateUserPassword, updateOwnUsername,
  createStudent, updateStudent, deleteStudent, createTeacher, updateTeacher, deleteTeacher,
  createGrade, updateGrade, deleteGrade, createDivision, updateDivision, deleteDivision,
  saveAttendanceRecords, listAttendanceForDate, getEnrichedAttendance, saveExamResults, getExamResults, getExamsStats, createExam, updateExam, deleteExam, createFeePayment, updateGradeFee, applyGradeFeeToAll, getFees,
  getTuitionExpenses, createTuitionExpense,
  getFinalResults, promoteStudents, getExpenses, createExpense, updateExpenseStatus,
  getSchedule, saveFullSchedule, createBackup, restoreBackup, getLatestBackupInfo,
  addAcademicYear, setCurrentAcademicYear, getSchoolSettings, saveSchoolSettings, updateGradeFeesBulk
};
