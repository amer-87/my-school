export const attendanceStatuses = ['حاضر', 'غائب', 'متأخر', 'إجازة'];

export function buildAttendanceRecords(students, selectedGradeId, selectedDivisionId) {
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
      status: 'حاضر',
    }));
}
