import apiClient from './client';

/**
 * Register a new user account.
 * @param {{ email: string, password: string, full_name: string }} payload
 * @returns {Promise<{ id: string, email: string, full_name: string, role: string, created_at: string }>}
 */
export async function signupUser(payload) {
  const response = await apiClient.post('/api/v1/auth/signup', payload);
  return response.data;
}

/**
 * Authenticate existing user by email and password.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ id: string, email: string, full_name: string, role: string, created_at: string }>}
 */
export async function loginUser(payload) {
  const response = await apiClient.post('/api/v1/auth/login', payload);
  return response.data;
}
