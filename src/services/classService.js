export const initialGrades = [
  { id: 1, name: 'الأول', level: 'ابتدائي' },
  { id: 2, name: 'الثاني', level: 'ابتدائي' },
  { id: 3, name: 'السابع', level: 'متوسط' },
];

export const initialDivisions = [
  { id: 1, name: 'أ', gradeId: 1 },
  { id: 2, name: 'ب', gradeId: 1 },
  { id: 3, name: 'أ', gradeId: 3 },
];

export const gradeLevels = ['ابتدائي', 'متوسط', 'ثانوي'];

export function createGradeId(grades) {
  return grades.length > 0 ? Math.max(...grades.map((grade) => grade.id)) + 1 : 1;
}

export function createDivisionId(divisions) {
  return divisions.length > 0 ? Math.max(...divisions.map((division) => division.id)) + 1 : 1;
}
