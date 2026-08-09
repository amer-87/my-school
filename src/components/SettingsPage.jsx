import { useState, useEffect } from 'react';
import { createBackup, restoreBackup, getLatestBackupInfo } from '../services/databaseApi';
import UserManagement from './UserManagement';

function SettingsPage({ currentUser }) {
  const [backupInfo, setBackupInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('backup'); // 'backup' or 'users'

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
          className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          النسخ الاحتياطي
        </button>
        {currentUser?.role === 'admin' && (
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            إدارة المستخدمين
          </button>
        )}
      </div>

      {activeTab === 'users' ? (
        <UserManagement currentUser={currentUser} />
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
