import { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  X,
  BellRing
} from 'lucide-react';
import { api, type Contract, type KPIs, type AuditLog } from './api/client';
import { DashboardLayout } from './components/DashboardLayout';
import { UploadDashboard } from './components/UploadDashboard';
import { FillDashboard } from './components/FillDashboard';
import { AlertsDashboard } from './components/AlertsDashboard';
import { AuditLogsDashboard } from './components/AuditLogsDashboard';

// Authentication Pages
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [currentTab, setCurrentTab] = useState('upload');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [kpis, setKPIs] = useState<KPIs>({ total_contracts: 0, expiring_soon: 0, active_contracts: 0 });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Persistent notification dismiss states
  const [showWarningBanner, setShowWarningBanner] = useState(true);

  // Router functions
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Access Control & Auto-Redirect
  useEffect(() => {
    const publicPaths = ['/login', '/register', '/forgot-password'];
    const isPublic = publicPaths.includes(currentPath);

    if (!token && !isPublic) {
      // Direct unauthenticated users to Login
      navigateTo('/login');
    } else if (token && isPublic) {
      // Direct authenticated users away from Login/Register to Dashboard
      navigateTo('/');
    }
  }, [currentPath, token]);

  const handleLoginSuccess = (newToken: string, loggedInUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setToken(newToken);
    navigateTo('/');
  };

  const loadData = async () => {
    if (!token) return;
    try {
      const [contractsRes, kpisRes, logsRes] = await Promise.all([
        api.getContracts(),
        api.getKPIs(),
        api.getAuditLogs(),
      ]);
      setContracts(contractsRes);
      setKPIs(kpisRes);
      setAuditLogs(logsRes);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Silence network error warnings for token failure since handleResponse intercepts it
      if (err.message !== 'Invalid or expired authentication token') {
        setErrorMsg('Could not connect to the backend server. Make sure it is running on port 8000.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadData();
    
    // Poll the backend database every 10 seconds for live updates
    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  // Check if warning banner needs to be shown based on expiring soon count
  const expiringContracts = contracts.filter(c => c.status === 'expiring_soon');
  const hasExpiringContracts = expiringContracts.length > 0;

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    // Reset banner show if switching to alerts tab
    if (tab === 'alerts') {
      setShowWarningBanner(false);
    }
  };

  const renderDashboardContent = () => {
    switch (currentTab) {
      case 'upload':
        return (
          <UploadDashboard 
            contracts={contracts} 
            kpis={kpis} 
            onRefresh={loadData} 
          />
        );
      case 'fill':
        return (
          <FillDashboard 
            contracts={contracts} 
            onRefresh={loadData} 
          />
        );
      case 'alerts':
        return (
          <AlertsDashboard 
            contracts={contracts} 
            onRefresh={loadData} 
          />
        );
      case 'audit':
        return (
          <AuditLogsDashboard 
            logs={auditLogs} 
          />
        );
      default:
        return <div>View not found.</div>;
    }
  };

  // Render Authentication pages if unauthenticated and matching route
  const publicPaths = ['/login', '/register', '/forgot-password'];
  if (!token && publicPaths.includes(currentPath)) {
    if (currentPath === '/register') {
      return <Register onLoginSuccess={handleLoginSuccess} onNavigate={navigateTo} />;
    } else if (currentPath === '/forgot-password') {
      return <ForgotPassword onNavigate={navigateTo} />;
    } else {
      return <Login onLoginSuccess={handleLoginSuccess} onNavigate={navigateTo} />;
    }
  }

  // Render redirecting screen if waiting for redirect effect to execute
  if (!token) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        color: 'var(--text-secondary)'
      }}>
        <span>Redirecting...</span>
      </div>
    );
  }

  return (
    <DashboardLayout 
      currentTab={currentTab} 
      setCurrentTab={handleTabChange} 
      expiringCount={kpis.expiring_soon}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Global Connection Error Alert */}
        {errorMsg && (
          <div style={{
            padding: '16px 20px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertTriangle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Critical Deadline Notification Pop-up Banner */}
        {hasExpiringContracts && showWarningBanner && !isLoading && (
          <div className="glow-animation" style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            borderRadius: 'var(--radius-lg)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 30px rgba(249, 115, 22, 0.3)',
            animation: 'fadeIn 0.5s ease-out',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BellRing size={20} color="#fff" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800 }}>Action Required: Impending Deadlines Detected</h4>
                <p style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '2px', fontWeight: 500 }}>
                  You have <strong>{expiringContracts.length}</strong> contract(s) expiring within the next 5 days. Reach out to the clients immediately!
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button 
                onClick={() => handleTabChange('alerts')}
                style={{
                  background: '#fff',
                  border: 'none',
                  color: '#ea580c',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontFamily: 'var(--font-main)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Review Deadlines
              </button>
              <button 
                onClick={() => setShowWarningBanner(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Main Loading state */}
        {isLoading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            color: 'var(--text-secondary)',
            gap: '16px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99, 102, 241, 0.1)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Synchronizing Dashboard...</span>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          renderDashboardContent()
        )}
      </div>
    </DashboardLayout>
  );
}

export default App;
