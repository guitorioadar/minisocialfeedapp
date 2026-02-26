import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from '../lib/queryClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request Config:', config);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isLoggingOut = false;

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('Response:', response);
    return response;
  },
  async (error: AxiosError<any>) => {
    const requestUrl = error.config?.url || '';

    // Skip auto-logout for auth endpoints to prevent recursive loops
    const isAuthEndpoint = requestUrl.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint && !isLoggingOut) {
      isLoggingOut = true;
      try {
        // Clear all local state without calling the logout API
        await useAuthStore.getState().clearLocalAuth();
        queryClient.clear();
      } finally {
        isLoggingOut = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiError {
  success: false;
  message: string;
  errors?: any[];
}

export const isApiError = (error: any): error is AxiosError<ApiError> => {
  return error.response?.data?.success === false;
};
