import { api } from './api';

interface SignupData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  success: true;
  message: string;
  data: {
    user: {
      id: string;
      username: string;
      email: string;
    };
    token: string;
  };
}

export const authService = {
  async signup(data: SignupData): Promise<AuthResponse['data']> {
    const response = await api.post<AuthResponse>('/auth/signup', data);
    return response.data.data;
  },

  async login(data: LoginData): Promise<AuthResponse['data']> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data.data;
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { resetToken, newPassword });
  },
};
