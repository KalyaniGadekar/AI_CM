import React, { useState, useRef } from 'react';
import { 
  Search, 
  Upload, 
  Sparkles, 
  FileText, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  FileCheck,
  Clock,
  Briefcase,
  FileEdit,
  ArrowRight,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  Mail,
  Send
} from 'lucide-react';
import { api, type Contract, type KPIs, type SearchResult } from '../api/client';
import { sendBrowserEmailNotification } from '../utils/emailService';

interface UploadDashboardProps {
  contracts: Contract[];
  kpis: KPIs;
  onRefresh: () => void;
}

export const UploadDashboard: React.FC<UploadDashboardProps> = ({ 
  contracts, 
  kpis, 
  onRefresh 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'active'>('all');
  const [hoveredCard, setHoveredCard] = useState<'all' | 'expiring' | 'active' | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const [employerName, setEmployerName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedNotificationContract, setSelectedNotificationContract] = useState<Contract | null>(null);
  const [sendingAlerts, setSendingAlerts] = useState<Record<number, boolean>>({});
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customToEmail, setCustomToEmail] = useState<string>('');

  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const handleViewSummary = (summaryText: string | null | undefined) => {
    setSelectedSummary(summaryText || "No summary available for this contract.");
    setIsSummaryModalOpen(true);
  };

  const handleSelectNotification = (contract: Contract) => {
    setSelectedNotificationContract(contract);
    setCustomToEmail(contract.client_email || '');
    setNotificationStatus(null);
  };

  const [manualEmployer, setManualEmployer] = useState('');
  const [manualClient, setManualClient] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmployer || !manualClient || !manualCompany || !manualStart || !manualEnd) {
      alert('Please fill in all required fields.');
      return;
    }
    setIsManualSubmitting(true);
    try {
      await api.createManualContract({
        employer_name: manualEmployer,
        client_name: manualClient,
        company_name: manualCompany,
        start_date: manualStart,
        end_date: manualEnd,
        client_email: manualEmail || null,
        summary: null,
      });
      setManualEmployer('');
      setManualClient('');
      setManualEmail('');
      setManualCompany('');
      setManualStart('');
      setManualEnd('');
      alert('Contract manually registered successfully!');
      onRefresh();
    } catch (err: any) {
      alert('Error registering contract: ' + err.message);
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchContracts(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
      setUploadMessage({ text: 'Search failed', type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!employerName.trim() || !clientName.trim()) {
      setUploadMessage({
        text: 'Please enter both Employer Name and Client Name before uploading a document.',
        type: 'error'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    try {
      const result = await api.uploadContract(file, employerName, clientName, clientEmail || undefined);
      setUploadMessage({
        text: `Success! Indexed contract "${result.filename}" with AI.`,
        type: 'success'
      });
      setEmployerName('');
      setClientName('');
      setClientEmail('');
      onRefresh();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadMessage({
        text: err.message || 'File upload failed.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
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

  const dragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const dragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const dragDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const displayedContracts = contracts.filter(c => {
    if (filter === 'expiring') {
      return c.status === 'expiring_soon';
    }
    if (filter === 'active') {
      return c.status === 'active' || c.status === 'expiring_soon';
    }
    return true; // 'all'
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner with Badges */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: 0
        }}>
          AI Contract Management System – Enhanced Features
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}>
            <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>1</span>
            Clients Email Column
          </span>
          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}>
            <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>2</span>
            Send Notification Column
          </span>
          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}>
            <span style={{ background: '#10b981', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>3</span>
            Summary Column
          </span>
          <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>4</span>
            Client Email Field in Fill Contract
          </span>
        </div>
      </div>

      {/* Main Grid Layout - 2 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '28px',
        alignItems: 'start',
        width: '100%',
      }}>
        
        {/* Left Column - Main Dashboard Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* 1. TOP SEMANTIC SEARCH OPTION */}
          <section className="glass-panel" style={{ padding: '24px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '14px' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Search 
                  size={20} 
                  color="var(--text-muted)" 
                  style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter keywords, deadlines, clauses, or clients (e.g. 'Contracts ending soon')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '52px', background: 'var(--input-bg)' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSearching}>
                <Sparkles size={18} />
                {isSearching ? 'Searching...' : 'Semantic Search'}
              </button>
              {searchResults !== null && (
                <button type="button" className="btn btn-secondary" onClick={handleClearSearch}>
                  Clear
                </button>
              )}
            </form>

            {/* Search Results Display */}
            {searchResults !== null && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <Sparkles size={18} color="var(--primary)" />
                  Search Results
                </h3>
                {searchResults.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No matching documents or content found.</p>
                ) : (
                  <div className="custom-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          <th>Filename / Source</th>
                          <th>Client Name</th>
                          <th>Client Email</th>
                          <th>Company</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Relevance Score</th>
                          <th>Summary</th>
                          <th>Send Notification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map(({ contract, score }) => (
                          <React.Fragment key={contract.id}>
                            <tr>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => toggleRow(contract.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'var(--transition-fast)'
                                  }}
                                >
                                  {expandedRowIds[contract.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={16} color="var(--primary)" />
                                  <span style={{ fontWeight: 600 }}>{contract.filename || 'Manual Entry'}</span>
                                </div>
                              </td>
                              <td>{contract.client_name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{contract.client_email || <em style={{ opacity: 0.5 }}>None</em>}</td>
                              <td>{contract.company_name}</td>
                              <td>{contract.start_date}</td>
                              <td>{contract.end_date}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ 
                                    width: '60px', 
                                    background: 'rgba(99,102,241,0.08)', 
                                    height: '6px', 
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{ 
                                      width: `${score * 100}%`, 
                                      background: 'var(--primary)', 
                                      height: '100%' 
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    {(score * 100).toFixed(0)}%
                                  </span>
                                </div>
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
                                  onClick={() => handleSelectNotification(contract)}
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
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--sidebar-active-text)';
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--primary)';
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <Send size={14} />
                                </button>
                              </td>
                            </tr>
                            {expandedRowIds[contract.id] && (
                              <tr style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
                                <td colSpan={10} style={{ padding: '16px 20px' }}>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '20px',
                                    animation: 'fadeIn 0.2s ease-out'
                                  }}>
                                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--glass-border)' }}>
                                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
                                        <Sparkles size={14} />
                                        AI Contract Summary
                                      </h4>
                                      <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-primary)', margin: 0 }}>
                                        {contract.summary || <em style={{ opacity: 0.5 }}>No summary generated yet.</em>}
                                      </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                      <div>
                                        <strong style={{ color: 'var(--text-muted)' }}>Client Email:</strong>
                                        <span style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>
                                          {contract.client_email || <em style={{ opacity: 0.5 }}>No email</em>}
                                        </span>
                                      </div>
                                      <div>
                                        <strong style={{ color: 'var(--text-muted)' }}>Notification Status:</strong>
                                        <span style={{ marginLeft: '6px' }}>
                                          {contract.notification_status ? (
                                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Sent</span>
                                          ) : (
                                            <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. UPLOAD FILES SECTION (DUPLICATE DETECTION & ERROR LOGGING) */}
          <section className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} color="var(--primary)" />
              Upload Contracts
            </h3>

            {/* Manual inputs to override extraction */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}>
              {/* Employer Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Employer Name (Required)</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter Employer / Disclosing Party"
                    value={employerName}
                    onChange={(e) => setEmployerName(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                  />
                </div>
              </div>

              {/* Client Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Client Name (Required)</label>
                <div style={{ position: 'relative' }}>
                  <Users size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter Client / Contractor Name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                  />
                </div>
              </div>

              {/* Client Email */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Client Email</label>
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
            </div>
            
            <div 
              onDragOver={dragOver}
              onDragLeave={dragLeave}
              onDrop={dragDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragActive ? '2.5px dashed var(--primary)' : '2px dashed var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(0, 0, 0, 0.08)',
                transform: isDragActive ? 'scale(1.005)' : 'scale(1)',
                boxShadow: isDragActive ? 'var(--shadow-lg)' : 'none',
                transition: 'var(--transition-smooth)',
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.txt,.docx" 
                style={{ display: 'none' }} 
              />
              <div style={{
                background: isDragActive ? 'var(--primary-gradient)' : 'rgba(99, 102, 241, 0.08)',
                boxShadow: isDragActive ? '0 8px 20px rgba(99, 102, 241, 0.3)' : 'none',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px auto',
                transition: 'var(--transition-smooth)',
              }}>
                <Upload size={28} color={isDragActive ? '#fff' : 'var(--primary)'} />
              </div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                {isUploading ? 'Extracting text and scanning duplicate hashes...' : 'Drag & Drop Contract File'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto' }}>
                Supports PDF, TXT, and DOCX files. System automatically blocks duplicate uploads.
              </p>
            </div>

            {uploadMessage && (
              <div style={{
                marginTop: '20px',
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                background: uploadMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${uploadMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                color: uploadMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.92rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                {uploadMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{uploadMessage.text}</span>
              </div>
            )}
          </section>

          {/* 3. KEY PERFORMANCE INDICATORS (KPIs) */}
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
          }}>
            {/* Total Files Uploaded */}
            <div 
              className="glass-panel" 
              onClick={() => setFilter('all')}
              onMouseEnter={() => setHoveredCard('all')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ 
                padding: '28px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                cursor: 'pointer',
                transform: hoveredCard === 'all' ? 'translateY(-6px)' : 'translateY(0)',
                border: filter === 'all'
                  ? '1.5px solid #6366f1' 
                  : hoveredCard === 'all' ? '1.5px solid rgba(99, 102, 241, 0.6)' : '1px solid var(--glass-border)',
                boxShadow: filter === 'all'
                  ? '0 10px 24px rgba(99, 102, 241, 0.35)' 
                  : hoveredCard === 'all' ? '0 12px 24px rgba(99, 102, 241, 0.15)' : 'var(--glass-glow)',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              }}
            >
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
              }}>
                <FileCheck size={26} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700 }}>Total Uploaded Files</span>
                <h3 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '2px', color: '#ffffff', fontFamily: 'var(--font-accent)' }}>
                  {kpis.total_contracts}
                </h3>
              </div>
            </div>

            {/* Number of Files Expiring Soon */}
            <div 
              className="glass-panel" 
              onClick={() => setFilter('expiring')}
              onMouseEnter={() => setHoveredCard('expiring')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ 
                padding: '28px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                cursor: 'pointer',
                transform: hoveredCard === 'expiring' ? 'translateY(-6px)' : 'translateY(0)',
                border: filter === 'expiring'
                  ? '1.5px solid #ec4899' 
                  : hoveredCard === 'expiring' ? '1.5px solid rgba(236, 72, 153, 0.6)' : '1px solid var(--glass-border)',
                boxShadow: filter === 'expiring'
                  ? '0 10px 24px rgba(236, 72, 153, 0.35)' 
                  : hoveredCard === 'expiring' ? '0 12px 24px rgba(236, 72, 153, 0.15)' : 'var(--glass-glow)',
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
              }}
            >
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
              }}>
                <Clock size={26} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700 }}>Expiring (≤5 Days)</span>
                <h3 style={{ 
                  fontSize: '2.2rem', 
                  fontWeight: 800, 
                  marginTop: '2px', 
                  color: '#ffffff',
                  fontFamily: 'var(--font-accent)' 
                }}>
                  {kpis.expiring_soon}
                </h3>
              </div>
            </div>

            {/* Active Contracts */}
            <div 
              className="glass-panel" 
              onClick={() => setFilter('active')}
              onMouseEnter={() => setHoveredCard('active')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ 
                padding: '28px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                cursor: 'pointer',
                transform: hoveredCard === 'active' ? 'translateY(-6px)' : 'translateY(0)',
                border: filter === 'active'
                  ? '1.5px solid #06b6d4' 
                  : hoveredCard === 'active' ? '1.5px solid rgba(6, 182, 212, 0.6)' : '1px solid var(--glass-border)',
                boxShadow: filter === 'active'
                  ? '0 10px 24px rgba(6, 182, 212, 0.35)' 
                  : hoveredCard === 'active' ? '0 12px 24px rgba(6, 182, 212, 0.15)' : 'var(--glass-glow)',
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              }}
            >
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
              }}>
                <Briefcase size={26} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700 }}>Active Contracts</span>
                <h3 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '2px', color: '#ffffff', fontFamily: 'var(--font-accent)' }}>
                  {kpis.active_contracts}
                </h3>
              </div>
            </div>
          </section>

          {/* 4. RECENTLY UPLOADED FILES */}
          <section className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  {filter === 'all' && 'All Registered Contracts'}
                  {filter === 'expiring' && 'Expiring Contracts (≤5 Days)'}
                  {filter === 'active' && 'Active Contracts'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Showing {displayedContracts.length} records
                </p>
              </div>
              {filter !== 'all' && (
                <button 
                  onClick={() => setFilter('all')}
                  style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    color: 'var(--primary)',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
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
                  Clear Filter <ArrowRight size={14} />
                </button>
              )}
            </div>
            
            {displayedContracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  {filter === 'expiring' ? 'No expiring contracts found.' : 
                   filter === 'active' ? 'No active contracts found.' : 
                   'No contract files found.'}
                </p>
              </div>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Filename</th>
                      <th>Employer</th>
                      <th>Client</th>
                      <th>Client Email</th>
                      <th>Company Reference</th>
                      <th>Start Date</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Summary</th>
                      <th>Send Notification</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedContracts.map((contract) => (
                      <React.Fragment key={contract.id}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleRow(contract.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'var(--transition-fast)'
                              }}
                            >
                              {expandedRowIds[contract.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {contract.filename ? (
                                <FileText size={18} color="var(--text-secondary)" />
                              ) : (
                                <FileEdit size={18} color="var(--primary)" />
                              )}
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {contract.filename || 'Manual Entry'}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{contract.employer_name}</td>
                          <td>{contract.client_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{contract.client_email || <em style={{ opacity: 0.5 }}>None</em>}</td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{contract.company_name}</td>
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
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
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
                              onClick={() => handleSelectNotification(contract)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                padding: '6px',
                                borderRadius: '8px',
                                transition: 'var(--transition-fast)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--sidebar-active-text)';
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--primary)';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Send size={16} />
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
                        {expandedRowIds[contract.id] && (
                          <tr style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
                            <td colSpan={12} style={{ padding: '20px 28px' }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '24px',
                                animation: 'fadeIn 0.25s ease-out'
                              }}>
                                {/* AI Summary */}
                                <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--glass-border)' }}>
                                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px' }}>
                                    <Sparkles size={16} />
                                    AI Contract Summary
                                  </h4>
                                  <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
                                    {contract.summary || <em style={{ opacity: 0.5 }}>No summary generated yet.</em>}
                                  </p>
                                </div>

                                {/* Details and Metadata */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Client Email:</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                      {contract.client_email || <em style={{ opacity: 0.5 }}>No email recorded</em>}
                                    </span>

                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Notification Status:</span>
                                    <span>
                                      {contract.notification_status ? (
                                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                                          Alert Sent {contract.notification_sent_at ? `(${new Date(contract.notification_sent_at).toLocaleDateString()})` : ''}
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Pending</span>
                                      )}
                                    </span>

                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Upload Type:</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{contract.upload_type}</span>

                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Record Created:</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{new Date(contract.created_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar Column - Sticky Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'sticky', top: '24px' }}>
          
          {/* FILL CONTRACT (ENHANCED) form */}
          <div className="glass-panel" style={{ padding: '24px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ 
              fontSize: '1.15rem', 
              marginBottom: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--text-primary)',
              fontWeight: 800
            }}>
              <FileEdit size={18} color="var(--primary)" />
              Fill Contract (Enhanced)
            </h3>
            
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Employer Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Employer representative"
                  value={manualEmployer}
                  onChange={(e) => setManualEmployer(e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Client Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Client name"
                  value={manualClient}
                  onChange={(e) => setManualClient(e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Client Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="client@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Company Reference</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Client company"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                    style={{ padding: '10px 10px', fontSize: '0.82rem' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                    style={{ padding: '10px 10px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isManualSubmitting}
                style={{ padding: '10px 20px', fontSize: '0.85rem', width: '100%', justifyContent: 'center', marginTop: '8px' }}
              >
                {isManualSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>

          {/* SEND NOTIFICATION (AUTO MESSAGE) preview card */}
          <div className="glass-panel" style={{ padding: '24px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ 
              fontSize: '1.15rem', 
              marginBottom: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--text-primary)',
              fontWeight: 800
            }}>
              <Send size={18} color="var(--success)" />
              Send Notification (Auto Message)
            </h3>

            {/* Notification Feedback Status Banner */}
            {notificationStatus && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: notificationStatus.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${notificationStatus.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                color: notificationStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '14px',
                animation: 'fadeIn 0.25s ease-out'
              }}>
                {notificationStatus.message}
              </div>
            )}
            
            {(() => {
              const activeContract = selectedNotificationContract || (contracts.length > 0 ? contracts[0] : null);
              const targetEmail = customToEmail || (activeContract?.client_email || '');
              const clientDisplayName = activeContract?.client_name || 'Client';
              const contractDisplayTitle = activeContract?.filename || (activeContract ? `Contract #${activeContract.id} (${activeContract.employer_name} - ${activeContract.client_name})` : 'VENDOR SUPPLY AGREEMENT.docx');
              const expiryDate = activeContract?.end_date || '30-11-2026';
              const daysLeft = activeContract ? activeContract.days_until_expiry : 42;
              const isSending = activeContract ? !!sendingAlerts[activeContract.id] : false;

              const messageBody = `Hello ${clientDisplayName},\n\nThis is a reminder that your contract '${contractDisplayTitle}' will expire on ${expiryDate}.\n\nThere are ${daysLeft} days left for the contract to expire.\n\nRegards,\nAI Contract Management System`;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                      To (Client Email):
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="Enter recipient email (e.g., name@gmail.com)"
                      value={targetEmail}
                      onChange={(e) => setCustomToEmail(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '0.82rem', width: '100%' }}
                    />
                  </div>

                  <div>
                    <strong>Subject:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>Contract Expiry Reminder</span>
                  </div>

                  <div>
                    <strong>Message:</strong>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.15)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      marginTop: '6px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      lineHeight: '1.5',
                      minHeight: '120px',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {messageBody}
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (!targetEmail || !targetEmail.trim()) {
                        setNotificationStatus({
                          type: 'error',
                          message: 'Please provide a recipient email address.'
                        });
                        return;
                      }

                      const contractToSend = activeContract || {
                        id: 0,
                        filename: contractDisplayTitle,
                        file_path: null,
                        file_hash: null,
                        employer_name: 'AI Contract Management',
                        client_name: clientDisplayName,
                        company_name: 'AI Contract Management',
                        start_date: '2026-01-01',
                        end_date: expiryDate,
                        upload_type: 'MANUAL' as const,
                        created_at: new Date().toISOString(),
                        days_until_expiry: daysLeft,
                        status: 'active' as const,
                        client_email: targetEmail.trim(),
                      };

                      if (contractToSend.id) {
                        setSendingAlerts(prev => ({ ...prev, [contractToSend.id]: true }));
                      }
                      setNotificationStatus(null);

                      try {
                        // 1. Dispatch Email via EmailJS browser SDK
                        await sendBrowserEmailNotification({
                          toEmail: targetEmail.trim(),
                          clientName: clientDisplayName,
                          contractTitle: contractDisplayTitle,
                          endDate: expiryDate,
                          daysLeft: daysLeft,
                          message: messageBody,
                          employerName: contractToSend.employer_name,
                          companyName: contractToSend.company_name,
                        });

                        // 2. Sync with backend if contract exists
                        if (contractToSend.id) {
                          try {
                            await api.sendExpiryNotification(contractToSend.id);
                          } catch (bErr) {
                            console.warn('Backend sync warning:', bErr);
                          }
                        }

                        setNotificationStatus({
                          type: 'success',
                          message: `✓ Real email successfully dispatched via EmailJS to ${targetEmail.trim()}!`
                        });
                        setAlertMessage(`Expiry reminder email dispatched via EmailJS to ${targetEmail.trim()}!`);
                        setTimeout(() => setAlertMessage(null), 5000);
                        onRefresh();
                      } catch (err: any) {
                        console.error('EmailJS Send Error:', err);
                        setNotificationStatus({
                          type: 'error',
                          message: `Failed to send email: ${err?.text || err?.message || 'Check EmailJS credentials.'}`
                        });
                      } finally {
                        if (contractToSend.id) {
                          setSendingAlerts(prev => ({ ...prev, [contractToSend.id]: false }));
                        }
                      }
                    }}
                    className="btn"
                    style={{
                      background: 'var(--success)',
                      color: '#fff',
                      padding: '10px 20px',
                      fontSize: '0.85rem',
                      width: '100%',
                      justifyContent: 'center',
                      marginTop: '8px',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      cursor: isSending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isSending ? 0.6 : 1
                    }}
                    disabled={isSending}
                  >
                    <Send size={14} />
                    {isSending ? 'Sending via EmailJS...' : 'Send Email'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

      </div>

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
