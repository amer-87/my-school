import React, { useEffect, useState } from 'react';
import { createUser, deleteUser, getUsers, setUserActive, updateOwnUsername, updateUserPassword } from '../services/databaseApi';

const initialNewUser = { username: '', password: '', role: 'administrative_employee', fullName: '' };
const roleLabels = {
  admin: 'مدير المدرسة',
  super_admin: 'مدير المدرسة',
  accounting_employee: 'موظف الحسابات',
  administrative_employee: 'موظف إداري',
  employee: 'موظف إداري',
};

function UserManagement({ currentUser, isAdmin = ['admin', 'super_admin'].includes(currentUser?.role), onUserUpdate }) {
  const canUpdateOwnUsername = ['admin', 'super_admin'].includes(currentUser?.role);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState(initialNewUser);
  const [username, setUsername] = useState(currentUser.username || '');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await getUsers(currentUser.id));
    } catch (error) {
      console.error('Failed to load staff accounts', error);
      setMessage({ text: error.message || 'تعذر تحميل حسابات الموظفين.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, currentUser.id]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const normalizedUsername = newUser.username.trim().toLocaleLowerCase();
    const existingUser = users.find((user) => user.username.trim().toLocaleLowerCase() === normalizedUsername);
    if (existingUser) {
      setMessage({
        text: `اسم المستخدم مسجل بالفعل للحساب "${existingUser.full_name}". اختر اسم مستخدم آخر.`,
        type: 'error',
      });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const result = await createUser(newUser, currentUser.id);
      if (result?.ok === false) {
        setMessage({ text: result?.message || 'تعذر إنشاء الحساب.', type: 'error' });
        return;
      }
      if (result?.ok !== true && !result?.id && !result?.user?.id) {
        setMessage({
          text: 'لم تصل نتيجة تأكيد إنشاء الحساب من التطبيق. أعد تشغيل التطبيق ثم تحقق من قائمة الحسابات قبل إعادة المحاولة.',
          type: 'error',
        });
        await loadUsers();
        return;
      }
      setNewUser(initialNewUser);
      setMessage({ text: 'تم إنشاء حساب الموظف بنجاح.', type: 'success' });
      await loadUsers();
    } catch (error) {
      console.error('Failed to create staff account', error);
      const isDuplicateUsername = error.code?.startsWith('SQLITE_CONSTRAINT')
        || /SQLITE_CONSTRAINT|UNIQUE constraint failed.*users\.username|users\.username/i.test(error.message || '');
      setMessage({
        text: isDuplicateUsername
          ? 'اسم المستخدم مستخدم مسبقاً. اختر اسم مستخدم آخر.'
          : error.message || 'فشل إنشاء الحساب.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (passData.newPass !== passData.confirmPass) {
      setMessage({ text: 'كلمتا المرور غير متطابقتين.', type: 'error' });
      return;
    }
    if (passData.newPass.length < 6) {
      setMessage({ text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const result = await updateUserPassword(currentUser.id, passData.newPass, currentUser.id);
      if (!result?.ok) {
        setMessage({ text: result?.message || 'تعذر تغيير كلمة المرور.', type: 'error' });
        return;
      }
      setPassData({ newPass: '', confirmPass: '' });
      setMessage({ text: 'تم تغيير كلمة المرور بنجاح.', type: 'success' });
    } catch (error) {
      console.error('Failed to change own password', error);
      setMessage({ text: error.message || 'فشل تغيير كلمة المرور.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUsername = async (event) => {
    event.preventDefault();
    const nextUsername = username.trim();
    if (!nextUsername) {
      setMessage({ text: 'يرجى إدخال اسم مستخدم صالح.', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const result = await updateOwnUsername(currentUser.id, nextUsername, usernamePassword, currentUser.id);
      if (!result?.ok) {
        setMessage({ text: result?.message || 'تعذر تغيير اسم المستخدم.', type: 'error' });
        return;
      }
      setUsername(result.username);
      setUsernamePassword('');
      onUserUpdate?.({ ...currentUser, username: result.username });
      setMessage({ text: 'تم تغيير اسم المستخدم بنجاح. استخدم الاسم الجديد عند تسجيل الدخول لاحقاً.', type: 'success' });
    } catch (error) {
      console.error('Failed to update own username', error);
      setMessage({ text: error.message || 'تعذر تغيير اسم المستخدم.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (resetPassword.length < 6) {
      setMessage({ text: 'كلمة المرور الأولية يجب أن تكون 6 أحرف على الأقل.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const result = await updateUserPassword(resetTarget.id, resetPassword, currentUser.id);
      if (!result?.ok) {
        setMessage({ text: result?.message || 'تعذرت إعادة تعيين كلمة المرور.', type: 'error' });
        return;
      }
      setResetTarget(null);
      setResetPassword('');
      setMessage({ text: `تمت إعادة تعيين كلمة مرور ${resetTarget.full_name}.`, type: 'success' });
    } catch (error) {
      console.error('Failed to reset staff password', error);
      setMessage({ text: error.message || 'تعذرت إعادة تعيين كلمة المرور.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    const nextActive = !user.is_active;
    const action = nextActive ? 'تفعيل' : 'إيقاف';
    if (!window.confirm(`هل تريد ${action} حساب ${user.full_name}؟`)) return;
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const result = await setUserActive(user.id, nextActive, currentUser.id);
      if (!result?.ok) {
        setMessage({ text: result?.message || `تعذر ${action} الحساب.`, type: 'error' });
        return;
      }
      setMessage({ text: `تم ${action} حساب الموظف دون حذف بياناته.`, type: 'success' });
      await loadUsers();
    } catch (error) {
      console.error(`Failed to ${action} staff account`, error);
      setMessage({ text: error.message || `تعذر ${action} الحساب.`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `هل تريد إلغاء وحذف حساب الموظف ${user.full_name}؟ لن يتمكن من تسجيل الدخول، وسيُخفى الحساب من القائمة. ستبقى الدفعات والدرجات وسجلات النشاط السابقة محفوظة باسمه.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const result = await deleteUser(user.id, currentUser.id);
      if (!result?.ok) {
        setMessage({ text: result?.message || 'تعذر حذف حساب الموظف.', type: 'error' });
        return;
      }
      setMessage({ text: `تم إلغاء حساب ${user.full_name} مع الاحتفاظ بسجلاته السابقة.`, type: 'success' });
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete staff account', error);
      setMessage({ text: error.message || 'تعذر حذف حساب الموظف.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-management">
      {message.text && (
        <p className={message.type === 'error' ? 'form-error' : ''} role="status">
          {message.text}
        </p>
      )}

      {canUpdateOwnUsername && (
        <div className="table-card" style={{ marginBottom: '24px' }}>
          <div className="table-toolbar">
            <div>
              <h3>تغيير اسم المستخدم</h3>
              <p>يمكنك تحديث اسم المستخدم الخاص بك.</p>
            </div>
          </div>
          <form onSubmit={handleUpdateUsername} className="modal-form" style={{ padding: '24px' }}>
            <div className="form-grid">
              <label>
                اسم المستخدم الجديد
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                كلمة المرور الحالية للتأكيد
                <input
                  type="password"
                  value={usernamePassword}
                  onChange={(event) => setUsernamePassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>تحديث اسم المستخدم</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card" style={{ marginBottom: isAdmin ? '24px' : 0 }}>
        <div className="table-toolbar">
          <div>
            <h3>تغيير كلمة المرور</h3>
            <p>أهلاً بك {currentUser.full_name}. يمكنك تغيير كلمة مرور حسابك في أي وقت.</p>
          </div>
        </div>
        <form onSubmit={handleUpdatePassword} className="modal-form" style={{ padding: '24px' }}>
          <div className="form-grid">
            <label>
              كلمة المرور الجديدة
              <input
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={passData.newPass}
                onChange={(event) => setPassData((data) => ({ ...data, newPass: event.target.value }))}
                required
              />
            </label>
            <label>
              تأكيد كلمة المرور
              <input
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={passData.confirmPass}
                onChange={(event) => setPassData((data) => ({ ...data, confirmPass: event.target.value }))}
                required
              />
            </label>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>تحديث كلمة المرور</button>
          </div>
        </form>
      </div>

      {isAdmin && (
        <>
          <div className="table-card" style={{ margin: '24px 0' }}>
            <div className="table-toolbar">
              <div>
                <h3>إنشاء حساب موظف</h3>
                <p>حدد نوع الحساب؛ تمنح أنواع الموظفين صلاحيات ثابتة ومحددة.</p>
              </div>
            </div>
            <form onSubmit={handleCreate} className="modal-form" style={{ padding: '24px' }}>
              <div className="form-grid">
                <label>الاسم الكامل
                  <input value={newUser.fullName} onChange={(event) => setNewUser((data) => ({ ...data, fullName: event.target.value }))} required />
                </label>
                <label>اسم المستخدم
                  <input value={newUser.username} onChange={(event) => setNewUser((data) => ({ ...data, username: event.target.value }))} autoComplete="off" required />
                </label>
                <label>كلمة المرور الأولية
                  <input type="password" minLength={6} value={newUser.password} onChange={(event) => setNewUser((data) => ({ ...data, password: event.target.value }))} autoComplete="new-password" required />
                </label>
                <label>نوع الموظف
                  <select value={newUser.role} onChange={(event) => setNewUser((data) => ({ ...data, role: event.target.value }))}>
                    <option value="administrative_employee">موظف إداري — الطلاب والمعلمون والحضور والدرجات</option>
                    <option value="accounting_employee">موظف الحسابات — الرسوم والأقساط والتقارير المالية</option>
                  </select>
                </label>
              </div>
              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>إنشاء الحساب</button>
              </div>
            </form>
          </div>

          <div className="table-card">
            <div className="table-toolbar"><h3>حسابات الموظفين</h3></div>
            <div className="table-wrapper">
              {loading ? <div className="empty-state-card"><p>جاري تحميل الحسابات...</p></div> : (
                <table>
                  <thead>
                    <tr><th>إجراءات</th><th>الحالة</th><th>نوع الحساب</th><th>اسم المستخدم</th><th>الاسم الكامل</th></tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          {!['admin', 'super_admin'].includes(user.role) && (
                            <div className="action-group">
                              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => { setResetTarget(user); setResetPassword(''); }}>
                                إعادة تعيين كلمة المرور
                              </button>
                              <button
                                type="button"
                                className={`status-badge ${user.is_active === 0 ? 'inactive' : 'active'}`}
                                disabled={saving}
                                onClick={() => handleToggleActive(user)}
                              >
                                {user.is_active === 0 ? 'تفعيل الحساب' : 'إيقاف الحساب'}
                              </button>
                              <button
                                type="button"
                                className="status-badge inactive"
                                disabled={saving}
                                onClick={() => handleDeleteUser(user)}
                              >
                                إلغاء الموظف
                              </button>
                            </div>
                          )}
                        </td>
                        <td>{user.is_active === 0 ? 'موقوف' : 'نشط'}</td>
                        <td>{roleLabels[user.role] || 'موظف إداري'}</td>
                        <td>{user.username}</td>
                        <td style={{ fontWeight: '600' }}>{user.full_name}</td>
                      </tr>
                    ))}
                    {!users.length && <tr><td colSpan="5">لا توجد حسابات موظفين.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {resetTarget && (
        <div className="modal-backdrop">
          <form className="modal-card" style={{ width: 'min(460px, 94vw)', padding: '24px' }} onSubmit={handleResetPassword}>
            <h3>إعادة تعيين كلمة المرور</h3>
            <p>{resetTarget.full_name} ({resetTarget.username})</p>
            <label>
              كلمة المرور الأولية الجديدة
              <input type="password" minLength={6} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} autoComplete="new-password" required autoFocus />
            </label>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>حفظ كلمة المرور</button>
              <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
