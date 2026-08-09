import React, { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, updateUserPassword } from '../services/databaseApi';

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'employee', fullName: '' });
  const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createUser(newUser, currentUser.id);
      alert('تم إنشاء حساب المستخدم بنجاح.');
      setNewUser({ username: '', password: '', role: 'employee', fullName: '' });
      await loadUsers();
    } catch (err) {
      alert('فشل إنشاء المستخدم. ربما الاسم موجود مسبقاً.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passData.newPass !== passData.confirmPass) {
      alert('كلمات المرور غير متطابقة!');
      return;
    }
    if (passData.newPass.length < 4) {
      alert('كلمة المرور يجب أن تكون 4 أحرف على الأقل.');
      return;
    }

    try {
      await updateUserPassword(currentUser.id, passData.newPass, currentUser.id);
      alert('تم تغيير كلمة المرور بنجاح.');
      setPassData({ newPass: '', confirmPass: '' });
    } catch (err) {
      alert('فشل تغيير كلمة المرور.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const res = await deleteUser(id, currentUser.id);
      if (res.ok) {
        await loadUsers();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="user-management">
      {/* Current User Settings Section */}
      <div className="table-card" style={{ marginBottom: '24px' }}>
        <div className="table-toolbar">
          <div>
            <h3>إعدادات حسابي الشخصي</h3>
            <p>أهلاً بك {currentUser.full_name}. يمكنك تحديث كلمة المرور الخاصة بك من هنا.</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="modal-form" style={{ padding: '24px' }}>
          <div className="form-grid">
            <label>
              كلمة المرور الجديدة
              <input
                type="password"
                value={passData.newPass}
                onChange={e => setPassData({...passData, newPass: e.target.value})}
                placeholder="أدخل كلمة مرور قوية"
                required
              />
            </label>
            <label>
              تأكيد كلمة المرور
              <input
                type="password"
                value={passData.confirmPass}
                onChange={e => setPassData({...passData, confirmPass: e.target.value})}
                placeholder="أعد كتابة كلمة المرور"
                required
              />
            </label>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">💾 تحديث كلمة السر</button>
          </div>
        </form>
      </div>

      <div className="table-card" style={{ marginBottom: '24px' }}>
        <div className="table-toolbar">
          <div>
            <h3>إضافة مستخدم (موظف) جديد</h3>
            <p>قم بإنشاء حسابات للموظفين لتنفيذ الأعمال اليومية.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="modal-form" style={{ padding: '24px' }}>
          <div className="form-grid">
            <label>
              الاسم الكامل
              <input
                value={newUser.fullName}
                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                required
              />
            </label>
            <label>
              اسم المستخدم
              <input
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                required
              />
            </label>
            <label>
              كلمة المرور
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                required
              />
            </label>
            <label>
              الصلاحية
              <select
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="employee">موظف</option>
                <option value="admin">مدير</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">إنشاء الحساب</button>
          </div>
        </form>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <h3>قائمة المستخدمين الحاليين</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
                <th>تاريخ الإنشاء</th>
                <th>الصلاحية</th>
                <th>اسم المستخدم</th>
                <th>الاسم الكامل</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="status-badge inactive"
                      style={{ cursor: 'pointer', border: 0 }}
                      onClick={() => handleDelete(user.id)}
                      disabled={user.username === 'admin'}
                    >
                      حذف
                    </button>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>{user.role === 'admin' ? 'مدير' : 'موظف'}</td>
                  <td>{user.username}</td>
                  <td style={{ fontWeight: '600' }}>{user.full_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
