import axios from 'axios';

const api = axios.create({
  // In development this is proxied by Vite to the backend (/api -> localhost:3001).
  // In production, either use a Vercel rewrite (/api -> backend) or point
  // VITE_API_URL directly at the deployed API.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize the envelope error object so existing pages
    // that read err.response.data.error as a string still work.
    const apiErr = error.response?.data?.error;
    if (apiErr && typeof apiErr === 'object') {
      error.response.data.error = apiErr.message || 'An error occurred.';
    }

    if (error.response?.status === 401) {
      // Auto-redirect on an expired/invalid session — but never for the auth
      // probe itself (the landing page must stay reachable while logged out;
      // AuthLayout/AppLayout handle auth navigation reactively).
      const isAuthProbe = String(error.config?.url || '').includes('/auth/me');
      if (!isAuthProbe && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
