import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_token';
const USER_KEY = 'user_data';
const REMEMBERED_EMAIL_KEY = 'remembered_email';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async getUser(): Promise<string | null> {
    return await SecureStore.getItemAsync(USER_KEY);
  },

  async setUser(user: string): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, user);
  },

  async removeUser(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  async getRememberedEmail(): Promise<string | null> {
    return await SecureStore.getItemAsync(REMEMBERED_EMAIL_KEY);
  },

  async setRememberedEmail(email: string): Promise<void> {
    await SecureStore.setItemAsync(REMEMBERED_EMAIL_KEY, email);
  },

  async removeRememberedEmail(): Promise<void> {
    await SecureStore.deleteItemAsync(REMEMBERED_EMAIL_KEY);
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
