import axios, { AxiosError } from 'axios';
import type { AppError, AppErrorResponse } from '../types/api';

const apiBase = 
  (import.meta.env.VITE_API_URL as string) || 
  (import.meta.env.VITE_API_BASE_URL as string) || 
  'http://localhost:8000';

const apiClient = axios.create({
  baseURL: apiBase,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let appError: AppError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.'
    };

    if (error.response && error.response.data) {
      const data = error.response.data as any;
      if (data.error) {
        appError = {
          code: data.error.code || 'INTERNAL_ERROR',
          message: data.error.message || 'An unexpected error occurred.',
          details: data.error.details
        };
      } else if (data.detail && typeof data.detail === 'string') {
        appError = {
          code: 'CLIENT_ERROR',
          message: data.detail
        };
      } else if (data.message && typeof data.message === 'string') {
        appError = {
          code: 'CLIENT_ERROR',
          message: data.message
        };
      }
    } else if (error.request) {
      appError = {
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Please check your connection and try again.'
      };
    } else {
      appError = {
        code: 'CLIENT_ERROR',
        message: error.message || 'A client-side error occurred.'
      };
    }

    return Promise.reject(appError);
  }
);

export default apiClient;
export { AxiosError };
