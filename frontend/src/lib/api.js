import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No token found in localStorage');
  }
  
  // Don't set Content-Type for multipart/form-data - let axios handle it
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url
    });
    
    // Only redirect on actual authentication errors (401), not on other errors
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      const currentPath = window.location.pathname;
      // Only redirect if not already on login page
      if (currentPath !== '/login') {
        console.log('Token invalid, redirecting to login');
        localStorage.removeItem('token');
        // Use setTimeout to avoid redirect during render
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    // Don't redirect on 403 or other errors - let the component handle it
    return Promise.reject(error);
  }
);

export default api;

