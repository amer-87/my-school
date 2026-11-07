import { useState, useEffect } from 'react';
import { createBackup, restoreBackup, getLatestBackupInfo, addAcademicYear, setCurrentAcademicYear as setDbCurrentYear, getSchoolSettings, saveSchoolSettings } from '../services/databaseApi';
import { getIraqiLocalPhone, getIraqiWhatsAppNumber } from '../services/studentService';
import UserManagement from './UserManagement';

function SettingsPage({ currentUser, academicYears, currentAcademicYear, onYearChange, onRefreshYears, onSchoolSettingsChange }) {
  const [backupInfo, setBackupInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('years'); // Default to 'years'
  const [newYearName, setNewYearName] = useState('');
  const [schoolForm, setSchoolForm] = useState({ schoolName: '', whatsappPhone: '' });
  const [schoolMessage, setSchoolMessage] = useState({ text: '', type: '' });

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
    getSchoolSettings()
      .then((settings) => {
        setSchoolForm({
          schoolName: settings.schoolName,
          whatsappPhone: getIraqiLocalPhone(settings.whatsappPhone),
        });
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
      const result = await saveSchoolSettings({
        schoolName: schoolForm.schoolName,
        whatsappPhone: getIraqiWhatsAppNumber(schoolForm.whatsappPhone),
      }, currentUser.id);
      if (!result.ok) {
        setSchoolMessage({ text: result.message || 'تعذر حفظ بيانات المدرسة.', type: 'error' });
        return;
      }

      const settings = result.settings;
      setSchoolForm({
        schoolName: settings.schoolName,
        whatsappPhone: getIraqiLocalPhone(settings.whatsappPhone),
      });
      if (onSchoolSettingsChange) onSchoolSettingsChange(settings);
      setSchoolMessage({ text: 'تم حفظ بيانات المدرسة بنجاح.', type: 'success' });
    } catch (error) {
      console.error('Failed to save school settings', error);
      setSchoolMessage({ text: 'حدث خطأ أثناء حفظ بيانات المدرسة.', type: 'error' });
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
            <p>يظهر اسم المدرسة ورقم واتسابها في الرسائل المرسلة إلى أولياء الأمور.</p>
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
              </div>

              {schoolMessage.text && (
                <p className={schoolMessage.type === 'error' ? 'form-error' : ''} role="status">
                  {schoolMessage.text}
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'جاري الحفظ...' : 'حفظ بيانات المدرسة'}
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
