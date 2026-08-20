const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');

let DATA_DIR, DB_PATH;

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
    'ALTER TABLE fee_records ADD COLUMN academic_year TEXT',
    'ALTER TABLE fee_records ADD COLUMN is_deleted INTEGER DEFAULT 0',
    'ALTER TABLE fee_payments ADD COLUMN academic_year TEXT',
    'ALTER TABLE fee_payments ADD COLUMN created_by INTEGER',
    'ALTER TABLE fee_payments ADD COLUMN is_deleted INTEGER DEFAULT 0',
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

  const currentYear = await get('SELECT * FROM academic_years WHERE is_current = 1');
  if (!currentYear) await run('INSERT OR IGNORE INTO academic_years (year_name, is_current) VALUES (?, ?)', ['2026-2027', 1]);

  const adminExists = await get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) await run('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)', ['admin', 'admin123', 'admin', 'مدير النظام']);

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
  const result = await get('SELECT id, username, role, full_name FROM users WHERE username = ? AND password = ?', [username, password]);
  if (result) {
    await logActivity(result.id, 'LOGIN', 'auth', `تم تسجيل دخول المستخدم ${username}`);
    return { ok: true, user: result };
  }
  return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
}

async function getLogs() { return all('SELECT l.*, u.full_name as user_name FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 200'); }
async function getAcademicYears() { return all('SELECT * FROM academic_years ORDER BY year_name DESC'); }

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
async function getUsers() { return all('SELECT id, username, role, full_name, created_at FROM users ORDER BY id DESC'); }

async function createUser(payload, userId) {
  const row = await run('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)', [payload.username, payload.password, payload.role || 'employee', payload.fullName]);
  await logActivity(userId, 'INSERT', 'users', `إنشاء مستخدم جديد: ${payload.fullName} (${payload.role})`);
  return { id: row.id, ...payload };
}
async function deleteUser(id, userId) {
  const user = await get('SELECT username, full_name FROM users WHERE id = ?', [id]);
  if (user?.username === 'admin') return { ok: false, message: 'لا يمكن حذف الحساب الرئيسي للمدير' };
  await run('DELETE FROM users WHERE id = ?', [id]);
  await logActivity(userId, 'DELETE', 'users', `حذف المستخدم: ${user?.full_name}`);
  return { ok: true };
}

async function updateUserPassword(id, newPassword, userId) {
  const user = await get('SELECT username, full_name FROM users WHERE id = ?', [id]);
  await run('UPDATE users SET password = ? WHERE id = ?', [newPassword, id]);
  await logActivity(userId, 'UPDATE', 'users', `تغيير كلمة المرور للمستخدم: ${user?.full_name}`);
  return { ok: true };
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

async function createFeePayment(studentId, payload, userId, academicYear) {
  let feeRecord = await get('SELECT id FROM fee_records WHERE student_id = ?', [studentId]);
  if (!feeRecord) {
    const student = await get('SELECT grade_id FROM students WHERE id = ?', [studentId]);
    let defaultFee = 15000;
    if (student?.grade_id) {
      const grade = await get('SELECT annual_fee FROM grades WHERE id = ?', [student.grade_id]);
      if (grade?.annual_fee) defaultFee = grade.annual_fee;
    }
    const res = await run('INSERT INTO fee_records (student_id, total_fee, academic_year) VALUES (?, ?, ?)', [studentId, defaultFee, academicYear]);
    feeRecord = { id: res.id };
  }
  const paymentRow = await run('INSERT INTO fee_payments (fee_record_id, amount, payment_date, method, note, academic_year, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [feeRecord.id, payload.amount, payload.date || new Date().toISOString().slice(0, 10), payload.method || 'نقدي', payload.note || '', academicYear, userId]);
  await logActivity(userId, 'INSERT', 'fees', `تسجيل دفعة مالية بقيمة ${payload.amount} للطالب رقم ${studentId}`);
  return { id: paymentRow.id, feeRecordId: feeRecord.id, ...payload };
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
  const yearFilter = academicYear ? ` AND academic_year = '${academicYear}'` : '';
  const feeRecords = await all(`SELECT * FROM fee_records WHERE is_deleted = 0${yearFilter} ORDER BY id DESC`);
  const results = [];
  for (const feeRecord of feeRecords) {
    const payments = await all('SELECT * FROM fee_payments WHERE fee_record_id = ? AND is_deleted = 0 ORDER BY id DESC', [feeRecord.id]);
    const student = await get('SELECT full_name, grade, grade_id, division FROM students WHERE id = ?', [feeRecord.student_id]);
    const grade = student?.grade_id ? await get('SELECT currency FROM grades WHERE id = ?', [student.grade_id]) : null;

    const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const total = Number(feeRecord.total_fee || 0);
    results.push({
      id: feeRecord.id,
      studentId: feeRecord.student_id,
      studentName: student?.full_name || 'غير محدد',
      grade: student?.grade || 'غير محدد',
      division: student?.division || 'غير محدد',
      total,
      paid,
      remaining: Math.max(0, total - paid),
      status: (total - paid) === 0 ? 'مكتمل' : 'متبقي',
      currency: grade?.currency || 'عراقي',
      payments: payments.map(mapPaymentRow)
    });
  }
  return results;
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
  const row = await run('INSERT INTO expenses (title, category, description, amount, status, expense_date, created_by, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [payload.title, payload.category || 'مشتريات', payload.description || '', payload.amount || 0, payload.status || 'قيد الانتظار', payload.date || new Date().toISOString().slice(0, 10), userId, academicYear]);
  const newExp = { id: row.id, ...payload, academic_year: academicYear };
  await logActivity(userId, 'INSERT', 'expenses', `طلب صرفية جديدة: ${payload.title} بقيمة ${payload.amount}`, null, newExp);
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
  const row = await run('INSERT INTO exams (name, subject, grade_id, division_id, exam_date, total_score, course, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [payload.name, payload.subject, payload.gradeId, payload.divisionId, payload.examDate, payload.totalScore, payload.course || 'الكورس الأول', academicYear]);
  const newExam = { id: row.id, ...payload, academic_year: academicYear };
  await logActivity(userId, 'INSERT', 'exams', `إضافة امتحان جديد: ${payload.name} (${payload.subject}) - ${payload.course}`, null, newExam);
  return newExam;
}

async function updateExam(id, payload, userId) {
  const oldVal = await get('SELECT * FROM exams WHERE id = ?', [id]);
  await run('UPDATE exams SET name = ?, subject = ?, grade_id = ?, division_id = ?, exam_date = ?, total_score = ?, course = ? WHERE id = ?',
    [payload.name, payload.subject, payload.gradeId, payload.divisionId, payload.examDate, payload.totalScore, payload.course || 'الكورس الأول', id]);
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
      await run('INSERT INTO exam_results (exam_id, student_id, score, academic_year) VALUES (?, ?, ?, ?)', [examId, row.studentId, Number(row.score), academicYear]);
    }
  }
  const exam = await get('SELECT name FROM exams WHERE id = ?', [examId]);
  await logActivity(userId, 'UPDATE', 'exams', `إدخال درجات الامتحان: ${exam?.name} لـ ${rows.length} طالب`);
  return true;
}

async function getExamResults(examId) {
  return all('SELECT student_id, score FROM exam_results WHERE exam_id = ?', [examId]);
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
function mapPaymentRow(row) { return { id: row.id, amount: Number(row.amount || 0), date: row.payment_date, method: row.method, note: row.note }; }

module.exports = {
  initializeDatabase, getAppData, login, getLogs, getAcademicYears, getUsers, createUser, deleteUser, updateUserPassword,
  createStudent, updateStudent, deleteStudent, createTeacher, updateTeacher, deleteTeacher,
  createGrade, updateGrade, deleteGrade, createDivision, updateDivision, deleteDivision,
  saveAttendanceRecords, listAttendanceForDate, getEnrichedAttendance, saveExamResults, getExamResults, getExamsStats, createExam, updateExam, deleteExam, createFeePayment, updateGradeFee, applyGradeFeeToAll, getFees,
  getFinalResults, promoteStudents, getExpenses, createExpense, updateExpenseStatus,
  getSchedule, saveFullSchedule, createBackup, restoreBackup, getLatestBackupInfo,
  addAcademicYear, setCurrentAcademicYear, updateGradeFeesBulk
};
