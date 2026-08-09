import React, { useState } from 'react';
import { login } from '../services/databaseApi';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.ok) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('حدث خطأ أثناء محاولة الاتصال بالنظام.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      direction: 'rtl'
    }}>
      <div className="login-card" style={{
        background: 'white',
        padding: '40px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏫</div>
        <h2 style={{ color: '#0f172a', margin: '0 0 8px', fontSize: '24px' }}>نظام إدارة المدارس</h2>
        <p style={{ color: '#64748b', margin: '0 0 32px' }}>يرجى تسجيل الدخول للمتابعة</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <label>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '45px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#94a3b8',
                  padding: '5px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', margin: '0', fontSize: '14px', fontWeight: '600' }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ padding: '16px', borderRadius: '14px', fontWeight: '800', fontSize: '17px', marginTop: '10px', width: '100%' }}
          >
            {isLoading ? 'جاري التحقق...' : 'دخول للنظام'}
          </button>
        </form>

        <div style={{ marginTop: '40px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
          مدارس المعلم والكتاب الأهلية © 2026
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
