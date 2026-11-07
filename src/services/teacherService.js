export const teacherSpecialties = ['رياضيات', 'علوم', 'لغة عربية', 'لغة إنجليزية', 'اجتماعيات', 'أخلاقية', 'حاسوب', 'جرائم البعث', 'لغة كردية', 'فيزياء', 'كيمياء', 'أحياء', 'تربية إسلامية'];
export const teacherSubjects = ['الرياضيات', 'العلوم', 'اللغة العربية', 'اللغة الإنجليزية', 'الاجتماعيات', 'الأخلاقية', 'الحاسوب', 'جرائم البعث', 'اللغة الكردية', 'الفيزياء', 'الكيمياء', 'الأحياء', 'التربية الإسلامية'];
export const teacherStatusOptions = ['نشط', 'إجازة', 'متقاعد'];

export const initialTeacherForm = {
  fullName: '',
  gender: 'ذكر',
  specialty: teacherSpecialties[0],
  subject: teacherSubjects[0],
  phone: '',
  address: '',
  status: 'نشط',
};

export const initialTeachers = [
  {
    id: 1,
    fullName: 'محمد عبدالله',
    gender: 'ذكر',
    specialty: 'رياضيات',
    subject: 'الرياضيات',
    phone: '0551234567',
    address: 'الرياض',
    status: 'نشط',
  },
  {
    id: 2,
    fullName: 'سلمى حسن',
    gender: 'أنثى',
    specialty: 'لغة عربية',
    subject: 'اللغة العربية',
    phone: '0557654321',
    address: 'جدة',
    status: 'إجازة',
  },
];

export function createTeacherId(teachers) {
  return teachers.length > 0 ? Math.max(...teachers.map((teacher) => teacher.id)) + 1 : 1;
}

export function buildTeacherPayload(formData, id) {
  return {
    id,
    fullName: formData.fullName.trim(),
    gender: formData.gender,
    specialty: formData.specialty,
    subject: formData.subject,
    phone: formData.phone.trim(),
    address: formData.address.trim(),
    status: formData.status,
  };
}

export function isDuplicateTeacher(teachers, formData, currentId = null) {
  const normalizedPhone = formData.phone.trim();
  const normalizedName = formData.fullName.trim().toLowerCase();

  return teachers.some((teacher) => {
    if (teacher.id === currentId) return false;

    const samePhone = teacher.phone === normalizedPhone && normalizedPhone.length > 0;
    const sameIdentity = teacher.fullName.trim().toLowerCase() === normalizedName && normalizedName.length > 0;

    return samePhone || sameIdentity;
  });
}
