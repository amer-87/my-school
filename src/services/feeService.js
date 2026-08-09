export const initialFeeRecords = [
  {
    studentId: 1,
    totalFee: 18000,
    payments: [
      { id: 1, amount: 6000, date: '2026-01-15', method: 'نقدي', note: 'دفعة أولى' },
      { id: 2, amount: 4000, date: '2026-02-10', method: 'تحويل', note: 'دفعة ثانية' },
    ],
  },
  {
    studentId: 2,
    totalFee: 15000,
    payments: [
      { id: 3, amount: 5000, date: '2026-01-08', method: 'نقدي', note: 'دفعة أولى' },
    ],
  },
];

export function createPaymentId(records = []) {
  const ids = records.flatMap((record) => record.payments.map((payment) => payment.id));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

export function getFeeSummary(studentId, records = []) {
  const record = records.find((item) => item.studentId === Number(studentId));

  if (!record) {
    return { totalFee: 0, paid: 0, remaining: 0, payments: [] };
  }

  const paid = (record.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalFee = Number(record.totalFee || 0);

  return {
    totalFee,
    paid,
    remaining: Math.max(0, totalFee - paid),
    payments: record.payments || [],
  };
}

export function buildReceiptData(student, summary, payment) {
  return {
    studentName: student?.fullName || 'غير محدد',
    grade: student?.grade || 'غير محدد',
    division: student?.division || 'غير محدد',
    totalFee: summary.totalFee,
    paid: summary.paid,
    remaining: summary.remaining,
    payment,
  };
}
