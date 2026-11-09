export const normalizeResultText = (value) => String(value || '')
  .trim()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ');

function getGradeNumber(gradeName) {
  const name = normalizeResultText(gradeName)
    .replace(/الصف/g, '')
    .replace(/ابتدائي|المتوسط|متوسط|الثانوي|ثانوي|الاعدادي|اعدادي/g, '')
    .trim();
  const words = [
    ['اول', 'الاول'], ['ثاني', 'الثاني'], ['ثالث', 'الثالث'],
    ['رابع', 'الرابع'], ['خامس', 'الخامس'], ['سادس', 'السادس'],
  ];
  const wordIndex = words.findIndex((forms) => forms.some((word) => name.includes(word)));
  if (wordIndex !== -1) return wordIndex + 1;
  const digits = name.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const number = Number(digits.match(/\d+/)?.[0]);
  return Number.isInteger(number) ? number : null;
}

export function getGradeRule(grade) {
  if (!grade) return null;
  const level = normalizeResultText(grade.level);
  const number = getGradeNumber(grade.name);
  const isPrimary = level.includes('ابتدائي');
  const isMiddle = level.includes('متوسط');
  const isSecondary = level.includes('ثانوي');

  if ((isPrimary && number === 6) || (isMiddle && (number === 3 || number === 6))
    || (isSecondary && number === 6)) {
    return 'final-only';
  }
  if ((isPrimary && number >= 1 && number <= 5)
    || (isMiddle && (number === 1 || number === 2))
    || (isSecondary && (number === 4 || number === 5))) {
    return 'annual-and-final';
  }
  return null;
}

export function calculateYearEndSubjects(student, grade) {
  const rule = getGradeRule(grade);
  if (!rule) return [];
  const bySubject = new Map();
  student.subjects.forEach((subject) => {
    const key = normalizeResultText(subject.name);
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(subject);
  });
  const secondRoundBySubject = new Map(
    (student.secondRoundResults || []).map((result) => [normalizeResultText(result.subjectName), result]),
  );
  const excludedCourses = new Set([
    normalizeResultText('النهائي'),
    normalizeResultText('الدور الثاني'),
  ]);

  return [...bySubject.entries()].flatMap(([key, subjectExams]) => {
    const finalExam = subjectExams.find((subject) =>
      normalizeResultText(subject.course) === normalizeResultText('النهائي')
    );
    if (!finalExam) return [];
    const annualScores = subjectExams.filter((subject) =>
      subject.score !== null && !excludedCourses.has(normalizeResultText(subject.course))
    );
    const annualAverage = annualScores.length
      ? annualScores.reduce((sum, subject) => sum + (subject.score / subject.total) * 100, 0) / annualScores.length
      : null;
    const finalScore = finalExam.score === null ? null : (finalExam.score / finalExam.total) * 100;
    const firstRoundCalculatedScore = finalScore === null || (rule === 'annual-and-final' && annualAverage === null)
      ? null
      : rule === 'final-only' ? finalScore : (annualAverage + finalScore) / 2;
    const secondRound = secondRoundBySubject.get(key);
    const secondRoundPercentage = secondRound
      ? (secondRound.score / secondRound.total) * 100
      : null;
    const calculatedScore = secondRoundPercentage === null
      ? firstRoundCalculatedScore
      : rule === 'final-only' ? secondRoundPercentage : (annualAverage + secondRoundPercentage) / 2;
    return [{
      key,
      name: finalExam.name,
      annualAverage,
      finalScore,
      effectiveFinalScore: secondRoundPercentage ?? finalScore,
      finalRawScore: finalExam.score,
      finalTotal: finalExam.total,
      firstRoundCalculatedScore,
      calculatedScore,
      secondRoundScore: secondRound?.score ?? null,
      secondRoundTotal: secondRound?.total ?? finalExam.total,
      secondRoundPercentage,
      failedInFirstRound: firstRoundCalculatedScore !== null && firstRoundCalculatedScore < 50,
      complete: calculatedScore !== null,
    }];
  });
}
