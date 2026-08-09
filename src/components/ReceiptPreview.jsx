import React from 'react';

function ReceiptPreview({ receiptData, onBack }) {
  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-IQ').format(amount);
  };

  const receiptId = `REC-${705000 + (receiptData.payment?.id || 0)}`;

  return (
    <div className="receipt-view-container">
      <div className="receipt-actions no-print">
        <button className="btn btn-primary" onClick={handlePrint}>
          <span style={{ marginLeft: '8px' }}>🖨️</span> طباعة الوصل
        </button>
        <button className="btn-text" onClick={onBack} style={{ marginRight: '16px', cursor: 'pointer', background: 'none', border: 0, color: '#64748b', fontSize: '16px' }}>
          عودة
        </button>
      </div>

      <div className="receipt-paper">
        <div className="receipt-header">
          <div className="header-top">
            <div className="school-info">
              <h2 className="school-name">مدارس المعلم والكتاب الأهلية</h2>
              <p className="school-subtitle">ابتدائية مختلطة - ثانوية بنين</p>
            </div>
            <div className="school-logo">
              <div className="logo-placeholder">🎓</div>
            </div>
            <div className="academic-year">
              العام الدراسي 2026-2027
            </div>
          </div>
          <div className="header-divider"></div>
        </div>

        <div className="receipt-body">
          <h1 className="receipt-title">وصل قبض</h1>
          <div className="receipt-meta">
            <span>التاريخ: {receiptData.payment?.date}</span>
            <span>رقم الوصل: {receiptId}</span>
          </div>

          <div className="barcode-area">
            <div className="barcode-mock">|| ||| || |||| || ||| || ||||</div>
          </div>

          <div className="receipt-details-grid">
            <div className="detail-box">
              <span className="detail-label">استلمنا من ولي أمر الطالب/ة</span>
              <span className="detail-value">{receiptData.studentName}</span>
            </div>
            <div className="detail-box">
              <span className="detail-label">المرحلة والصف</span>
              <span className="detail-value">{receiptData.grade} - {receiptData.division || 'عام'}</span>
            </div>
          </div>

          <div className="amount-highlight-box">
            <span className="amount-label">مبلغاً وقدره</span>
            <div className="amount-main">
              <span className="amount-num">{formatCurrency(receiptData.payment?.amount)}</span>
              <span className="amount-txt">دينار عراقي</span>
            </div>
            <p className="payment-reason">وذلك عن تسديد قسط دراسي.</p>
          </div>

          <div className="signatures-area">
            <div className="sig-box">
              <div className="sig-line"></div>
              <span>توقيع المستلم</span>
            </div>
            <div className="sig-box">
              <div className="sig-line"></div>
              <span>ختم المدرسة</span>
            </div>
          </div>
        </div>

        <div className="receipt-footer">
          <div className="footer-info-bar">
            <div className="info-item">
              <span className="info-icon">📞</span>
              <span>للاستفسار والتسجيل: 07712447347</span>
            </div>
            <div className="info-item">
              <span className="info-icon">📍</span>
              <span>العنوان: البصرة - خلف جامع البصرة الكبير</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptPreview;
