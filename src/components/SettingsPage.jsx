import { useState, useEffect } from 'react';
import { createBackup, restoreBackup, getLatestBackupInfo, addAcademicYear, setCurrentAcademicYear as setDbCurrentYear, getSchoolSettings, saveSchoolSettings, saveRecoveryMailPassword, getRecoveryMailStatus, testRecoveryMail } from '../services/databaseApi';
import { getIraqiLocalPhone, getIraqiWhatsAppNumber } from '../services/studentService';
import UserManagement from './UserManagement';

function SettingsPage({ currentUser, academicYears, currentAcademicYear, onYearChange, onRefreshYears, onSchoolSettingsChange }) {
  const [backupInfo, setBackupInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('years'); // Default to 'years'
  const [newYearName, setNewYearName] = useState('');
  const [schoolForm, setSchoolForm] = useState({
    schoolName: '',
    schoolType: '',
    schoolAddress: '',
    schoolPhone: '',
    whatsappPhone: '',
    recoveryEmail: '',
    recoveryAppPassword: '',
  });
  const [schoolMessage, setSchoolMessage] = useState({ text: '', type: '' });
  const [recoveryMailStatus, setRecoveryMailStatus] = useState({ credentialConfigured: false });

  const loadBackupInfo = async () => {
    try {
      const info = await getLatestBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      console.error('Failed to load backup info', error);
    }
  };

  useEffect(() => {
    loadBackupInfo();
    Promise.all([getSchoolSettings(), getRecoveryMailStatus(currentUser.id)])
      .then(([settings, mailStatus]) => {
        setSchoolForm({
          schoolName: settings.schoolName,
          schoolType: settings.schoolType || '',
          schoolAddress: settings.schoolAddress || '',
          schoolPhone: settings.schoolPhone || '',
          whatsappPhone: getIraqiLocalPhone(settings.whatsappPhone),
          recoveryEmail: settings.recoveryEmail || '',
          recoveryAppPassword: '',
        });
        setRecoveryMailStatus(mailStatus);
        if (onSchoolSettingsChange) onSchoolSettingsChange(settings);
      })
      .catch((error) => {
        console.error('Failed to load school settings', error);
        setSchoolMessage({ text: 'تعذر تحميل بيانات المدرسة.', type: 'error' });
      });
  }, []);

  const handleSaveSchoolSettings = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setSchoolMessage({ text: '', type: '' });

    try {
      const recoveryEmail = schoolForm.recoveryEmail.trim().toLowerCase();
      const savedCredentialEmail = String(recoveryMailStatus.credentialEmail || '').trim().toLowerCase();
      const needsNewCredential = Boolean(
        recoveryEmail
        && (!recoveryMailStatus.credentialConfigured || recoveryEmail !== savedCredentialEmail),
      );
      if (needsNewCredential && !schoolForm.recoveryAppPassword) {
        setSchoolMessage({
          text: 'عنوان Gmail جديد أو لا توجد كلمة مرور تطبيق مرتبطة به. أدخل كلمة مرور تطبيق أنشأتها لهذا الحساب قبل الحفظ.',
          type: 'error',
        });
        return;
      }

      const result = await saveSchoolSettings({
        schoolName: schoolForm.schoolName,
        schoolType: schoolForm.schoolType,
        schoolAddress: schoolForm.schoolAddress,
        schoolPhone: schoolForm.schoolPhone,
        whatsappPhone: getIraqiWhatsAppNumber(schoolForm.whatsappPhone),
        recoveryEmail,
      }, currentUser.id);
      if (!result.ok) {
        setSchoolMessage({ text: result.message || 'تعذر حفظ بيانات المدرسة.', type: 'error' });
        return;
      }

      if (schoolForm.recoveryAppPassword) {
        const credentialResult = await saveRecoveryMailPassword(
          recoveryEmail,
          schoolForm.recoveryAppPassword,
          currentUser.id,
        );
        if (!credentialResult.ok) {
          setSchoolMessage({ text: credentialResult.message || 'تعذر حفظ إعداد Gmail الآمن.', type: 'error' });
          return;
        }
      }

      const settings = result.settings;
      setSchoolForm({
        schoolName: settings.schoolName,
        schoolType: settings.schoolType || '',
        schoolAddress: settings.schoolAddress || '',
        schoolPhone: settings.schoolPhone || '',
        whatsappPhone: getIraqiLocalPhone(settings.whatsappPhone),
        recoveryEmail: settings.recoveryEmail || '',
        recoveryAppPassword: '',
      });
      setRecoveryMailStatus(await getRecoveryMailStatus(currentUser.id));
      if (onSchoolSettingsChange) onSchoolSettingsChange(settings);
      setSchoolMessage({
        text: 'تم حفظ بيانات المدرسة. كلمة مرور تطبيق Gmail محفوظة ومشفرة لهذا البريد تحديداً.',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to save school settings', error);
      setSchoolMessage({ text: 'حدث خطأ أثناء حفظ بيانات المدرسة.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRecoveryMail = async () => {
    setIsLoading(true);
    setSchoolMessage({ text: '', type: '' });
    try {
      const result = await testRecoveryMail(currentUser.id);
      setSchoolMessage({ text: result.message || 'تعذر اختبار إعداد Gmail.', type: result.ok ? 'success' : 'error' });
      if (result.ok) setRecoveryMailStatus((status) => ({ ...status, credentialConfigured: true }));
    } catch (error) {
      console.error('Failed to test recovery email settings', error);
      setSchoolMessage({ text: error.message || 'تعذر اختبار إعداد Gmail.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddYear = async (e) => {
    e.preventDefault();
    if (!newYearName.trim()) return;

    setIsLoading(true);
    try {
      const result = await addAcademicYear(newYearName.trim(), currentUser.id);
      if (result.ok) {
        setNewYearName('');
        await onRefreshYears();
        setMessage({ text: 'تم إضافة العام الدراسي بنجاح.', type: 'success' });
      } else {
        setMessage({ text: result.message || 'فشل إضافة العام الدراسي.', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: 'حدث خطأ تقني.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrent = async (yearName) => {
    setIsLoading(true);
    try {
      const result = await setDbCurrentYear(yearName, currentUser.id);
      if (result.ok) {
        await onYearChange(yearName);
        setMessage({ text: `تم تغيير العام الدراسي النشط إلى ${yearName}`, type: 'success' });
      }
    } catch (e) {
      setMessage({ text: 'فشل تغيير العام الدراسي.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const result = await createBackup();
      if (result.ok) {
        setMessage({ text: 'تم إنشاء النسخة الاحتياطية بنجاح.', type: 'success' });
        loadBackupInfo();
      } else if (!result.canceled) {
        setMessage({ text: 'فشل إنشاء النسخة الاحتياطية.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'حدث خطأ أثناء محاولة الحفظ.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية بالكامل.')) {
      return;
    }

    setIsLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const result = await restoreBackup();
      if (result.ok) {
        setMessage({ text: 'تمت استعادة البيانات بنجاح. يرجى إعادة تشغيل التطبيق لتحديث البيانات.', type: 'success' });
      } else if (!result.canceled) {
        setMessage({ text: 'فشل استعادة النسخة الاحتياطية.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'حدث خطأ أثناء محاولة الاستعادة.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="students-module">
      <div className="tabs-container" style={{ marginBottom: '24px', width: 'fit-content' }}>
        <button
          className={`tab-btn ${activeTab === 'years' ? 'active' : ''}`}
          onClick={() => setActiveTab('years')}
        >
          📅 السنوات الدراسية
        </button>
        <button
          className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          🛡️ النسخ الاحتياطي
        </button>
        <button
          className={`tab-btn ${activeTab === 'school' ? 'active' : ''}`}
          onClick={() => setActiveTab('school')}
        >
          🏫 بيانات المدرسة
        </button>
        {currentUser?.role === 'admin' && (
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👤 إدارة المستخدمين
          </button>
        )}
      </div>

      {activeTab === 'users' ? (
        <UserManagement currentUser={currentUser} />
      ) : activeTab === 'years' ? (
        <div className="years-management">
          <div className="cards">
            <article className="card">
              <h3>إضافة سنة دراسية جديدة</h3>
              <form onSubmit={handleAddYear} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <input
                  type="text"
                  placeholder="مثال: 2027-2028"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  style={{ flex: 1, padding: '12px' }}
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading}>➕ إضافة</button>
              </form>
            </article>

            <article className="card">
              <h3>السنوات المسجلة</h3>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {academicYears.map(year => (
                  <div
                    key={year.id}
                    className={`installment-item compact ${currentAcademicYear === year.year_name ? 'highlight' : ''}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: currentAcademicYear === year.year_name ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                      border: currentAcademicYear === year.year_name ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '16px' }}>{year.year_name}</strong>
                      {currentAcademicYear === year.year_name && <span style={{ marginRight: '10px', color: '#10b981', fontSize: '12px' }}>● نشط حالياً</span>}
                    </div>
                    {currentAcademicYear !== year.year_name && (
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleSetCurrent(year.year_name)}>
                        تفعيل هذه السنة
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      ) : activeTab === 'school' ? (
        <div className="cards">
          <article className="card">
            <h3>بيانات المدرسة والتواصل</h3>
            <p>يظهر اسم المدرسة ونوعها وعنوانها ورقم هاتفها في أسفل وصل القبض، ويُستخدم رقم واتساب للرسائل إلى أولياء الأمور.</p>
            <p>تُفتح المحادثة من حساب واتساب المسجل على هذا الجهاز.</p>

            <form className="modal-form" onSubmit={handleSaveSchoolSettings} style={{ marginTop: '20px' }}>
              <div className="form-grid">
                <label>
                  اسم المدرسة
                  <input
                    value={schoolForm.schoolName}
                    onChange={(event) => setSchoolForm((form) => ({ ...form, schoolName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  نوع المدرسة / المرحلة
                  <input
                    value={schoolForm.schoolType}
                    onChange={(event) => setSchoolForm((form) => ({ ...form, schoolType: event.target.value }))}
                    placeholder="مثال: ابتدائية مختلطة أو متوسطة"
                    maxLength={100}
                  />
                </label>
                <label>
                  عنوان المدرسة
                  <input
                    value={schoolForm.schoolAddress}
                    onChange={(event) => setSchoolForm((form) => ({ ...form, schoolAddress: event.target.value }))}
                    placeholder="المدينة، المنطقة، أقرب علامة دالة"
                    maxLength={300}
                  />
                </label>
                <label>
                  رقم هاتف المدرسة الظاهر في الوصل
                  <input
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={schoolForm.schoolPhone}
                    onChange={(event) => setSchoolForm((form) => ({ ...form, schoolPhone: event.target.value }))}
                    placeholder="مثال: 07700000000"
                    maxLength={50}
                  />
                </label>
                <label>
                  رقم واتساب المدرسة
                  <span style={{ display: 'flex', direction: 'ltr', alignItems: 'stretch' }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRight: 0,
                        borderRadius: '10px 0 0 10px',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#f8fafc',
                      }}
                    >
                      +964
                    </span>
                    <input
                      aria-label="رقم واتساب المدرسة داخل العراق"
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      placeholder="7XXXXXXXXX"
                      value={schoolForm.whatsappPhone}
                      onChange={(event) => setSchoolForm((form) => ({ ...form, whatsappPhone: event.target.value }))}
                      required
                      style={{ flex: 1, minWidth: 0, borderRadius: '0 10px 10px 0' }}
                    />
                  </span>
                </label>
                <label>
                  البريد الإلكتروني الرسمي للمدرسة (Gmail)
                  <input
                    type="email"
                    value={schoolForm.recoveryEmail}
                    onChange={(event) => setSchoolForm((form) => ({ ...form, recoveryEmail: event.target.value }))}
                    placeholder="school@gmail.com"
                    autoComplete="email"
                  />
                </label>
                <label>
                  كلمة مرور تطبيق Gmail
                  <input
                    type="password"
                    value={schoolForm.recoveryAppPassword}
                    onChange={(event) => setSchoolForm((form) => ({ ...form, recoveryAppPassword: event.target.value }))}
                    placeholder={recoveryMailStatus.credentialConfigured && recoveryMailStatus.credentialEmail === schoolForm.recoveryEmail.trim().toLowerCase()
                      ? 'مُعدّة لهذا البريد؛ اتركها فارغة للإبقاء عليها'
                      : 'أدخل كلمة مرور التطبيق ذات 16 حرفاً لهذا البريد'}
                    autoComplete="new-password"
                  />
                </label>
              </div>
              <p style={{ color: '#94a3b8', marginTop: '12px' }}>
                يُستخدم البريد لاسترجاع كلمة مرور المدير فقط. أنشئ كلمة مرور تطبيق من إعدادات أمان Google؛ لا تستخدم كلمة مرور Gmail العادية.
                {recoveryMailStatus.credentialConfigured
                  ? ` كلمة مرور التطبيق محفوظة في خزنة Windows لهذا البريد: ${recoveryMailStatus.credentialEmail}.`
                  : recoveryMailStatus.hasCredential
                    ? ` كلمة المرور المحفوظة تخص بريداً آخر (${recoveryMailStatus.credentialEmail || 'إعداد قديم'})؛ أدخل كلمة مرور تطبيق جديدة للبريد الحالي.`
                    : ' يلزم حفظ كلمة مرور التطبيق لهذا البريد لتفعيل الإرسال.'}
              </p>

              {schoolMessage.text && (
                <p className={schoolMessage.type === 'error' ? 'form-error' : ''} role="status">
                  {schoolMessage.text}
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'جاري الحفظ...' : 'حفظ بيانات المدرسة'}
                </button>
                <button type="button" className="btn btn-secondary" disabled={isLoading} onClick={handleTestRecoveryMail}>
                  اختبار إرسال Gmail
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : (
        <>
          <div className="cards">
            <article className="card">
              <h3>النسخ الاحتياطي</h3>
              <p>قم بإنشاء نسخة من قاعدة البيانات لحماية بياناتك من الفقدان.</p>

              <div className="detail-item" style={{ marginBottom: '20px' }}>
                <span className="detail-label">تاريخ آخر نسخة احتياطية:</span>
                <span className="detail-value">{backupInfo?.timestamp || 'لا يوجد نسخ سابقة'}</span>
              </div>

              <div className="module-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري الحفظ...' : 'إنشاء نسخة احتياطية الآن'}
                </button>
              </div>
            </article>

            <article className="card">
              <h3>استعادة البيانات</h3>
              <p>يمكنك استعادة قاعدة بيانات من ملف نسخة احتياطية سابق. تنبيه: سيتم مسح البيانات الحالية.</p>

              <div className="module-actions" style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleRestoreBackup}
                  disabled={isLoading}
                >
                  اختيار ملف واستعادة
                </button>
              </div>
            </article>
          </div>

          {message.text && (
            <div className={`toast ${message.type === 'error' ? 'error-toast' : ''}`} style={{
              background: message.type === 'error' ? '#dc2626' : '#0f766e',
              position: 'static',
              marginTop: '20px',
              width: 'fit-content'
            }}>
              {message.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SettingsPage;
