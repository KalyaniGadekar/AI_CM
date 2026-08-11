import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Building2, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface RegisterProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigate: (path: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ onLoginSuccess, onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !companyName || !email || !phone || !password || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    // Password strength
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      setErrorMsg('Password must contain both letters and numbers.');
      return;
    }

    // Passwords match
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    // Terms check
    if (!acceptTerms) {
      setErrorMsg('You must accept the Terms & Conditions.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.register({
        email,
        password,
        full_name: fullName,
        company_name: companyName,
        phone_number: phone,
      });
      onLoginSuccess(res.access_token, res.user);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Form Side */}
      <div className="auth-form-side" style={{ padding: '24px' }}>
        <div className="glass-panel fade-in" style={{
          width: '100%',
          maxWidth: '460px',
          padding: '32px 30px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Brand */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: 'var(--primary-gradient)',
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}>
              <ShieldCheck size={24} color="#fff" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.2
              }}>
                Create An Account
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Join the AI Contract Management System
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '16px',
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'flex', gap: '14px' }}>
              {/* Full Name */}
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="fullName">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }} />
                  <input
                    id="fullName"
                    type="text"
                    className="input-field"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '40px', paddingTop: '10px', paddingBottom: '10px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Company Name */}
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="companyName">Company</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} color="var(--text-muted)" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }} />
                  <input
                    id="companyName"
                    type="text"
                    className="input-field"
                    placeholder="Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{ paddingLeft: '40px', paddingTop: '10px', paddingBottom: '10px' }}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }} />
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px', paddingTop: '10px', paddingBottom: '10px' }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="phone">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-muted)" style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }} />
                <input
                  id="phone"
                  type="tel"
                  className="input-field"
                  placeholder="+91 99999 88888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ paddingLeft: '40px', paddingTop: '10px', paddingBottom: '10px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px' }}>
              {/* Password */}
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Min 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '10px', paddingBottom: '10px' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="confirmPassword">Confirm</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }} />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Re-enter"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '40px', paddingTop: '10px', paddingBottom: '10px' }}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
              <input
                id="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{
                  marginTop: '3px',
                  width: '15px',
                  height: '15px',
                  accentColor: 'var(--primary)',
                  cursor: 'pointer',
                }}
              />
              <label htmlFor="terms" style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
                lineHeight: '1.4',
                fontWeight: 500
              }}>
                I agree to the Terms of Service & Privacy Policy.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', display: 'flex', gap: '10px', height: '44px', marginTop: '6px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Visual Side */}
      <div className="auth-visual-side">
        <img 
          src="/contract_security_illustration.png" 
          alt="AI Smart Contract Security" 
          className="glow-animation"
          style={{
            width: '100%',
            maxWidth: '460px',
            objectFit: 'contain',
            zIndex: 2,
            marginBottom: '10px',
          }} 
        />
        <div className="auth-visual-card">
          <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 800, marginBottom: '8px' }}>
            AI-Powered Contract Auditing
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            Automate data extraction, verify critical compliance guidelines, check duplicate files instantly, and trigger Expiring-Soon alerts before deadlines.
          </p>
        </div>
      </div>

      <style>{`
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
