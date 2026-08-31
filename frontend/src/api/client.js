import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('genhealth_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.access_token) {
        config.headers.Authorization = `Bearer ${parsed.access_token}`;
      } else if (parsed?.id) {
        config.headers.Authorization = `Bearer ${parsed.id}`;
        config.headers['X-User-ID'] = parsed.id;
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return config;
});

export default apiClient;
