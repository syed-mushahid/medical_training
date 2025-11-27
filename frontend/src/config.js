/**
 * Centralized configuration for the application
 * All URLs and API endpoints are configured via environment variables
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://46.224.35.114:5000/api';

// Extract base URL without /api suffix for direct API calls
export const API_BASE_URL_WITHOUT_API = API_BASE_URL.replace(/\/api$/, '');

// Frontend URL (for redirects and links)
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

// RAGFlow Configuration
export const RAGFLOW_BASE_URL = import.meta.env.VITE_RAGFLOW_BASE_URL || 'http://46.224.35.114:80';

// Environment
export const ENV = import.meta.env.MODE || 'development';
export const IS_PRODUCTION = ENV === 'production';
export const IS_DEVELOPMENT = ENV === 'development';

// Helper function to get full API URL
export const getApiUrl = (endpoint = '') => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Helper function to get RAGFlow API URL
export const getRagflowUrl = (endpoint = '') => {
  const base = RAGFLOW_BASE_URL.endsWith('/') ? RAGFLOW_BASE_URL.slice(0, -1) : RAGFLOW_BASE_URL;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default {
  API_BASE_URL,
  API_BASE_URL_WITHOUT_API,
  FRONTEND_URL,
  RAGFLOW_BASE_URL,
  ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  getApiUrl,
  getRagflowUrl,
};



