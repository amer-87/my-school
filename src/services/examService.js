export const examSubjects = ['الرياضيات', 'العلوم', 'اللغة العربية', 'اللغة الإنجليزية', 'التاريخ', 'الجغرافيا', 'الفيزياء', 'الكيمياء', 'الأحياء', 'التربية الإسلامية'];

export const initialExams = [
  {
    id: 1,
    name: 'اختبار شهري',
    subject: 'الرياضيات',
    gradeId: 1,
    divisionId: 1,
    examDate: '2026-08-01',
    totalScore: 100,
  },
  {
    id: 2,
    name: 'اختبار نهائي',
    subject: 'العلوم',
    gradeId: 3,
    divisionId: 3,
    examDate: '2026-08-05',
    totalScore: 100,
  },
];

export function createExamId(exams) {
  return exams.length > 0 ? Math.max(...exams.map((exam) => exam.id)) + 1 : 1;
}
