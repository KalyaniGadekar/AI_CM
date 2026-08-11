import React, { useState } from 'react';
import { 
  FileEdit, 
  User, 
  Users, 
  Building2, 
  Calendar, 
  Check, 
  AlertCircle,
  FileText,
  Trash2,
  Mail,
  Sparkles,
  Send,
  CheckCircle
} from 'lucide-react';
import { api, type Contract } from '../api/client';
import { dispatchContractExpiryNotification } from '../utils/emailService';

interface FillDashboardProps {
  contracts: Contract[];
  onRefresh: () => void;
}

export const FillDashboard: React.FC<FillDashboardProps> = ({ 
  contracts, 
  onRefresh 
}) => {
  const [employer, setEmployer] = useState('');
  const [client, setClient] = useState('');
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [summary, setSummary] = useState('');
  
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [sendingAlerts, setSendingAlerts] = useState<Record<number, boolean>>({});

  const handleViewSummary = (summaryText: string | null | undefined) => {
    setSelectedSummary(summaryText || "No summary available for this contract.");
    setIsSummaryModalOpen(true);
  };

  const handleSendNotification = async (contract: Contract) => {
    setSendingAlerts(prev => ({ ...prev, [contract.id]: true }));
    setAlertMessage(null);
    try {
      await dispatchContractExpiryNotification(contract);
      setAlertMessage(`✓ Expiry reminder email dispatched via EmailJS to ${contract.client_email || 'client'}!`);
      setTimeout(() => setAlertMessage(null), 5000);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Failed to send notification: ' + (err.message || 'Check EmailJS setup.'));
    } finally {
      setSendingAlerts(prev => ({ ...prev, [contract.id]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employer || !client || !company || !startDate || !endDate) {
      setStatusMessage({ text: 'Please fill in all form fields.', type: 'error' });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setStatusMessage({ text: 'Contract end date cannot be before start date.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await api.createManualContract({
        employer_name: employer,
        client_name: client,
        company_name: company,
        start_date: startDate,
        end_date: endDate,
        client_email: clientEmail || null,
        summary: summary || null,
      });

      setStatusMessage({ text: 'Contract manually registered and saved successfully.', type: 'success' });
      
      // Clear form
      setEmployer('');
      setClient('');
      setCompany('');
      setStartDate('');
      setEndDate('');
      setClientEmail('');
      setSummary('');
      
      onRefresh();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to save contract.', type: 'error' });
    } finally {
      setIsSubmitting(false);
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

  // Filter manual entries
  const manualContracts = contracts.filter(c => c.upload_type === 'MANUAL');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Fill Contract Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Manually input contract terms to track deadlines and trigger alerts before expiry.
        </p>
      </div>

      {/* Manual Entry Form */}
      <section className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          marginBottom: '28px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          color: 'var(--text-primary)' 
        }}>
          <div style={{
            background: 'var(--primary-glow)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileEdit size={18} color="var(--primary)" />
          </div>
          Contract Details Form
        </h3>

        <form onSubmit={handleSubmit} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {/* Employer Name */}
          <div className="form-group">
            <label>Employer Name (Handling Representative)</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Company Representative Name"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          {/* Client Name */}
          <div className="form-group">
            <label>Client Name</label>
            <div style={{ position: 'relative' }}>
              <Users size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Name of the Client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          {/* Company Name Client Refers To */}
          <div className="form-group">
            <label>Client Company Name</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Company they represent"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label>Contract Start Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="date"
                className="input-field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>



          {/* End Date */}
          <div className="form-group">
            <label>Contract End Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="date"
                className="input-field"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          {/* Client Email */}
          <div className="form-group">
            <label>Client Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                className="input-field"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          {/* Contract Summary / Core Terms */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Contract Summary / Core Terms</label>
            <div style={{ position: 'relative' }}>
              <FileText size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
              <textarea
                className="input-field"
                placeholder="Brief summary of contract terms, payment amounts, deliverables, etc."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                style={{ paddingLeft: '48px', paddingTop: '12px', resize: 'vertical', minHeight: '80px', fontFamily: 'var(--font-main)' }}
              />
            </div>
          </div>

          {/* Submit Button Row */}
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            borderTop: '1px solid var(--glass-border)',
            paddingTop: '24px',
            gap: '16px',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              * Expiry alerts will pop up dynamically 5 days before the End Date.
            </p>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: '180px' }}>
              {isSubmitting ? 'Registering...' : 'Save Contract'}
            </button>
          </div>
        </form>

        {statusMessage && (
          <div style={{
            marginTop: '24px',
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: statusMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${statusMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {statusMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </section>

      {/* Recently Registered Contracts */}
      <section className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.35rem', marginBottom: '20px', color: 'var(--text-primary)', fontWeight: 800 }}>Recently Manually Filled Contracts</h3>
        {manualContracts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '10px 0' }}>No manual contracts registered yet.</p>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employer Representative</th>
                  <th>Client</th>
                  <th>Client Company</th>
                  <th>Client Email</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th>Send Notification</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {manualContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="var(--text-secondary)" />
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{contract.employer_name}</span>
                      </div>
                    </td>
                    <td>{contract.client_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{contract.company_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{contract.client_email || <em style={{ opacity: 0.5 }}>None</em>}</td>
                    <td style={{ fontFamily: 'var(--font-accent)' }}>{contract.start_date}</td>
                    <td style={{ fontFamily: 'var(--font-accent)', fontWeight: 600 }}>{contract.end_date}</td>
                    <td>
                      <span className={`badge badge-${
                        contract.status === 'expired' ? 'danger' :
                        contract.status === 'expiring_soon' ? 'warning' : 'success'
                      }`}>
                        {contract.status === 'expired' ? 'Expired' :
                         contract.status === 'expiring_soon' ? 'Expiring' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewSummary(contract.summary)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary)';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }}
                      >
                        View Summary
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleSendNotification(contract)}
                        disabled={sendingAlerts[contract.id]}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--primary)',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'var(--transition-fast)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: sendingAlerts[contract.id] ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!sendingAlerts[contract.id]) {
                            e.currentTarget.style.color = 'var(--sidebar-active-text)';
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--primary)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Send size={14} />
                      </button>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDelete(contract.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '6px',
                          borderRadius: '8px',
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--danger)';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* View Summary Modal popup */}
      {isSummaryModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '540px',
            padding: '32px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-glow)',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsSummaryModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              &times;
            </button>
            <h3 style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--primary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={20} />
              Contract Summary
            </h3>
            <p style={{
              fontSize: '0.95rem',
              lineHeight: '1.6',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line'
            }}>
              {selectedSummary || "No summary generated for this contract."}
            </p>
            <div style={{
              marginTop: '28px',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert toast for notification feedback */}
      {alertMessage && (
        <div className="slide-in-right" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          color: 'var(--success)',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1100,
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          <CheckCircle size={20} />
          <span>{alertMessage}</span>
        </div>
      )}

    </div>
  );
};
