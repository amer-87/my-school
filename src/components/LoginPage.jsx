import React, { useEffect, useState } from 'react';
import { login } from '../services/databaseApi';

function LoginPage({ onLoginSuccess, initialMessage = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setError(initialMessage);
  }, [initialMessage]);

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
      background: '#0f172a',
      direction: 'rtl',
      fontFamily: 'inherit'
    }}>
      <div className="login-card" style={{
        background: '#1e293b',
        padding: '48px 40px',
        borderRadius: '32px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>🏫</div>
        <h1 style={{ color: '#ffffff', margin: '0 0 8px', fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px' }}>نظام إدارة المدارس</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 40px', fontSize: '16px', fontWeight: '500' }}>مرحباً بك مجدداً، يرجى تسجيل الدخول</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ textAlign: 'right' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: '700',
              paddingRight: '4px'
            }}>اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم هنا..."
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '2px solid rgba(255,255,255,0.05)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              required
              autoFocus
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: '700',
              paddingRight: '4px'
            }}>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '16px 50px 16px 20px',
                  borderRadius: '16px',
                  border: '2px solid rgba(255,255,255,0.05)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '22px',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                onMouseLeave={(e) => e.target.style.color = '#64748b'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '18px',
              borderRadius: '16px',
              fontWeight: '900',
              fontSize: '18px',
              width: '100%',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.3s ease',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.background = '#1d4ed8';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 25px -5px rgba(37, 99, 235, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.background = '#2563eb';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 20px -5px rgba(37, 99, 235, 0.4)';
              }
            }}
          >
            {isLoading ? 'جاري التحقق...' : 'دخول للنظام'}
          </button>
        </form>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
          مدارس المعلم والكتاب الأهلية © 2026
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
