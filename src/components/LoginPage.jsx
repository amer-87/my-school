import React, { useState } from 'react';
import { createSchool, login } from '../services/databaseApi';

function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [schoolName, setSchoolName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'create') {
        const result = await createSchool({ schoolName, username, password, confirmPassword });
        if (!result.ok) {
          setError(result.message || 'تعذر إنشاء المدرسة.');
          setIsLoading(false);
          return;
        }

        const loginResult = await login(username, password, schoolName);
        if (loginResult.ok) {
          setSuccess('تم إنشاء المدرسة بنجاح، وقد تم تسجيل الدخول تلقائياً.');
          onLoginSuccess(loginResult.user);
          return;
        }

        setSuccess('تم إنشاء المدرسة بنجاح، يرجى تسجيل الدخول باستخدام بيانات المدرسة.');
        setMode('login');
        setIsLoading(false);
        return;
      }

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

  const isCreateMode = mode === 'create';

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
        <p style={{ color: '#94a3b8', margin: '0 0 20px', fontSize: '16px', fontWeight: '500' }}>
          {isCreateMode ? 'إنشاء مدرسة جديدة داخل التطبيق' : 'مرحباً بك مجدداً، يرجى تسجيل الدخول'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            style={{
              padding: '10px 18px',
              borderRadius: '12px 0 0 12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: mode === 'login' ? '#2563eb' : '#0f172a',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setMode('create'); setError(''); setSuccess(''); }}
            style={{
              padding: '10px 18px',
              borderRadius: '0 12px 12px 0',
              border: '1px solid rgba(255,255,255,0.1)',
              background: mode === 'create' ? '#10b981' : '#0f172a',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            إنشاء مدرسة
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {isCreateMode && <div style={{ textAlign: 'right' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: '700',
              paddingRight: '4px'
            }}>اسم المدرسة</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="أدخل اسم المدرسة هنا..."
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
          </div>}

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

          {isCreateMode && (
            <div style={{ textAlign: 'right' }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: '700',
                paddingRight: '4px'
              }}>تأكيد كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  required={isCreateMode}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          )}

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

          {success && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#a7f3d0',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              textAlign: 'center'
            }}>
              ✅ {success}
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
              background: isCreateMode ? '#10b981' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.3s ease',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.background = isCreateMode ? '#059669' : '#1d4ed8';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = isCreateMode ? '0 15px 25px -5px rgba(16, 185, 129, 0.4)' : '0 15px 25px -5px rgba(37, 99, 235, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.background = isCreateMode ? '#10b981' : '#2563eb';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 20px -5px rgba(37, 99, 235, 0.4)';
              }
            }}
          >
            {isLoading ? (isCreateMode ? 'جاري إنشاء المدرسة...' : 'جاري التحقق...') : (isCreateMode ? 'إنشاء المدرسة' : 'دخول للنظام')}
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
