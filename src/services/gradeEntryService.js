export const gradeEntrySubjects = ['الرياضيات', 'العلوم', 'اللغة العربية', 'اللغة الإنجليزية', 'الاجتماعيات', 'الأخلاقية', 'الحاسوب', 'جرائم البعث', 'اللغة الكردية', 'الفيزياء', 'الكيمياء', 'الأحياء', 'التربية الإسلامية'];

export function buildGradeRows(students, selectedGradeId, selectedDivisionId, selectedExamId, selectedSubject) {
  return students
    .filter((student) => {
      const gradeMatches = !selectedGradeId || student.gradeId === Number(selectedGradeId);
      const divisionMatches = !selectedDivisionId || student.divisionId === Number(selectedDivisionId);
      return gradeMatches && divisionMatches;
    })
    .map((student) => ({
      studentId: student.id,
      studentName: student.fullName,
      grade: student.grade,
      division: student.division,
      subject: selectedSubject,
      examId: selectedExamId,
      score: '',
      total: '',
    }));
}
