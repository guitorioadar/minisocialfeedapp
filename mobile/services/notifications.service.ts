import { api } from './api';

interface RegisterTokenData {
  token: string;
}

export const notificationsService = {
  async registerToken(token: string): Promise<void> {
    await api.post('/notifications/register-token', { token });
  },
};
