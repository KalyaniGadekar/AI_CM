import React, { useState } from 'react';
import { 
  Search, 
  BellRing, 
  CalendarDays, 
  AlertTriangle, 
  CheckCircle,
  Trash2,
  Send
} from 'lucide-react';
import { api, type Contract } from '../api/client';
import { dispatchContractExpiryNotification } from '../utils/emailService';

interface AlertsDashboardProps {
  contracts: Contract[];
  onRefresh: () => void;
}

export const AlertsDashboard: React.FC<AlertsDashboardProps> = ({ 
  contracts, 
  onRefresh 
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [sendingAlerts, setSendingAlerts] = useState<Record<number, boolean>>({});
  const [alertMessage, setAlertMessage] = useState<{ id: number; text: string; type: 'success' | 'error' } | null>(null);

  const handleSendAlert = async (contract: Contract) => {
    setSendingAlerts(prev => ({ ...prev, [contract.id]: true }));
    setAlertMessage(null);
    try {
      await dispatchContractExpiryNotification(contract);
      setAlertMessage({ id: contract.id, text: `✓ Alert email dispatched via EmailJS to ${contract.client_email || 'client'}!`, type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setAlertMessage({ id: contract.id, text: err.message || 'Failed to dispatch EmailJS notification.', type: 'error' });
    } finally {
      setSendingAlerts(prev => ({ ...prev, [contract.id]: false }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    try {
      await api.deleteContract(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter based on query: searches client, employer, company, filename
  const filteredContracts = contracts.filter(c => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.filename && c.filename.toLowerCase().includes(q)) ||
      c.employer_name.toLowerCase().includes(q) ||
      c.client_name.toLowerCase().includes(q) ||
      c.company_name.toLowerCase().includes(q)
    );
  });

  // Sort contracts so expiring soonest appear first
  const sortedContracts = [...filteredContracts].sort((a, b) => a.days_until_expiry - b.days_until_expiry);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Alerts & Notifications Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Track all contract deadlines. Warnings trigger automatically 5 days before expiration.
        </p>
      </div>

      {/* Search Bar for Documents */}
      <section className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search 
            size={20} 
            color="var(--text-muted)" 
            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search deadlines by client, employer, company, or file name..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </section>

      {/* Deadlines Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Critical Alerts Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BellRing size={20} color="var(--warning)" />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Contract Deadlines Timeline</h3>
        </div>

        {sortedContracts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CalendarDays size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No contract deadlines found matching your search.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortedContracts.map((contract) => {
              const isUrgent = contract.status === 'expiring_soon';
              const isExpired = contract.status === 'expired';
              
              let cardBorder = '1px solid var(--glass-border)';
              let iconColor = 'var(--text-muted)';
              let bg = 'var(--glass-bg)';
              let statusLabel = 'Active';
              
              if (isUrgent) {
                cardBorder = '1px solid rgba(245, 158, 11, 0.35)';
                iconColor = 'var(--warning)';
                bg = 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.01) 100%)';
                statusLabel = `WARNING: EXPIRES IN ${contract.days_until_expiry} DAYS`;
              } else if (isExpired) {
                cardBorder = '1px solid rgba(239, 68, 68, 0.35)';
                iconColor = 'var(--danger)';
                bg = 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.01) 100%)';
                statusLabel = 'EXPIRED CONTRACT';
              } else {
                cardBorder = '1px solid var(--glass-border)';
                iconColor = 'var(--success)';
                bg = 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.01) 100%)';
                statusLabel = `ACTIVE: EXPIRES IN ${contract.days_until_expiry} DAYS`;
              }

              return (
                <div 
                  key={contract.id} 
                  className="glass-panel" 
                  style={{
                    padding: '24px 28px',
                    border: cardBorder,
                    background: bg,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Info details */}
                  <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                    <div style={{
                      background: isUrgent ? 'rgba(245, 158, 11, 0.12)' : isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: iconColor,
                      flexShrink: 0,
                      boxShadow: isUrgent ? '0 0 12px rgba(245, 158, 11, 0.2)' : 'none',
                    }}>
                      {isUrgent || isExpired ? <AlertTriangle size={22} className={isUrgent ? "glow-animation" : ""} /> : <CheckCircle size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {contract.client_name}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          ({contract.company_name})
                        </span>
                        <span className={`badge badge-${isUrgent ? 'warning' : isExpired ? 'danger' : 'success'}`}>
                          {statusLabel}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        gap: '20px', 
                        flexWrap: 'wrap', 
                        marginTop: '8px', 
                        fontSize: '0.86rem', 
                        color: 'var(--text-secondary)' 
                      }}>
                        <span>
                          <strong>Employer Rep:</strong> {contract.employer_name}
                        </span>
                        <span>
                          <strong>Source:</strong> {contract.upload_type === 'UPLOAD' ? `File (${contract.filename})` : 'Manual Entry'}
                        </span>
                        <span>
                          <strong>Period:</strong> {contract.start_date} to {contract.end_date}
                        </span>
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        gap: '20px', 
                        flexWrap: 'wrap', 
                        marginTop: '6px', 
                        fontSize: '0.86rem', 
                        color: 'var(--text-secondary)',
                        alignItems: 'center'
                      }}>
                        <span>
                          <strong>Client Email:</strong> {contract.client_email || <em style={{ opacity: 0.5 }}>None</em>}
                        </span>
                        <span>
                          <strong>Notification:</strong> {contract.notification_status ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                              Alert Sent {contract.notification_sent_at ? `(${new Date(contract.notification_sent_at).toLocaleDateString()})` : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                          )}
                        </span>
                      </div>

                      {alertMessage && alertMessage.id === contract.id && (
                        <div style={{
                          marginTop: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: alertMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                          border: `1px solid ${alertMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                          color: alertMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          animation: 'fadeIn 0.2s ease-out'
                        }}>
                          {alertMessage.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Days remaining badge or actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Expiry Date
                      </span>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: iconColor, fontFamily: 'var(--font-accent)', marginTop: '2px' }}>
                        {contract.end_date}
                      </h4>
                    </div>

                    {isUrgent && (
                      <button
                        onClick={() => handleSendAlert(contract)}
                        disabled={sendingAlerts[contract.id]}
                        title="Simulate Expiry Email Alert"
                        style={{
                          background: contract.notification_status ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                          border: contract.notification_status ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(99, 102, 241, 0.2)',
                          color: contract.notification_status ? 'var(--success)' : 'var(--primary)',
                          cursor: 'pointer',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}
                        onMouseEnter={(e) => {
                          if (!contract.notification_status) {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!contract.notification_status) {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                            e.currentTarget.style.color = 'var(--primary)';
                          }
                        }}
                      >
                        <Send size={14} />
                        {sendingAlerts[contract.id] ? 'Sending...' : contract.notification_status ? 'Resend Alert' : 'Send Alert'}
                      </button>
                    )}

                    <button 
                      onClick={() => handleDelete(contract.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--danger)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};
