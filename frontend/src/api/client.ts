const BASE_URL = 'http://127.0.0.1:8000/api';

export interface Contract {
  id: number;
  filename: string | null;
  file_path: string | null;
  file_hash: string | null;
  employer_name: string;
  client_name: string;
  company_name: string;
  start_date: string;
  end_date: string;
  upload_type: 'UPLOAD' | 'MANUAL';
  created_at: string;
  days_until_expiry: number;
  status: 'active' | 'expiring_soon' | 'expired';
  client_email?: string | null;
  summary?: string | null;
  notification_status?: boolean;
  notification_sent_at?: string | null;
}

export interface AuditLog {
  id: number;
  action: string;
  details: string;
  timestamp: string;
}

export interface KPIs {
  total_contracts: number;
  expiring_soon: number;
  active_contracts: number;
}

export interface SearchResult {
  contract: Contract;
  score: number;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  company_name: string;
  phone_number: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const getHeaders = (contentType?: string) => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      // Clear token and user session on authorization failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Auto redirect to login page if currently on a protected route
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/forgot-password') {
        window.location.href = '/login';
      }
    }
    
    let errorDetail = 'An error occurred';
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  register: async (userIn: Omit<User, 'id' | 'created_at'> & { password: string }): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userIn),
    });
    return handleResponse<AuthResponse>(res);
  },

  forgotPassword: async (email: string): Promise<{ detail: string }> => {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ detail: string }>(res);
  },

  // Contracts
  getContracts: async (): Promise<Contract[]> => {
    const res = await fetch(`${BASE_URL}/contracts`, {
      headers: getHeaders(),
    });
    return handleResponse<Contract[]>(res);
  },

  uploadContract: async (file: File, employerName?: string, clientName?: string, clientEmail?: string): Promise<Contract> => {
    const formData = new FormData();
    formData.append('file', file);
    if (employerName) {
      formData.append('employer_name', employerName);
    }
    if (clientName) {
      formData.append('client_name', clientName);
    }
    if (clientEmail) {
      formData.append('client_email', clientEmail);
    }
    const res = await fetch(`${BASE_URL}/contracts/upload`, {
      method: 'POST',
      headers: getHeaders(), // Let the browser set Content-Type with boundary for FormData
      body: formData,
    });
    return handleResponse<Contract>(res);
  },

  createManualContract: async (contract: Omit<Contract, 'id' | 'filename' | 'file_path' | 'file_hash' | 'upload_type' | 'created_at' | 'days_until_expiry' | 'status'>): Promise<Contract> => {
    const res = await fetch(`${BASE_URL}/contracts/manual`, {
      method: 'POST',
      headers: getHeaders('application/json'),
      body: JSON.stringify(contract),
    });
    return handleResponse<Contract>(res);
  },

  deleteContract: async (id: number): Promise<{ detail: string }> => {
    const res = await fetch(`${BASE_URL}/contracts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ detail: string }>(res);
  },

  sendExpiryNotification: async (id: number): Promise<Contract> => {
    const res = await fetch(`${BASE_URL}/contracts/${id}/send-expiry-notification`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<Contract>(res);
  },

  searchContracts: async (query: string): Promise<SearchResult[]> => {
    const res = await fetch(`${BASE_URL}/contracts/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    return handleResponse<SearchResult[]>(res);
  },

  getKPIs: async (): Promise<KPIs> => {
    const res = await fetch(`${BASE_URL}/kpis`, {
      headers: getHeaders(),
    });
    return handleResponse<KPIs>(res);
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${BASE_URL}/audit-logs`, {
      headers: getHeaders(),
    });
    return handleResponse<AuditLog[]>(res);
  },
};
