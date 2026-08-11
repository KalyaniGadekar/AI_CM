import React from 'react';
import { 
  UploadCloud, 
  FileEdit, 
  Bell, 
  History, 
  ShieldCheck,
  User,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface DashboardLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  expiringCount: number;
  theme: string;
  toggleTheme: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  currentTab, 
  setCurrentTab, 
  expiringCount, 
  theme,
  toggleTheme,
  children 
}) => {
  const user = React.useMemo(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const menuItems = [
    { id: 'upload', label: 'Upload Contract', icon: UploadCloud },
    { id: 'fill', label: 'Fill Contract', icon: FileEdit },
    { 
      id: 'alerts', 
      label: 'Alerts & Notifications', 
      icon: Bell, 
      badge: expiringCount > 0 ? expiringCount : undefined 
    },
    { id: 'audit', label: 'Audit Logs', icon: History },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)' }}>
      {/* Sidebar - Customized Yellow Shading */}
      <aside style={{
        width: '280px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        padding: '36px 20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Brand Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '44px',
          padding: '0 8px',
        }}>
          <div style={{
            background: 'var(--primary-gradient)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
          }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--sidebar-text-primary)',
              lineHeight: '1.2',
            }}>
              AI Contract
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--sidebar-text-secondary)', fontWeight: 600 }}>
              Management System
            </span>
          </div>
        </div>

        {/* Menu Options */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                  padding: '14px 18px',
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid var(--sidebar-active-text)' : '3px solid transparent',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.92rem',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)',
                  position: 'relative',
                  paddingLeft: isActive ? '16px' : '18px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(79, 70, 229, 0.04)';
                    e.currentTarget.style.color = 'var(--sidebar-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-text-secondary)';
                  }
                }}
              >
                <Icon 
                  size={20} 
                  color={isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-secondary)'} 
                  style={{ transition: 'color 0.2s' }}
                />
                <span style={{ flexGrow: 1 }}>{item.label}</span>
                
                {item.badge !== undefined && (
                  <span style={{
                    background: 'var(--danger)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '8px',
                    minWidth: '18px',
                    textAlign: 'center',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                    animation: 'pulse-glow 2s infinite',
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Decorative Document Illustration inside Sidebar */}
        <div style={{
          padding: '12px',
          background: 'var(--sidebar-card-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--sidebar-border)',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'center',
        }}>
          <img 
            src="/sidebar_document_illustration.png" 
            alt="Documents graphic illustration" 
            style={{
              width: '100%',
              maxHeight: '76px',
              objectFit: 'contain',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            color: 'var(--sidebar-text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Smart Document AI
          </span>
        </div>

        {/* Theme Toggle Button */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--sidebar-card-bg)',
          border: '1px solid var(--sidebar-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'var(--transition-smooth)',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sidebar-text-secondary)' }}>
            Theme Mode
          </span>
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--toggle-track)',
              border: 'none',
              borderRadius: '9999px',
              width: '58px',
              height: '30px',
              padding: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              transition: 'var(--transition-smooth)',
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              background: 'var(--toggle-thumb)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
              transform: theme === 'light' ? 'translateX(28px)' : 'translateX(0)',
              transition: 'var(--transition-smooth)',
              color: theme === 'light' ? '#ffe399' : '#1e293b',
            }}>
              {theme === 'light' ? <Sun size={13} strokeWidth={2.5} /> : <Moon size={13} strokeWidth={2.5} />}
            </div>
          </button>
        </div>

        {/* User profile & Logout */}
        {user && (
          <div style={{
            padding: '14px',
            background: 'var(--sidebar-card-bg)',
            border: '1px solid var(--sidebar-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'var(--transition-smooth)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.3)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--sidebar-border)',
                color: 'var(--sidebar-text-primary)',
              }}>
                <User size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--sidebar-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {user.full_name}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--sidebar-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {user.company_name}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '9px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-sm)',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-main)',
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Footer/System Info */}
        <div style={{
          padding: '16px',
          background: 'var(--sidebar-card-bg)',
          border: '1px solid var(--sidebar-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--sidebar-text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)',
            }} />
            <span style={{ color: 'var(--sidebar-text-primary)', fontWeight: 700 }}>System Online</span>
          </div>
          <span>v1.0.0 (FastAPI + SQLite)</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        marginLeft: '280px',
        flexGrow: 1,
        padding: '40px 48px',
        minHeight: '100vh',
        width: 'calc(100% - 280px)',
        transition: 'var(--transition-smooth)',
      }}>
        {children}
      </main>
    </div>
  );
};
