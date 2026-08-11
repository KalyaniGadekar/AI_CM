import React, { useState } from 'react';
import { Mail, ShieldCheck, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

interface ForgotPasswordProps {
  onNavigate: (path: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.detail || 'Password reset instructions have been sent to your email.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'No account found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'var(--bg-gradient)'
    }}>
      <div className="glass-panel fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px 32px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/login')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px',
            marginBottom: '28px',
            transition: 'var(--transition-fast)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>

        {/* Brand */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
        }}>
          <div style={{
            background: 'var(--primary-gradient)',
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.2
            }}>
              Reset Password
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Enter your email to receive recovery instructions.
            </p>
          </div>
        </div>

        {/* Success Message */}
        {successMsg ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '24px 16px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--success)',
            textAlign: 'center',
            marginBottom: '20px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <CheckCircle2 size={36} />
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Instructions Sent</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: '1.4' }}>{successMsg}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Error Message */}
            {errorMsg && (
              <div style={{
                padding: '12px 16px',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '20px',
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--text-muted)" style={{
                    position: 'absolute',
                    left: '16px',
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
                    style={{ paddingLeft: '48px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', display: 'flex', gap: '10px', height: '48px' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin-icon" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          </>
        )}
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
