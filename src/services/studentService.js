export const studentStatusOptions = ['نشط', 'منقول', 'موقوف', 'متخرج'];

function getPhoneDigits(phone) {
  return String(phone || '')
    .replace(/[٠-٩۰-۹]/g, (digit) => {
      const codePoint = digit.codePointAt(0);
      return String(codePoint - (codePoint >= 0x06f0 ? 0x06f0 : 0x0660));
    })
    .replace(/\D/g, '');
}

export function getIraqiLocalPhone(phone) {
  let digits = getPhoneDigits(phone);
  if (digits.startsWith('00964')) digits = digits.slice(5);
  else if (digits.startsWith('964')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function getIraqiWhatsAppNumber(phone) {
  const localPhone = getIraqiLocalPhone(phone);
  return localPhone ? `964${localPhone}` : '';
}

export function getSchoolWhatsAppSignature(settings) {
  const signature = [];
  const schoolName = String(settings?.schoolName || '').trim();
  const whatsappPhone = getIraqiWhatsAppNumber(settings?.whatsappPhone);

  if (schoolName) signature.push(schoolName);
  if (whatsappPhone) signature.push(`واتساب المدرسة: +${whatsappPhone}`);

  return signature.length ? `\n\n${signature.join('\n')}` : '';
}

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
    phone: getIraqiWhatsAppNumber(formData.phone),
    address: formData.address.trim(),
    status: status || formData.status || 'نشط',
  };
}

export function isDuplicateStudent(students, formData, currentId = null) {
  const normalizedPhone = getIraqiWhatsAppNumber(formData.phone);
  const normalizedName = formData.fullName.trim().toLowerCase();

  if (!normalizedName) {
    return false;
  }

  return students.some((student) => {
    if (student.id === currentId) {
      return false;
    }

    const samePhone = normalizedPhone.length > 0 && getIraqiWhatsAppNumber(student.phone) === normalizedPhone;
    const sameName = student.fullName.trim().toLowerCase() === normalizedName;

    return samePhone || sameName;
  });
}

export function getNamePartsCount(fullName) {
  if (!fullName) return 0;
  return fullName.trim().split(/\s+/).filter(part => part.length > 0).length;
}
