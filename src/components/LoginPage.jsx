import React, { useEffect, useState } from 'react';
import {
  login,
  requestPasswordRecovery,
  resetAdministratorPassword,
  verifyPasswordRecoveryCode,
} from '../services/databaseApi';

function LoginPage({ onLoginSuccess, initialMessage = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('username');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

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

  const openRecovery = () => {
    setRecoveryUsername(username.trim());
    setRecoveryCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryMessage('');
    setRecoveryStep('username');
    setRecoveryMode(true);
  };

  const handleRequestRecovery = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setRecoveryMessage('');
    try {
      const result = await requestPasswordRecovery(recoveryUsername);
      setRecoveryMessage(result.message);
      setRecoveryStep('code');
    } catch (requestError) {
      console.error('Password recovery request failed');
      setRecoveryMessage('تعذر إرسال الطلب الآن. تحقق من تشغيل التطبيق وحاول لاحقاً.');
      setRecoveryStep('code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setRecoveryMessage('');
    try {
      const result = await verifyPasswordRecoveryCode(recoveryUsername, recoveryCode);
      if (!result.ok) {
        setRecoveryMessage(result.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
        return;
      }
      setResetToken(result.resetToken);
      setRecoveryStep('password');
      setRecoveryMessage('');
    } catch (verificationError) {
      console.error('Password recovery code verification failed');
      setRecoveryMessage('تعذر التحقق من الرمز. حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setRecoveryMessage('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryMessage('كلمتا المرور غير متطابقتين.');
      return;
    }
    setIsLoading(true);
    setRecoveryMessage('');
    try {
      const result = await resetAdministratorPassword(recoveryUsername, resetToken, newPassword);
      if (!result.ok) {
        setRecoveryMessage(result.message || 'تعذر تحديث كلمة المرور. اطلب رمزاً جديداً.');
        return;
      }
      setUsername(recoveryUsername);
      setPassword('');
      setRecoveryMode(false);
      setRecoveryMessage('');
      setError('');
      window.alert('تم تحديث كلمة مرور المدير بنجاح. سجّل الدخول باستخدام كلمة المرور الجديدة.');
    } catch (resetError) {
      console.error('Administrator password reset failed');
      setRecoveryMessage('تعذر تحديث كلمة المرور. اطلب رمزاً جديداً.');
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

        <button
          type="button"
          onClick={openRecovery}
          style={{
            marginTop: '22px',
            border: 0,
            background: 'transparent',
            color: '#93c5fd',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          هل نسيت كلمة المرور؟
        </button>

        {recoveryMode && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              background: 'rgba(2, 6, 23, 0.82)',
            }}
          >
            <section style={{
              width: '100%',
              maxWidth: '440px',
              padding: '28px',
              borderRadius: '20px',
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.12)',
              textAlign: 'right',
              color: '#e2e8f0',
            }}>
              <h2 id="recovery-title" style={{ marginTop: 0 }}>استرجاع كلمة مرور المدير</h2>
              <p style={{ color: '#94a3b8', lineHeight: 1.7 }}>
                تُرسل رموز الاسترجاع إلى بريد المدرسة المسجل مسبقاً. لا تتيح هذه الخدمة استرجاع كلمات مرور الموظفين.
              </p>
              {recoveryMessage && (
                <p role="status" style={{ color: '#bfdbfe', lineHeight: 1.6 }}>{recoveryMessage}</p>
              )}

              {recoveryStep === 'username' && (
                <form onSubmit={handleRequestRecovery} style={{ display: 'grid', gap: '14px' }}>
                  <label>
                    اسم المستخدم
                    <input
                      value={recoveryUsername}
                      onChange={(event) => setRecoveryUsername(event.target.value)}
                      autoComplete="username"
                      required
                      autoFocus
                      style={{ width: '100%', marginTop: '8px', padding: '12px', boxSizing: 'border-box' }}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'جارٍ إرسال الطلب...' : 'إرسال رمز التحقق'}
                  </button>
                </form>
              )}

              {recoveryStep === 'code' && (
                <form onSubmit={handleVerifyRecoveryCode} style={{ display: 'grid', gap: '14px' }}>
                  <label>
                    رمز التحقق المكوّن من 6 أرقام
                    <input
                      value={recoveryCode}
                      onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoFocus
                      style={{ width: '100%', marginTop: '8px', padding: '12px', boxSizing: 'border-box', direction: 'ltr' }}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isLoading || recoveryCode.length !== 6}>
                    {isLoading ? 'جارٍ التحقق...' : 'تحقق من الرمز'}
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={isLoading} onClick={() => setRecoveryStep('username')}>
                    رجوع
                  </button>
                </form>
              )}

              {recoveryStep === 'password' && (
                <form onSubmit={handleResetPassword} style={{ display: 'grid', gap: '14px' }}>
                  <label>
                    كلمة المرور الجديدة (8 أحرف على الأقل)
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={256}
                      required
                      autoFocus
                      style={{ width: '100%', marginTop: '8px', padding: '12px', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label>
                    تأكيد كلمة المرور الجديدة
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={256}
                      required
                      style={{ width: '100%', marginTop: '8px', padding: '12px', boxSizing: 'border-box' }}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'جارٍ تحديث كلمة المرور...' : 'حفظ كلمة المرور الجديدة'}
                  </button>
                </form>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isLoading}
                onClick={() => setRecoveryMode(false)}
                style={{ width: '100%', marginTop: '14px' }}
              >
                إغلاق
              </button>
            </section>
          </div>
        )}

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
          مدارس المعلم والكتاب الأهلية © 2026
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
