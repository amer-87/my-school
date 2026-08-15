import { useState, useEffect } from 'react';
import { createBackup, restoreBackup, getLatestBackupInfo, addAcademicYear, setCurrentAcademicYear as setDbCurrentYear } from '../services/databaseApi';
import UserManagement from './UserManagement';

function SettingsPage({ currentUser, academicYears, currentAcademicYear, onYearChange, onRefreshYears }) {
  const [backupInfo, setBackupInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('years'); // Default to 'years'
  const [newYearName, setNewYearName] = useState('');

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
  }, []);

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
