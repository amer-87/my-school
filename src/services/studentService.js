export const studentStatusOptions = ['نشط', 'منقول', 'موقوف', 'متخرج'];

export function createInitialStudentForm(grades = [], divisions = []) {
  return {
    fullName: '',
    gender: 'ذكر',
    dob: '',
    grade: '',
    gradeId: '',
    division: '',
    divisionId: '',
    phone: '',
    guardianName: '',
    address: '',
    status: 'نشط',
  };
}

export const initialStudentForm = createInitialStudentForm();

export const initialStudents = [
  {
    id: 1,
    fullName: 'أحمد محمد علي',
    gender: 'ذكر',
    dob: '2014-05-10',
    grade: 'السابع',
    division: 'أ',
    phone: '0501234567',
    guardianName: 'محمد علي',
    address: 'الرياض',
    status: 'نشط',
  },
  {
    id: 2,
    fullName: 'سارة خالد سالم',
    gender: 'أنثى',
    dob: '2013-09-22',
    grade: 'الثامن',
    division: 'ب',
    phone: '0507654321',
    guardianName: 'خالد سالم',
    address: 'جدة',
    status: 'نشط',
  },
];

export function createStudentId(students) {
  return students.length > 0 ? Math.max(...students.map((student) => student.id)) + 1 : 1;
}

export function buildStudentPayload(formData, id, status = 'نشط') {
  return {
    id,
    fullName: formData.fullName.trim(),
    gender: formData.gender,
    dob: formData.dob,
    grade: formData.grade?.trim() || '',
    gradeId: formData.gradeId || null,
    division: formData.division?.trim() || '',
    divisionId: formData.divisionId || null,
    phone: formData.phone.trim(),
    guardianName: formData.guardianName.trim(),
    address: formData.address.trim(),
    status: status || formData.status || 'نشط',
  };
}

export function isDuplicateStudent(students, formData, currentId = null) {
  const normalizedPhone = formData.phone.trim();
  const normalizedName = formData.fullName.trim().toLowerCase();

  if (!normalizedPhone && !normalizedName) {
    return false;
  }

  return students.some((student) => {
    if (student.id === currentId) {
      return false;
    }

    const samePhone = student.phone === normalizedPhone && normalizedPhone.length > 0;
    const sameIdentity =
      student.fullName.trim().toLowerCase() === normalizedName &&
      normalizedName.length > 0 &&
      student.grade === (formData.grade || '').trim() &&
      student.division === (formData.division || '').trim();

    return samePhone || sameIdentity;
  });
}
