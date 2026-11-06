const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const BASE_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(BASE_DIR, 'data', 'school.db');
const SCHEMA_PATH = path.join(BASE_DIR, 'data', 'schema.sql');
const BACKUP_DIR = path.join(BASE_DIR, 'data', 'backups');

let connection = null;

function getConnection() {
  if (!connection) {
    connection = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
      if (error) {
        console.error('Failed to open database', error);
      }
    });
  }

  return connection;
}

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    getConnection().run(query, params, function (error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function executescript(query) {
  return new Promise((resolve, reject) => {
    getConnection().exec(query, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ ok: true });
    });
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    getConnection().all(query, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows || []);
    });
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    getConnection().get(query, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row || null);
    });
  });
}

function formatBackupTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ensureBackupDirectory() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function ensureAuthTables() {
  await executescript(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      approval_status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      full_name TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(school_id, username),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );
  `);

  const schoolColumns = await all('PRAGMA table_info(schools)');
  if (!schoolColumns.some((column) => column.name === 'approval_status')) {
    await run("ALTER TABLE schools ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'");
  }
}

async function ensureOwnerAccount() {
  const schoolName = 'إدارة التطبيق';
  let school = await get('SELECT id FROM schools WHERE name = ? LIMIT 1', [schoolName]);

  if (!school) {
    const result = await run('INSERT INTO schools (name) VALUES (?)', [schoolName]);
    school = { id: result.id };
  }

  const owner = await get('SELECT id FROM users WHERE school_id = ? AND username = ?', [school.id, 'admin']);
  if (owner) {
    await run("UPDATE users SET password = ?, role = 'super_admin', full_name = ? WHERE id = ?", ['admin123', 'مالك التطبيق', owner.id]);
    return;
  }

  await run(
    'INSERT INTO users (school_id, username, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
    [school.id, 'admin', 'admin123', 'super_admin', 'مالك التطبيق'],
  );
}

async function initializeDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await executescript(schema);
  await ensureAuthTables();
  await ensureOwnerAccount();

  const studentCount = await get('SELECT COUNT(*) AS count FROM students');
  if (studentCount.count === 0) {
    await seedInitialData();
  }

  return { ok: true, path: DB_PATH };
}

async function createSchool(payload = {}, requiresApproval = false) {
  const schoolName = String(payload.schoolName || '').trim();
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');

  if (!schoolName || !username || !password || !confirmPassword) {
    return { ok: false, message: 'يجب ملء جميع الحقول المطلوبة.' };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: 'كلمات المرور غير متطابقة.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' };
  }

  if (username.length < 3) {
    return { ok: false, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.' };
  }

  const existingSchool = await get('SELECT id FROM schools WHERE name = ? LIMIT 1', [schoolName]);
  if (existingSchool) {
    return { ok: false, message: 'اسم المدرسة مسجل بالفعل.' };
  }

  const existingUser = await get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
  if (existingUser) {
    return { ok: false, message: 'اسم المستخدم موجود بالفعل.' };
  }

  const approvalStatus = requiresApproval ? 'pending' : 'approved';
  const schoolResult = await run('INSERT INTO schools (name, approval_status) VALUES (?, ?)', [schoolName, approvalStatus]);
  await run('INSERT INTO users (school_id, username, password, role, full_name) VALUES (?, ?, ?, ?, ?)', [schoolResult.id, username, password, 'admin', username]);

  return {
    ok: true,
    school: {
      id: schoolResult.id,
      name: schoolName,
      username,
      approvalStatus,
    },
    message: 'تم إنشاء المدرسة بنجاح.',
  };
}

async function login(username, password, schoolName = null) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '');
  const cleanSchoolName = String(schoolName || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  let query = `
    SELECT u.*, s.name AS school_name, s.approval_status
    FROM users u
    INNER JOIN schools s ON s.id = u.school_id
    WHERE LOWER(u.username) = LOWER(?) AND u.password = ?
  `;
  const params = [cleanUsername, cleanPassword];

  if (cleanSchoolName) {
    query += ' AND LOWER(s.name) = LOWER(?)';
    params.push(cleanSchoolName);
  }

  query += " ORDER BY CASE WHEN u.role = 'super_admin' THEN 0 ELSE 1 END";
  const userRow = await get(`${query} LIMIT 1`, params);

  if (!userRow) {
    return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  if (userRow.approval_status === 'pending') {
    return { ok: false, code: 'PENDING_APPROVAL', message: 'طلب المدرسة بانتظار موافقة مالك التطبيق.' };
  }

  if (userRow.approval_status === 'rejected') {
    return { ok: false, code: 'SCHOOL_REJECTED', message: 'لم تتم الموافقة على طلب المدرسة. يرجى التواصل مع مالك التطبيق.' };
  }

  return {
    ok: true,
    user: {
      id: userRow.id,
      schoolId: userRow.school_id,
      schoolName: userRow.school_name,
      username: userRow.username,
      role: userRow.role,
      full_name: userRow.full_name,
    },
    message: 'تم تسجيل الدخول بنجاح.',
  };
}

async function getPendingSchools() {
  return all(`
    SELECT s.id, s.name, s.created_at, u.username
    FROM schools s
    LEFT JOIN users u ON u.school_id = s.id AND u.role != 'super_admin'
    WHERE s.approval_status = 'pending'
    ORDER BY s.created_at ASC, s.id ASC
  `);
}

async function setSchoolApproval(schoolId, approvalStatus) {
  if (!['approved', 'rejected'].includes(approvalStatus)) {
    return { ok: false, message: 'حالة الاعتماد غير صالحة.' };
  }

  const result = await run('UPDATE schools SET approval_status = ? WHERE id = ? AND approval_status = ?', [approvalStatus, Number(schoolId), 'pending']);
  if (result.changes === 0) {
    return { ok: false, message: 'المدرسة غير موجودة أو تمت مراجعة طلبها مسبقًا.' };
  }

  return { ok: true };
}

async function seedInitialData() {
  const grades = [
    { name: 'السابع', level: 'ابتدائي' },
    { name: 'الثامن', level: 'ابتدائي' },
  ];

  for (const grade of grades) {
    const insertedGrade = await run('INSERT INTO grades (name, level) VALUES (?, ?)', [grade.name, grade.level]);

    const divisionNames = ['أ', 'ب'];
    for (const divisionName of divisionNames) {
      await run('INSERT INTO divisions (name, grade_id) VALUES (?, ?)', [divisionName, insertedGrade.id]);
    }
  }

  const students = [
    {
      fullName: 'أحمد محمد علي',
      gender: 'ذكر',
      dob: '2014-05-10',
      grade: 'السابع',
      gradeId: 1,
      division: 'أ',
      divisionId: 1,
      phone: '0501234567',
      guardianName: 'محمد علي',
      address: 'الرياض',
      status: 'نشط',
    },
    {
      fullName: 'سارة خالد سالم',
      gender: 'أنثى',
      dob: '2013-09-22',
      grade: 'الثامن',
      gradeId: 2,
      division: 'ب',
      divisionId: 2,
      phone: '0507654321',
      guardianName: 'خالد سالم',
      address: 'جدة',
      status: 'نشط',
    },
  ];

  for (const student of students) {
    await run(
      'INSERT INTO students (full_name, gender, birth_date, grade, grade_id, division, division_id, phone, guardian_name, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student.fullName, student.gender, student.dob, student.grade, student.gradeId, student.division, student.divisionId, student.phone, student.guardianName, student.address, student.status],
    );
  }

  const teachers = [
    {
      fullName: 'سعيد بن خالد',
      gender: 'ذكر',
      specialty: 'رياضيات',
      subject: 'الرياضيات',
      phone: '0550011222',
      email: 'saeed@example.com',
      address: 'الدمام',
      status: 'نشط',
    },
  ];

  for (const teacher of teachers) {
    await run('INSERT INTO teachers (full_name, gender, specialty, subject, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [teacher.fullName, teacher.gender, teacher.specialty, teacher.subject, teacher.phone, teacher.email, teacher.address, teacher.status]);
  }

  const exams = [
    { name: 'اختبار أول', subject: 'الرياضيات', gradeId: 1, divisionId: 1, examDate: '2026-07-15', totalScore: 100 },
  ];

  for (const exam of exams) {
    await run('INSERT INTO exams (name, subject, grade_id, division_id, exam_date, total_score) VALUES (?, ?, ?, ?, ?, ?)', [exam.name, exam.subject, exam.gradeId, exam.divisionId, exam.examDate, exam.totalScore]);
  }

  await run('INSERT INTO fee_records (student_id, total_fee) VALUES (?, ?)', [1, 18000]);
  await run('INSERT INTO fee_records (student_id, total_fee) VALUES (?, ?)', [2, 15000]);
}

async function getAppData() {
  const [students, teachers, grades, divisions, exams, attendance, fees, certificates] = await Promise.all([
    all('SELECT * FROM students ORDER BY id DESC'),
    all('SELECT * FROM teachers ORDER BY id DESC'),
    all('SELECT * FROM grades ORDER BY id DESC'),
    all('SELECT * FROM divisions ORDER BY id DESC'),
    all('SELECT * FROM exams ORDER BY id DESC'),
    all('SELECT * FROM attendance_records ORDER BY attendance_date DESC, id DESC'),
    getFees(),
    all('SELECT * FROM certificates ORDER BY id DESC'),
  ]);

  return {
    students: students.map(mapStudentRow),
    teachers: teachers.map(mapTeacherRow),
    grades: grades.map(mapGradeRow),
    divisions: divisions.map(mapDivisionRow),
    exams: exams.map(mapExamRow),
    attendance: attendance.map(mapAttendanceRow),
    fees,
    certificates,
  };
}

async function listAttendanceForDate(date) {
  return (await all('SELECT * FROM attendance_records WHERE attendance_date = ? ORDER BY id DESC', [date])).map(mapAttendanceRow);
}

async function saveAttendanceRecords(date, records) {
  await run('DELETE FROM attendance_records WHERE attendance_date = ?', [date]);
  for (const record of records) {
    await run('INSERT INTO attendance_records (student_id, attendance_date, status, note) VALUES (?, ?, ?, ?)', [record.studentId, date, record.status, record.note || '']);
  }
  return true;
}

async function createStudent(payload) {
  const row = await run(
    'INSERT INTO students (full_name, gender, birth_date, grade, grade_id, division, division_id, phone, guardian_name, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [payload.fullName, payload.gender || 'ذكر', payload.dob || '', payload.grade || '', payload.gradeId || null, payload.division || '', payload.divisionId || null, payload.phone || '', payload.guardianName || '', payload.address || '', payload.status || 'نشط'],
  );
  return { id: row.id, ...payload };
}

async function updateStudent(id, payload) {
  await run(
    'UPDATE students SET full_name = ?, gender = ?, birth_date = ?, grade = ?, grade_id = ?, division = ?, division_id = ?, phone = ?, guardian_name = ?, address = ?, status = ? WHERE id = ?',
    [payload.fullName, payload.gender || 'ذكر', payload.dob || '', payload.grade || '', payload.gradeId || null, payload.division || '', payload.divisionId || null, payload.phone || '', payload.guardianName || '', payload.address || '', payload.status || 'نشط', id],
  );
  return { id, ...payload };
}

async function deleteStudent(id) {
  await run('DELETE FROM attendance_records WHERE student_id = ?', [id]);
  await run('DELETE FROM fee_payments WHERE fee_record_id IN (SELECT id FROM fee_records WHERE student_id = ?)', [id]);
  await run('DELETE FROM fee_records WHERE student_id = ?', [id]);
  await run('DELETE FROM certificates WHERE student_id = ?', [id]);
  await run('DELETE FROM students WHERE id = ?', [id]);
  return true;
}

async function createTeacher(payload) {
  const row = await run('INSERT INTO teachers (full_name, gender, specialty, subject, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [payload.fullName, payload.gender || 'ذكر', payload.specialty || '', payload.subject || '', payload.phone || '', payload.email || '', payload.address || '', payload.status || 'نشط']);
  return { id: row.id, ...payload };
}

async function updateTeacher(id, payload) {
  await run('UPDATE teachers SET full_name = ?, gender = ?, specialty = ?, subject = ?, phone = ?, email = ?, address = ?, status = ? WHERE id = ?', [payload.fullName, payload.gender || 'ذكر', payload.specialty || '', payload.subject || '', payload.phone || '', payload.email || '', payload.address || '', payload.status || 'نشط', id]);
  return { id, ...payload };
}

async function deleteTeacher(id) {
  await run('DELETE FROM teachers WHERE id = ?', [id]);
  return true;
}

async function createGrade(payload) {
  const row = await run('INSERT INTO grades (name, level) VALUES (?, ?)', [payload.name, payload.level || 'ابتدائي']);
  return { id: row.id, ...payload };
}

async function updateGrade(id, payload) {
  await run('UPDATE grades SET name = ?, level = ? WHERE id = ?', [payload.name, payload.level || 'ابتدائي', id]);
  return { id, ...payload };
}

async function deleteGrade(id) {
  await run('DELETE FROM divisions WHERE grade_id = ?', [id]);
  await run('DELETE FROM grades WHERE id = ?', [id]);
  return true;
}

async function createDivision(payload) {
  const row = await run('INSERT INTO divisions (name, grade_id, capacity) VALUES (?, ?, ?)', [payload.name, payload.gradeId, payload.capacity || 0]);
  return { id: row.id, ...payload };
}

async function updateDivision(id, payload) {
  await run('UPDATE divisions SET name = ?, grade_id = ?, capacity = ? WHERE id = ?', [payload.name, payload.gradeId, payload.capacity || 0, id]);
  return { id, ...payload };
}

async function deleteDivision(id) {
  await run('DELETE FROM divisions WHERE id = ?', [id]);
  return true;
}

async function createExam(payload) {
  const row = await run('INSERT INTO exams (name, subject, grade_id, division_id, exam_date, total_score) VALUES (?, ?, ?, ?, ?, ?)', [payload.name, payload.subject || '', payload.gradeId, payload.divisionId, payload.examDate || '', payload.totalScore || 100]);
  return { id: row.id, ...payload };
}

async function updateExam(id, payload) {
  await run('UPDATE exams SET name = ?, subject = ?, grade_id = ?, division_id = ?, exam_date = ?, total_score = ? WHERE id = ?', [payload.name, payload.subject || '', payload.gradeId, payload.divisionId, payload.examDate || '', payload.totalScore || 100, id]);
  return { id, ...payload };
}

async function deleteExam(id) {
  await run('DELETE FROM exam_results WHERE exam_id = ?', [id]);
  await run('DELETE FROM exams WHERE id = ?', [id]);
  return true;
}

async function saveExamResults(examId, rows) {
  await run('DELETE FROM exam_results WHERE exam_id = ?', [examId]);
  for (const row of rows) {
    if (row.studentId != null && row.score != null && row.score !== '') {
      await run('INSERT INTO exam_results (exam_id, student_id, score) VALUES (?, ?, ?)', [examId, row.studentId, Number(row.score)]);
    }
  }
  return true;
}

async function createFeePayment(studentId, payload) {
  let feeRecord = await get('SELECT id FROM fee_records WHERE student_id = ?', [studentId]);
  if (!feeRecord) {
    feeRecord = await run('INSERT INTO fee_records (student_id, total_fee) VALUES (?, ?)', [studentId, payload.totalFee || 15000]);
    feeRecord = { id: feeRecord.id };
  }

  const paymentRow = await run('INSERT INTO fee_payments (fee_record_id, amount, payment_date, method, note) VALUES (?, ?, ?, ?, ?)', [feeRecord.id, payload.amount, payload.date || new Date().toISOString().slice(0, 10), payload.method || 'نقدي', payload.note || '']);
  return { id: paymentRow.id, feeRecordId: feeRecord.id, ...payload };
}

async function getFees() {
  const feeRecords = await all('SELECT * FROM fee_records ORDER BY id DESC');
  const results = [];
  for (const feeRecord of feeRecords) {
    const payments = await all('SELECT * FROM fee_payments WHERE fee_record_id = ? ORDER BY id DESC', [feeRecord.id]);
    const student = await get('SELECT full_name, grade, division FROM students WHERE id = ?', [feeRecord.student_id]);
    const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remaining = Math.max(0, Number(feeRecord.total_fee || 0) - paid);
    results.push({
      id: feeRecord.id,
      studentId: feeRecord.student_id,
      studentName: student?.full_name || 'غير محدد',
      grade: student?.grade || 'غير محدد',
      division: student?.division || 'غير محدد',
      total: Number(feeRecord.total_fee || 0),
      paid,
      remaining,
      status: remaining === 0 ? 'مكتمل' : 'متبقي',
      payments: payments.map(mapPaymentRow),
    });
  }
  return results;
}

async function createCertificate(payload) {
  const row = await run('INSERT INTO certificates (student_id, certificate_type, issued_at, details) VALUES (?, ?, ?, ?)', [payload.studentId, payload.certificateType || 'شهادة', payload.issuedAt || new Date().toISOString().slice(0, 10), JSON.stringify(payload.details || {})]);
  return { id: row.id, ...payload };
}

function createBackup(destinationPath = null) {
  ensureBackupDirectory();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = destinationPath || path.join(BACKUP_DIR, `backup-${timestamp}.db`);
  fs.copyFileSync(DB_PATH, backupPath);

  return {
    ok: true,
    path: backupPath,
    timestamp: formatBackupTimestamp(new Date()),
  };
}

function restoreBackup(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error('Backup file was not found.');
  }

  fs.copyFileSync(sourcePath, DB_PATH);
  return {
    ok: true,
    restoredFrom: sourcePath,
  };
}

function getLatestBackupInfo() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return null;
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((file) => /\.db$/i.test(file))
    .map((file) => {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length === 0) {
    return null;
  }

  const latest = files[0];
  return {
    path: latest.fullPath,
    timestamp: formatBackupTimestamp(new Date(latest.mtimeMs)),
  };
}

function mapStudentRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    gender: row.gender,
    dob: row.birth_date,
    grade: row.grade,
    gradeId: row.grade_id,
    division: row.division,
    divisionId: row.division_id,
    phone: row.phone,
    guardianName: row.guardian_name,
    address: row.address,
    status: row.status,
  };
}

function mapTeacherRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    gender: row.gender,
    specialty: row.specialty,
    subject: row.subject,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status,
  };
}

function mapGradeRow(row) {
  return { id: row.id, name: row.name, level: row.level };
}

function mapDivisionRow(row) {
  return { id: row.id, name: row.name, gradeId: row.grade_id, capacity: row.capacity };
}

function mapExamRow(row) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    gradeId: row.grade_id,
    divisionId: row.division_id,
    examDate: row.exam_date,
    totalScore: row.total_score,
  };
}

function mapAttendanceRow(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.attendance_date,
    status: row.status,
    note: row.note,
  };
}

function mapPaymentRow(row) {
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    date: row.payment_date,
    method: row.method,
    note: row.note,
  };
}

module.exports = {
  initializeDatabase,
  createSchool,
  login,
  getAppData,
  listAttendanceForDate,
  saveAttendanceRecords,
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
  createFeePayment,
  getFees,
  createCertificate,
  createBackup,
  restoreBackup,
  getLatestBackupInfo,
};
