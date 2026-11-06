import { useMemo, useState } from 'react';
import { buildReceiptData, createPaymentId, getFeeSummary, initialFeeRecords } from '../services/feeService';

function FeesPage({ students }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feeRecords, setFeeRecords] = useState(initialFeeRecords);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'نقدي', note: '' });
  const [receiptData, setReceiptData] = useState(null);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === Number(selectedStudentId)) || null,
    [selectedStudentId, students],
  );

  const summary = useMemo(() => getFeeSummary(selectedStudentId, feeRecords), [feeRecords, selectedStudentId]);

  const handleAddPayment = (event) => {
    event.preventDefault();

    if (!selectedStudentId) {
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      return;
    }

    const payment = {
      id: createPaymentId(feeRecords),
      amount,
      date: new Date().toISOString().slice(0, 10),
      method: paymentForm.method,
      note: paymentForm.note.trim(),
    };

    setFeeRecords((current) => {
      const existingRecord = current.find((record) => record.studentId === Number(selectedStudentId));

      if (existingRecord) {
        return current.map((record) => (record.studentId === Number(selectedStudentId) ? { ...record, payments: [...record.payments, payment] } : record));
      }

      return [...current, { studentId: Number(selectedStudentId), totalFee: 15000, payments: [payment] }];
    });

    setReceiptData(buildReceiptData(selectedStudent, getFeeSummary(selectedStudentId, feeRecords), payment));
    setPaymentForm({ amount: '', method: 'نقدي', note: '' });
  };

  const handlePrintReceipt = () => {
    if (!receiptData) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>إيصال دفع</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .box { border: 1px solid #bbb; padding: 20px; border-radius: 12px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            h2 { margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>إيصال دفعة</h2>
            <div class="row"><strong>اسم الطالب:</strong> <span>${receiptData.studentName}</span></div>
            <div class="row"><strong>الصف:</strong> <span>${receiptData.grade}</span></div>
            <div class="row"><strong>الشعبة:</strong> <span>${receiptData.division}</span></div>
            <div class="row"><strong>المبلغ المدفوع:</strong> <span>${receiptData.payment.amount} ريال</span></div>
            <div class="row"><strong>طريقة الدفع:</strong> <span>${receiptData.payment.method}</span></div>
            <div class="row"><strong>المتبقي:</strong> <span>${receiptData.remaining} ريال</span></div>
            <div class="row"><strong>ملاحظات:</strong> <span>${receiptData.payment.note || 'لا يوجد'}</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <section className="students-module">
      <div className="module-toolbar">
        <div className="module-actions">
          <label className="filter-control">
            الطالب
            <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              <option value="">اختر الطالب</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="module-summary">
          <span>{summary.payments.length} دفعة مسجلة</span>
        </div>
      </div>

      {selectedStudent ? (
        <>
          <section className="cards">
            <article className="card">
              <h3>الرسوم المستحقة</h3>
              <p style={{ fontSize: '24px', margin: '8px 0 0' }}>{summary.totalFee} ريال</p>
              <p style={{ color: '#cbd5e1', margin: '6px 0 0' }}>الطالب: {selectedStudent.fullName}</p>
            </article>
            <article className="card">
              <h3>المدفوع والمتبقي</h3>
              <p style={{ fontSize: '24px', margin: '8px 0 0' }}>مدفوع: {summary.paid} ريال</p>
              <p style={{ fontSize: '24px', margin: '6px 0 0' }}>متبقي: {summary.remaining} ريال</p>
            </article>
          </section>

          <section className="table-card">
            <div className="table-toolbar">
              <div>
                <h3>إضافة دفعة جديدة</h3>
                <p>أدخل المبلغ وطريقة الدفع ثم احفظها في سجل الرسوم.</p>
              </div>
            </div>

            <form className="modal-form" onSubmit={handleAddPayment}>
              <div className="form-grid">
                <label>
                  المبلغ
                  <input type="number" min="1" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} required />
                </label>
                <label>
                  طريقة الدفع
                  <select value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}>
                    <option value="نقدي">نقدي</option>
                    <option value="تحويل">تحويل</option>
                    <option value="شبكة">شبكة</option>
                  </select>
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  ملاحظات
                  <input type="text" value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} />
                </label>
              </div>
              <div className="module-actions">
                <button type="submit" className="btn btn-primary">إضافة دفعة</button>
                <button type="button" className="btn btn-secondary" onClick={handlePrintReceipt} disabled={!receiptData}>طباعة إيصال</button>
              </div>
            </form>
          </section>

          <section className="table-card">
            <div className="table-toolbar">
              <div>
                <h3>سجل جميع الدفعات</h3>
                <p>تتبع كل دفعة تم تسجيلها للطالب.</p>
              </div>
            </div>

            {summary.payments.length === 0 ? (
              <div className="empty-state-card">
                <p>لا توجد دفعات مسجلة بعد.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>المبلغ</th>
                      <th>طريقة الدفع</th>
                      <th>الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.date}</td>
                        <td>{payment.amount} ريال</td>
                        <td>{payment.method}</td>
                        <td>{payment.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="table-card">
          <div className="empty-state-card">
            <p>اختر طالبًا لعرض الرسوم ومتابعة المدفوعات.</p>
          </div>
        </section>
      )}
    </section>
  );
}

export default FeesPage;
