import React, { useMemo, useState } from 'react';

function DocumentsPage({ students }) {
  const [activeTab, setActiveTab] = useState('certificates'); // 'certificates' or 'idcards'
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // For Certificates
  const [scores, setScores] = useState({ math: 88, science: 92, english: 85, arabic: 90 });

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === Number(selectedStudentId)) || null,
    [selectedStudentId, students],
  );

  const average = useMemo(() => {
    const values = Object.values(scores).map(Number);
    if (values.length === 0) return 0;
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  }, [scores]);

  const certificateGrade = useMemo(() => {
    const numericAverage = Number(average);
    if (numericAverage >= 90) return 'ممتاز';
    if (numericAverage >= 80) return 'جيد جدًا';
    if (numericAverage >= 70) return 'جيد';
    if (numericAverage >= 60) return 'مقبول';
    return 'ضعيف';
  }, [average]);

  const handlePrintCertificate = () => {
    if (!selectedStudent) return;
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>شهادة</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; direction: rtl; }
            .certificate { border: 3px solid #0f172a; border-radius: 18px; padding: 28px; max-width: 760px; margin: 0 auto; background: white; }
            .title { text-align: center; font-size: 28px; color: #0f172a; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #475569; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            .score-row { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1 class="title">شهادة تقدير</h1>
            <p class="subtitle">مدرسة المستقبل</p>
            <div class="row"><strong>اسم الطالب:</strong><span>${selectedStudent.fullName}</span></div>
            <div class="row"><strong>الصف:</strong><span>${selectedStudent.grade}</span></div>
            <div class="row"><strong>الشعبة:</strong><span>${selectedStudent.division}</span></div>
            <div class="score-row"><strong>الرياضيات:</strong> ${scores.math}</div>
            <div class="score-row"><strong>العلوم:</strong> ${scores.science}</div>
            <div class="score-row"><strong>الإنجليزية:</strong> ${scores.english}</div>
            <div class="score-row"><strong>العربية:</strong> ${scores.arabic}</div>
            <div class="row"><strong>المعدل:</strong><span>${average}</span></div>
            <div class="row"><strong>التقدير:</strong><span>${certificateGrade}</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handlePrintIdCard = () => {
    if (!selectedStudent) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>بطاقة هوية</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; direction: rtl; }
            .card { border: 2px solid #0f172a; border-radius: 16px; padding: 24px; width: 420px; margin: 0 auto; background: white; }
            .header { text-align: center; margin-bottom: 14px; }
            .photo { width: 110px; height: 110px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #0f766e); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 34px; font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; }
            .qr { margin-top: 16px; text-align: center; }
            .qr-box { width: 140px; height: 140px; margin: 0 auto; border: 2px solid #111; display: flex; align-items: center; justify-content: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2>بطاقة طالب</h2>
              <p>مدرسة المستقبل</p>
            </div>
            <div class="photo">${selectedStudent.fullName.charAt(0)}</div>
            <div class="row"><strong>الاسم:</strong><span>${selectedStudent.fullName}</span></div>
            <div class="row"><strong>الصف:</strong><span>${selectedStudent.grade}</span></div>
            <div class="row"><strong>الشعبة:</strong><span>${selectedStudent.division}</span></div>
            <div class="row"><strong>الرقم:</strong><span>${selectedStudent.id}</span></div>
            <div class="qr">
              <div class="qr-box">QR</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="documents-page">
      <div className="module-toolbar">
        <div className="module-actions">
           <div className="tabs-container" style={{ marginBottom: '0' }}>
            <button
              className={`tab-btn ${activeTab === 'certificates' ? 'active' : ''}`}
              onClick={() => setActiveTab('certificates')}
            >
              📜 الشهادات التقديرية
            </button>
            <button
              className={`tab-btn ${activeTab === 'idcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('idcards')}
            >
              🆔 هويات الطلاب
            </button>
          </div>
          <label className="filter-control" style={{ marginRight: '20px' }}>
            اختر الطالب
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              <option value="">-- اختر طالب من القائمة --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selectedStudent ? (
        <section className="table-card">
          <div className="table-toolbar">
            <div>
              <h3>معاينة {activeTab === 'certificates' ? 'الشهادة' : 'الهوية'}</h3>
              <p>تأكد من البيانات قبل إرسالها للطباعة.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={activeTab === 'certificates' ? handlePrintCertificate : handlePrintIdCard}
            >
              🖨️ طباعة المستند
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            {activeTab === 'certificates' ? (
              <div className="certificate-preview">
                <div className="certificate-card">
                  <h2>شهادة تقدير</h2>
                  <p>مدرسة المستقبل</p>
                  <div className="certificate-row"><span>اسم الطالب</span><strong>{selectedStudent.fullName}</strong></div>
                  <div className="certificate-row"><span>الصف</span><strong>{selectedStudent.grade}</strong></div>
                  <div className="certificate-row"><span>الشعبة</span><strong>{selectedStudent.division}</strong></div>
                  <div className="certificate-row"><span>المعدل</span><strong>{average}</strong></div>
                  <div className="certificate-row"><span>التقدير</span><strong>{certificateGrade}</strong></div>
                </div>
              </div>
            ) : (
              <div className="id-card-preview">
                <div className="id-card">
                  <div className="id-card-header">
                    <h2>بطاقة طالب</h2>
                    <p>مدرسة المستقبل</p>
                  </div>
                  <div className="id-card-photo">{selectedStudent.fullName.charAt(0)}</div>
                  <div className="id-card-row"><span>الاسم</span><strong>{selectedStudent.fullName}</strong></div>
                  <div className="id-card-row"><span>الصف</span><strong>{selectedStudent.grade}</strong></div>
                  <div className="id-card-row"><span>الشعبة</span><strong>{selectedStudent.division}</strong></div>
                  <div className="id-card-row"><span>الرقم</span><strong>{selectedStudent.id}</strong></div>
                  <div className="id-card-qr">QR</div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="empty-state-card" style={{ marginTop: '20px' }}>
          <p>يرجى اختيار طالب من القائمة لعرض ومعاينة المستندات الخاصة به.</p>
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
