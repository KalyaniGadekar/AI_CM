import React, { useState } from 'react';
import { 
  Search, 
  History, 
  AlertTriangle,
  FileCheck,
  FilePlus,
  Trash,
  Sparkles,
  HelpCircle,
  Clock
} from 'lucide-react';
import type { AuditLog } from '../api/client';

interface AuditLogsDashboardProps {
  logs: AuditLog[];
}

export const AuditLogsDashboard: React.FC<AuditLogsDashboardProps> = ({ logs }) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredLogs = logs.filter(l => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'UPLOAD_CONTRACT':
        return <FileCheck size={18} color="var(--success)" />;
      case 'CREATE_CONTRACT':
        return <FilePlus size={18} color="#3b82f6" />;
      case 'DELETE_CONTRACT':
        return <Trash size={18} color="var(--danger)" />;
      case 'SEARCH_SEMANTIC':
      case 'SEARCH_CONTRACTS':
        return <Sparkles size={18} color="var(--primary)" />;
      case 'UPLOAD_DUPLICATE_REJECTED':
        return <AlertTriangle size={18} color="var(--warning)" />;
      default:
        return <HelpCircle size={18} color="var(--text-muted)" />;
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'UPLOAD_CONTRACT':
        return 'badge-success';
      case 'CREATE_CONTRACT':
        return 'badge-info';
      case 'DELETE_CONTRACT':
        return 'badge-danger';
      case 'UPLOAD_DUPLICATE_REJECTED':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>System Audit Logs</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Immutable ledger tracking all administrative actions, uploads, metadata modifications, and queries.
        </p>
      </div>

      {/* Filter Options */}
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
            placeholder="Search audit logs by action type or description (e.g. 'delete', 'duplicate')..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </section>

      {/* Audit Logs Timeline */}
      <section className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.35rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
          <div style={{
            background: 'var(--primary-glow)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <History size={18} color="var(--primary)" />
          </div>
          Operation Ledger
        </h3>

        {filteredLogs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', padding: '30px 0' }}>
            No audit log entries found matching filter.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 24px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: '14px',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1 }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    padding: '10px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {getActionIcon(log.action)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.94rem', marginTop: '6px', fontWeight: 700 }}>
                      {log.details}
                    </p>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '0.82rem', 
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}>
                  <Clock size={14} />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
